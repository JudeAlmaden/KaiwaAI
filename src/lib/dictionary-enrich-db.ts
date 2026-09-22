import { prisma } from "@/lib/prisma";
import {
  enrichmentKey,
  type EnrichmentHit,
} from "@/lib/dictionary-enrich";

/** Server-only: batch-lookup tokens against Word + Phrase tables. */
export async function enrichTokensFromDb(
  userId: string,
  tokens: Array<{
    surface?: string;
    dictForm?: string;
    reading?: string;
    meaning?: string;
    pos?: string;
  }>
): Promise<EnrichmentHit[]> {
  const dictForms = [
    ...new Set(tokens.map((t) => enrichmentKey(t)).filter(Boolean)),
  ];
  if (dictForms.length === 0) {
    return tokens.map((t) => ({
      found: false as const,
      surface: t.surface ?? "",
      dictForm: enrichmentKey(t),
      reading: t.reading ?? "",
      meaning: t.meaning ?? "",
      pos: t.pos ?? "other",
    }));
  }

  const words = await prisma.word.findMany({
    where: { dictionary: { in: dictForms } },
    include: { forms: { take: 1 } },
  });
  const byDict = new Map(words.map((w) => [w.dictionary, w]));

  const phrases = await prisma.phrase.findMany({
    where: { userId, text: { in: dictForms } },
  });
  const byPhrase = new Map(phrases.map((p) => [p.text, p]));

  return tokens.map((t) => {
    const key = enrichmentKey(t);
    const w = byDict.get(key);
    if (w) {
      return {
        found: true as const,
        surface: t.surface ?? w.dictionary,
        dictForm: w.dictionary,
        reading: w.reading,
        meaning: w.meanings[0] ?? t.meaning ?? "",
        pos: w.partOfSpeech || t.pos || "other",
      };
    }
    const p = byPhrase.get(key);
    if (p) {
      return {
        found: true as const,
        surface: t.surface ?? p.text,
        dictForm: p.text,
        reading: p.reading,
        meaning: p.meanings[0] ?? t.meaning ?? "",
        pos: p.partOfSpeech || t.pos || "phrase",
      };
    }
    return {
      found: false as const,
      surface: t.surface ?? key,
      dictForm: key,
      reading: t.reading ?? key,
      meaning: t.meaning ?? key,
      pos: t.pos ?? "other",
    };
  });
}
