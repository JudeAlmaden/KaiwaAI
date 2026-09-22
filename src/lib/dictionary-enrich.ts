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
