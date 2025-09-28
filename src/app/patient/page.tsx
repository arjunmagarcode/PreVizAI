"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCedarStore, useVoice } from "cedar-os";
import { useRouter, useSearchParams } from "next/navigation";
import { VoiceIndicator } from "@/cedar/components/voice/VoiceIndicator";
import { Mic, MicOff, Send, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VoicePermissionHelper } from "@/components/VoicePermissionHelper";

export default function PatientIntake() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Optional: get patient id/name from query, e.g. /patient?pid=2&name=Michael%20Chen
  const patientId = searchParams.get("pid") ?? "1";
  const patientName = searchParams.get("name") ?? "Patient";

  const voiceStore: any = useCedarStore((s: any) => s.voice);
  const voice = useVoice();

  // Set the voice endpoint ONCE per page-load with a fresh session id (sid).
  useEffect(() => {
    const sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2);
    voiceStore?.setVoiceEndpoint?.(`/api/voice?sid=${sid}`);
    return () => voiceStore?.resetVoiceState?.();
  }, [voiceStore]);

  // Cedar messages (can be s.messages.items or s.messages)
  const rawMessages = useCedarStore((s: any) => s?.messages?.items ?? s?.messages ?? []);
  const messages: any[] = useMemo(() => (Array.isArray(rawMessages) ? rawMessages : []), [rawMessages]);

  // const conversation = (Array.isArray(rawMessages) ? rawMessages : []).map((m: any) => ({
  //   role: m.role === "assistant" ? "assistant" : "user",
  //   content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  // }));

  // Turn [{role, content}] into a single string the Flask endpoint expects
  function buildTranscriptString(msgs: any[]) {
    return msgs
      .map(m => {
        const who = m.role === "assistant" ? "AI" : "Patient";
        const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        return `${who}: ${text}`;
      })
      .join("\n");
  }


  // ✅ Button becomes clickable as soon as ANY message exists
  const canComplete = messages.length > 0;

  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // After showing the success screen, redirect to the doctor dashboard
  useEffect(() => {
    if (!isCompleted) return;
    const timer = setTimeout(() => {
      router.push(`/doctor?intake=completed&patientId=${encodeURIComponent(patientId)}`);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isCompleted, router, patientId]);

  const handleRequestPermission = async () => {
    try {
      await voice.checkVoiceSupport?.();
      await voice.requestVoicePermission();
    } catch {
      alert("Unable to request microphone permission. Check browser settings and try again.");
    }
  };

  const handleVoiceToggle = async () => {
    try {
      await voice.checkVoiceSupport?.();
      if (voice.voicePermissionStatus === "prompt") await voice.requestVoicePermission();
      if (voice.voicePermissionStatus === "denied") {
        alert("Please enable microphone permissions in your browser settings.");
        return;
      }
      if (!voice.isListening) await voice.startListening();
      else await voice.stopListening(); // triggers POST to /api/voice
    } catch {
      alert("Microphone error. Please check your browser settings and try again.");
      try { voice.resetVoiceState?.(); } catch { }
    }
  };

  async function sendTranscriptToFlask(transcript: string) {
    const url = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000") + "/generate_report";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Flask expects: { "transcript": "<string>" }
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Backend error ${res.status}: ${msg}`);
    }
    return res.json(); // { message, insights_report, next_steps, graph }
  }

  // In your Complete Intake handler:
  const handleCompleteIntake = async () => {
    if (messages.length === 0) return;   // keep your “first turn disabled” rule
    setIsSubmitting(true);
    try {
      const transcript = buildTranscriptString(messages);
      const data = await sendTranscriptToFlask(transcript);

      // For now, just see it working:
      console.log("Report from Flask:", data);

      // Optional: stash it for the doctor page to read
      // localStorage.setItem("latestReport", JSON.stringify(data));
      // router.push(`/doctor?intake=completed&patientId=${encodeURIComponent(patientId)}`);

      setIsCompleted(true);
    } catch (e: any) {
      alert(e?.message || "Failed to send transcript");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isCompleted) {
    // Quick success page while redirecting (kept for UX polish; router.push happens above)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Intake Complete!</h1>
          <p className="text-gray-600">Redirecting to the doctor dashboard…</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen previz-bg">
    <div className="max-w-6xl mx-auto p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Instructions Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600">
            <li>Click the microphone button to start</li>
            <li>Speak your main health concern</li>
            <li>Answer the AI&apos;s follow-up questions</li>
            <li>Complete when ready</li>
          </ol>

          <VoicePermissionHelper
            permissionStatus={voice?.voicePermissionStatus || "prompt"}
            onRequestPermission={handleRequestPermission}
          />
          {voice?.voiceError && (
            <p className="text-xs text-red-600 p-2 bg-red-50 rounded mt-4">
              Mic error: {String(voice.voiceError)}
            </p>
          )}
        </div>

        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Microphone Access Alert */}
          {voice?.voicePermissionStatus !== "granted" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-yellow-800 text-xs font-bold">!</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-800 mb-1">Microphone Access Required</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    This application needs access to your microphone to record your voice for the intake conversation.
                  </p>
                  <button
                    onClick={handleRequestPermission}
                    className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Enable Microphone
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Voice Interface */}
          <div className="bg-white rounded-xl shadow-lg p-12 text-center min-h-[calc(100vh-90px)] flex flex-col justify-between">
            {messages.length === 0 ? (
              <>
                <div className="flex justify-center mb-8">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                      voice?.isListening ? "bg-red-500 animate-pulse" : "bg-gray-200"
                    }`}
                  >
                    <Mic className={`w-12 h-12 ${voice?.isListening ? "text-white" : "text-gray-400"}`} />
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {voice?.isListening ? "Listening..." : "Ready to start your intake"}
                </h2>

                <p className="text-gray-600 mb-12">
                  {voice?.isListening
                    ? "Speak clearly about your health concerns"
                    : "Click the microphone to begin your conversation."}
                </p>
              </>
            ) : (
              <div className="space-y-4 mb-8 max-h-[calc(100vh-400px)] overflow-y-auto">

                {messages.map((m: any, idx: number) => (
                  <div key={idx} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        m.role === "assistant"
                          ? "bg-blue-100 text-blue-900 rounded-bl-none"
                          : "bg-green-100 text-green-900 rounded-br-none"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {m.role === "assistant" ? "AI Assistant" : "You"}
                      </div>
                      <p className="text-sm leading-relaxed">
                        {typeof m.content === "string" ? m.content : JSON.stringify(m.content)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleVoiceToggle}
                disabled={!voice || voice.voicePermissionStatus === "denied"}
                className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all ${
                  voice?.isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                }`}
              >
                <Mic className="w-4 h-4 mr-2" />
                {voice?.isListening ? "Stop Recording" : "Click to speak"}
              </button>
              
              <button
                onClick={handleCompleteIntake}
                disabled={!canComplete || isSubmitting}
                className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all ${
                  canComplete && !isSubmitting
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                
                {isSubmitting ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? "Submitting..." : "Complete Intake"}
              </button>
              
            </div>

            <p className="text-sm text-gray-500 mt-4">{messages.length} messages exchanged</p>
            {!canComplete ? (
              <p className="text-xs text-gray-400 mt-2">Start the conversation to enable completion.</p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">You can submit whenever you’re ready.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}