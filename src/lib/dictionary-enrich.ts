/** Pure merge of local dictionary hits onto validated tokens. */

export type EnrichableToken = {
  surface: string;
  dictForm: string;
  reading: string;
  meaning: string;
  pos: string;
};

export type EnrichmentHit = {
  found: boolean;
  surface: string;
  dictForm: string;
  reading: string;
  meaning: string;
  pos: string;
};

/** Prefer local DB fields when found; keep model surface; fill gaps only. */
export function applyEnrichments<T extends EnrichableToken>(
  tokens: T[],
  enrichments: EnrichmentHit[]
): T[] {
  return tokens.map((token, i) => {
    const hit = enrichments[i];
    if (!hit?.found) return token;
    return {
      ...token,
      dictForm: hit.dictForm || token.dictForm,
      reading: hit.reading || token.reading,
      meaning: hit.meaning || token.meaning,
      pos: (hit.pos || token.pos) as T["pos"],
    };
  });
}

/** Lookup key: prefer dictForm (lemma) so conjugated surfaces still mint-match. */
export function enrichmentKey(token: {
  surface?: string;
  dictForm?: string;
}): string {
  return (token.dictForm || token.surface || "").trim();
}

/** Safely extracts and cleans the first meaning from a JSON-encoded meanings string */
export function extractGloss(raw?: string): string {
  if (!raw) return "";
  let first = "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      first = parsed[0].trim();
    } else if (typeof parsed === "string") {
      first = parsed.trim();
    }
  } catch {
    if (!raw.startsWith("[")) {
      first = raw.trim();
    }
  }

  if (!first || first === "[" || first === "]") return "";

  // If the definition contains example sentences (common in JMdict where Japanese text is mixed in),
  // extract only the English gloss portions before any Japanese sentence.
  const parts = first.split(";").map((p) => p.trim()).filter(Boolean);
  const englishParts: string[] = [];
  for (const part of parts) {
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(part)) {
      break; // Stop at the first Japanese example sentence
    }
    englishParts.push(part);
  }
  return englishParts.length > 0 ? englishParts.join("; ") : first;
}

export function cleanTokenMeaning(m?: string): string {
  if (!m) return "";
  const trimmed = m.trim();
  if (trimmed === "[" || trimmed === "]" || trimmed === "[]") return "";
  if (/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/.test(trimmed)) return "";
  return trimmed;
}
