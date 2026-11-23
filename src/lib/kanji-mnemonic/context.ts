import type { ComponentContext, ComponentRow, UserComponentOverride } from "./types";

/** Parse a JSON string array without throwing on legacy or malformed rows. */
export function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function unknownComponent(glyph: string): ComponentContext {
  return {
    glyph,
    keyword: null,
    meanings: [],
    heisigNumber: null,
    inDictionary: false,
  };
}

/**
 * Resolve primitive glyphs to the meanings the learner already knows.
 * Authored order is preserved (it is the buildup order shown in the UI).
 */
export function buildComponentContexts(
  primitives: string[],
  rows: ComponentRow[],
  overrides: UserComponentOverride[]
): ComponentContext[] {
  const rowByGlyph = new Map(rows.map((row) => [row.character, row]));
  const overrideByGlyph = new Map(
    overrides.map((entry) => [entry.kanji.character, entry])
  );

  const seen = new Set<string>();
  const components: ComponentContext[] = [];

  for (const raw of primitives) {
    const glyph = raw.trim();
    if (!glyph || seen.has(glyph)) continue;
    seen.add(glyph);

    const row = rowByGlyph.get(glyph);
    if (!row) {
      components.push(unknownComponent(glyph));
      continue;
    }

    const override = overrideByGlyph.get(glyph);
    const meanings = safeJsonArray(row.meanings);
    const keyword =
      override?.customMeaning?.trim() ||
      row.heisigKeyword?.trim() ||
      meanings[0] ||
      null;

    components.push({
      glyph,
      keyword,
      meanings,
      heisigNumber: row.heisigNumber ?? null,
      inDictionary: true,
      ...(override?.mnemonic ? { userMnemonic: override.mnemonic } : {}),
    });
  }

  return components;
}

/** Rebuild the ordered component list for a card from a glyph → context map. */
export function mergeComponents(
  primitives: string[],
  map: Map<string, ComponentContext>
): ComponentContext[] {
  const seen = new Set<string>();
  const components: ComponentContext[] = [];

  for (const raw of primitives) {
    const glyph = raw.trim();
    if (!glyph || seen.has(glyph)) continue;
    seen.add(glyph);
    components.push(map.get(glyph) ?? unknownComponent(glyph));
  }

  return components;
}
