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

  // Michael is the demo patient who completes intake
  const patientId = searchParams.get("pid") ?? "2";
  const patientName = searchParams.get("name") ?? "Michael Chen";

  const voiceStore: any = useCedarStore((s: any) => s.voice);
  const voice = useVoice();

  // --- NEW: persist the latest reportId in state so it survives re-renders
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  // Set the voice endpoint ONCE per page-load with a fresh session id (sid).
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

  // Convert messages to a single transcript string
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

  // Redirect AFTER we have both: completed=true and a reportId in state
  useEffect(() => {
    if (!isCompleted || !lastReportId) return;
    const timer = setTimeout(() => {
      router.push(
        `/doctor?intake=completed&patientId=${encodeURIComponent(patientId)}&reportId=${encodeURIComponent(
          lastReportId
        )}`
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [isCompleted, lastReportId, router, patientId]);

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

      // Generate a reportId and SAVE it in state (critical!)
      const reportId: string =
        typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto
          ? (window.crypto as any).randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setLastReportId(reportId);

      // Store entire payload for Doctor’s modal (Summary + EMR + Graph + Transcript)
      const stored = {
        reportId,
        patientId,
        patientName,
        createdAt: new Date().toISOString(),
        transcript,
        insights_report: data.insights_report || {},
        next_steps: data.next_steps || [],
        emr_tab: data.emr_tab || null,
        annotated_graph: data.graph ?? null
      };
      localStorage.setItem(`report:${reportId}`, JSON.stringify(stored));

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Patient Intake</h1>
          </div>

          <div className="flex items-center gap-3">
            {voice && <VoiceIndicator voiceState={voice} />}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Voice Status:</span>
              {voice?.voicePermissionStatus === "granted" && <span className="text-green-600 font-medium">Ready</span>}
              {voice?.voicePermissionStatus === "denied" && <span className="text-red-600 font-medium">Denied</span>}
              {voice?.voicePermissionStatus === "prompt" && <span className="text-yellow-600 font-medium">Prompt</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-3 gap-6 h-[calc(100vh-80px)]">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>Click the microphone button to start</li>
              <li>Speak your main health concern</li>
              <li>Answer the AI’s follow-up questions</li>
              <li>Click Complete any time you’re ready</li>
            </ol>
            <VoicePermissionHelper
              permissionStatus={voice?.voicePermissionStatus || "prompt"}
              onRequestPermission={handleRequestPermission}
            />
            {voice?.voiceError && (
              <p className="text-xs text-red-600 p-2 bg-red-50 rounded">Mic error: {String(voice.voiceError)}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl shadow-lg flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-12">
                <Mic className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Ready to start your intake</p>
                <p className="text-sm">Click the microphone to begin your conversation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m: any, idx: number) => (
                  <div key={idx} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${m.role === "assistant"
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
          </div>

          <div className="p-6 border-t bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleVoiceToggle}
                  disabled={!voice || voice.voicePermissionStatus === "denied"}
                  className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${voice?.isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                    }`}
                >
                  {voice?.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>

                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {voice?.isListening ? "Listening..." : voice?.isSpeaking ? "AI Speaking..." : "Click to speak"}
                  </span>
                </div>

                {voice?.isListening && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                    <span className="text-xs text-red-600">Recording</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleCompleteIntake}
                disabled={!canComplete || isSubmitting}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${canComplete && !isSubmitting
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

            {!canComplete && (
              <p className="text-xs text-gray-500 mt-2">Start the conversation to enable completion.</p>
            )}
            {canComplete && (
              <p className="text-xs text-green-600 mt-2">You can submit whenever you’re ready.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
