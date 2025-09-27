"use client";

import { useMemo } from "react";
import {
  useCedarStore,
  useRegisterState,
  useSubscribeStateToAgentContext,
} from "cedar-os";

export default function VoiceContextBridge() {
  // read messages from the Cedar store
  const raw = useCedarStore((s: any) => s?.messages?.items ?? s?.messages ?? []);
  const messages: any[] = useMemo(() => (Array.isArray(raw) ? raw : []), [raw]);

  // 1) register a state with the current chat messages
  useRegisterState({
    key: "chatHistory",
    value: messages,
    description: "Current chat messages for this intake session",
  });

  // 2) subscribe that state into the agent input context
  useSubscribeStateToAgentContext(
    "chatHistory",
    (msgs: any[]) => ({
      chatHistory: msgs.slice(-10).map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
    }),
    {
      showInChat: false,
      order: 1,
    }
  );

  return null; // no UI
}
