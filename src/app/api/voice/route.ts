// app/api/voice/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { systemPrompt } from "@/utils/prompts/conversationPrompt";

export const runtime = "nodejs";

// In-memory chat history per session id (sid)
type Msg = { role: "user" | "assistant"; content: string };
const historyMap: Map<string, Msg[]> =
  ((global as any).__VOICE_HISTORY_MAP__ ||= new Map<string, Msg[]>());

// Fallback key if sid missing (shouldn't happen given our client)
function sessionKeyFrom(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "ip:unknown";
  const ua = req.headers.get("user-agent") || "ua:unknown";
  return `${ip}::${ua}`;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sid = url.searchParams.get("sid") || sessionKeyFrom(req);

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const settingsJson = form.get("settings") as string | null;

    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio received" }), { status: 400 });
    }

    const settings = settingsJson ? JSON.parse(settingsJson) : {};
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Ensure history exists for this sid
    if (!historyMap.has(sid)) historyMap.set(sid, []);
    const hist = historyMap.get(sid)!;

    // 1) Transcribe (Whisper)
    const audioBuf = Buffer.from(await audio.arrayBuffer());
    const file = new File([audioBuf], "audio.webm", { type: audio.type || "audio/webm" });
    const shortLang = (settings.language || "en-US").split("-")[0];

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: shortLang,
    });

    const userText = (transcription?.text || "").trim();

    // Append user's message to server history first (so next requests see it)
    if (userText) {
      hist.push({ role: "user", content: userText });
    }

    // 2) Build LLM messages from server history (last N) + current userText already included
    const recent: Msg[] = hist.slice(-10); // small window for token safety


    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const assistantText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Could you share a bit more detail?";

    // Save assistant reply in server history
    hist.push({ role: "assistant", content: assistantText });

    // 3) TTS
    const tts = await openai.audio.speech.create({
      model: "tts-1",
      voice: settings.voiceId || "alloy",
      input: assistantText,
      speed: settings.rate ?? 1.0,
    });
    const base64Audio = Buffer.from(await tts.arrayBuffer()).toString("base64");

    // 4) Return JSON for Cedar (it will append both transcript + reply to the UI chat)
    return Response.json({
      transcription: userText,   // shows as the user's message
      text: assistantText,       // shows as the assistant's message
      audioData: base64Audio,    // mp3 (base64)
      audioFormat: "mp3",
    });
  } catch (e: any) {
    console.error("voice error:", e);
    return new Response(JSON.stringify({ error: e?.message || "voice failed" }), { status: 500 });
  }
}
