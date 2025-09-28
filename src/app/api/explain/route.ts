// src/app/api/explain/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const insight: string = body?.insight || "";
    const emrHits: Array<{ path: string; value: string }> = body?.emrHits || [];

    if (!insight) {
      return new Response(JSON.stringify({ error: "Missing 'insight' text" }), { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Build a compact grounding context from EMR hits
    const refs = emrHits
      .slice(0, 6)
      .map((h, i) => `(${i + 1}) ${h.path}: ${h.value}`)
      .join("\n");

    const system = `
You are a clinical copilot designed to explain to Health Care Professionals the WHY and HOW behind AI generated insights based on EMR. Explain briefly (2–3 sentences) *why this EMR-driven insight is reasonable*,
grounding the rationale in the provided EMR references. Avoid speculation and avoid repeating the insight verbatim.
Professional, concise tone. Output a single paragraph without bullets.
`.trim();

    const user = `
INSIGHT:
${insight}

EMR REFERENCES:
${refs || "(none provided)"}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 180,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Based on the referenced EMR details, this insight aligns with the patient’s documented history and current findings.";

    return Response.json({
      answer,
      usedHits: emrHits.slice(0, 6),
    });
  } catch (e: any) {
    console.error("Explain API error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Explain failed" }), { status: 500 });
  }
}
