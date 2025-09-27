import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const settingsJson = form.get("settings") as string | null;
    if (!audio) return new Response(JSON.stringify({ error: "No audio" }), { status: 400 });

    const settings = settingsJson ? JSON.parse(settingsJson) : {};
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Transcribe (Whisper)
    const audioBuf = Buffer.from(await audio.arrayBuffer());
    const file = new File([audioBuf], "audio.webm", { type: audio.type || "audio/webm" });
    const tr = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: (settings.language || "en-US").split("-")[0],
    });
    const userText = (tr?.text || "").trim();

    // LLM reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: "You are a medical intake assistant. Ask 1–2 short follow-up questions." },
        { role: "user", content: userText || "No speech captured." },
      ],
    });
    const assistantText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I didn’t catch that. Could you try again?";

    // TTS
    const tts = await openai.audio.speech.create({
      model: "tts-1",
      voice: settings.voiceId || "alloy",
      input: assistantText,
      speed: settings.rate ?? 1.0,
    });
    const base64Audio = Buffer.from(await tts.arrayBuffer()).toString("base64");

    return Response.json({
      transcription: userText,
      text: assistantText,
      audioData: base64Audio,
      audioFormat: "audio/mpeg",
    });
  } catch (e: any) {
    console.error("voice error:", e);
    return new Response(JSON.stringify({ error: e?.message || "voice failed" }), { status: 500 });
  }
}
