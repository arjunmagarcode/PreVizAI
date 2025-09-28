// Simple, Cedar-first EMR explanation helper (no React hooks here)

type EmrHit = { path: string; value: string };

/** Walk EMR and find fields that loosely match keywords from selectedText */
export function findEmrEvidence(emr: any, selectedText: string): EmrHit[] {
  if (!emr || !selectedText) return [];
  const kws = Array.from(
    new Set(
      selectedText
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5)
    )
  );
  const results: EmrHit[] = [];

  function walk(node: any, path: string[]) {
    if (node === null || node === undefined) return;

    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      const val = String(node);
      const lower = val.toLowerCase();
      if (kws.some((kw) => lower.includes(kw))) {
        results.push({ path: path.join("."), value: val });
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, [...path, `[${i}]`]));
      return;
    }

    if (typeof node === "object") {
      Object.entries(node).forEach(([k, v]) => walk(v, [...path, k]));
      return;
    }
  }

  walk(emr, ["emr"]);
  const uniq = new Map<string, EmrHit>();
  for (const r of results) uniq.set(`${r.path}::${r.value}`, r);
  return Array.from(uniq.values()).slice(0, 10);
}

function makeFallbackExplanation(selectedText: string, hits: EmrHit[]): string {
  if (!hits || hits.length === 0) {
    return `This insight appears consistent with the patient's EMR, but no specific single field stands out.\n\nInsight: "${selectedText}"`;
  }
  const listed = hits.slice(0, 4).map((h) => `• ${h.path}: ${h.value}`).join("\n");
  return `This insight is supported by the following EMR fields:\n${listed}\n\nInsight: "${selectedText}"`;
}

/**
 * Try Cedar LLM first. If not available or it errors, return a compact EMR-only explanation.
 * - cedarStore: value from useCedarStore() (pass in as a param from your component)
 */
export async function explainEmrInsight(
  cedarStore: any,
  selectedText: string,
  emrData: any
): Promise<{ answer: string; hits: EmrHit[] }> {
  const hits = findEmrEvidence(emrData, selectedText);

  // Prefer Cedar’s LLM if present
  const callLLM = cedarStore?.llm?.callLLM || cedarStore?.callLLM || null;
  if (callLLM) {
    try {
      const system =
        "You are an EMR explanation assistant. Using only the agent context (selectedText, emrData) and clinical reasoning, explain in 1–3 concise sentences which EMR facts support or contradict the selectedText. Be specific and reference fields by label.";
      const user = `Selected EMR insight: """${selectedText}"""`;

      // Try (system, prompt) signature first
      let resp: any = await callLLM({ system, prompt: user });
      if (!resp || (!resp.text && !resp.content && !resp.message)) {
        // Fallback to messages signature if needed
        resp = await callLLM({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });
      }

      const text =
        resp?.text ||
        resp?.content ||
        resp?.message ||
        (typeof resp === "string" ? resp : "");

      if (text && String(text).trim().length > 0) {
        return { answer: String(text).trim(), hits };
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Local EMR-only fallback
  return { answer: makeFallbackExplanation(selectedText, hits), hits };
}
