"use client";

import React from "react";
import { CedarCopilot } from "cedar-os";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CedarCopilot
      llmProvider={{
        provider: "openai",
        apiKey: (process.env.NEXT_PUBLIC_OPENAI_API_KEY as string),
      }}
      voiceSettings={{
        language: "en-US",
        voiceId: "alloy",
        useBrowserTTS: false,
        autoAddToMessages: true,
        pitch: 1.0,
        rate: 1.0,
        volume: 1.0,
        endpoint: "/api/voice"
      }}
    >
      {children}
    </CedarCopilot>
  );
}
