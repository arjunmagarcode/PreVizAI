// src/lib/explainInsight.ts

export type EmrHit = { path: string; value: string };

export async function explainInsightWithLLM(
  insight: string,
  emrHits: EmrHit[]
): Promise<{ answer: string; usedHits: EmrHit[] }> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ insight, emrHits }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Explain API error ${res.status}: ${msg}`);
  }

  return res.json();
}
