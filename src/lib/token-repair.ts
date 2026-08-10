import type { CachedToken } from "./types";

const LONE_KANJI = /^[\u4e00-\u9fff]{1,2}$/;
const STARTS_HIRAGANA = /^[\u3040-\u309f]/;
const STANDALONE_PARTICLES = new Set([
  "は", "が", "を", "に", "も", "で", "へ", "と", "か", "や", "よ", "ね", "の",
  "から", "まで", "より", "には", "では", "にも", "でも",
]);

/**
 * Repairs a model mistake such as 小 + さい where one of the fragments still
 * has 小さい as its dictionary form. This is deliberately conservative: it
 * only joins fragments when their combined visible text exactly matches a
 * nearby token's dictionary form, so 猫 + は remains two separate tokens.
 */
export function repairSplitTokenSurfaces(tokens: CachedToken[]): CachedToken[] {
  const repaired = [...tokens];

  for (let i = 0; i < repaired.length - 1; i++) {
    const first = repaired[i];
    const second = repaired[i + 1];
    if (
      !first ||
      !second ||
      !LONE_KANJI.test(first.surface) ||
      !STARTS_HIRAGANA.test(second.surface) ||
      STANDALONE_PARTICLES.has(second.surface)
    ) {
      continue;
    }

    let combined = first.surface;
    let source: CachedToken | undefined;
    let end = i;

    // A few models split a word into more than two pieces, so check a short
    // adjacent run while requiring an exact dictionary-form match.
    for (let j = i + 1; j < Math.min(repaired.length, i + 4); j++) {
      const fragment = repaired[j];
      if (!fragment || !STARTS_HIRAGANA.test(fragment.surface)) break;
      combined += fragment.surface;
      const span = repaired.slice(i, j + 1);
      source = span.find((token) => token.pos !== "phrase" && token.dictForm === combined);
      if (source) {
        end = j;
        break;
      }
    }

    if (!source) continue;

    repaired.splice(i, end - i + 1, { ...source, surface: combined });
  }

  return repaired;
}
