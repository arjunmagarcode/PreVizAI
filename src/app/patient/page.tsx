"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCedarStore, useVoice } from "cedar-os";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, Send, CheckCircle } from "lucide-react";
import { VoicePermissionHelper } from "@/components/VoicePermissionHelper";

export default function PatientIntake() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = searchParams.get("pid") ?? "1";
  const patientName = searchParams.get("name") ?? "Patient";

  const voiceStore: any = useCedarStore((s: any) => s.voice);
  const voice = useVoice();

  useEffect(() => {
    const sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2);
    voiceStore?.setVoiceEndpoint?.(`/api/voice?sid=${sid}`);
    return () => voiceStore?.resetVoiceState?.();
  }, [voiceStore]);

  const rawMessages = useCedarStore((s: any) => s?.messages?.items ?? s?.messages ?? []);
  const messages: any[] = useMemo(() => (Array.isArray(rawMessages) ? rawMessages : []), [rawMessages]);

  function buildTranscriptString(msgs: any[]) {
    return msgs
      .map(m => {
        const who = m.role === "assistant" ? "AI" : "Patient";
        const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        return `${who}: ${text}`;
      })
      .join("\n");
  }

  const canComplete = messages.length > 0;

  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      else await voice.stopListening();
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
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Backend error ${res.status}: ${msg}`);
    }
    return res.json();
  }

  const handleCompleteIntake = async () => {
    if (messages.length === 0) return;
    setIsSubmitting(true);
    try {
      const transcript = buildTranscriptString(messages);
      const data = await sendTranscriptToFlask(transcript);
      console.log("Report from Flask:", data);
      setIsCompleted(true);
    } catch (e: any) {
      alert(e?.message || "Failed to send transcript");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
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

          {/* Main Voice Interface */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-12 text-center min-h-[calc(100vh-90px)] flex flex-col justify-start">
            <div className="flex flex-col justify-center items-center flex-1 mt-">
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
                  {messages.map((m, idx) => (
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
              <div className="flex items-center justify-center gap-4 mt-40">
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

              <p className="text-sm text-gray-500 mt-6">{messages.length} messages exchanged</p>
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
