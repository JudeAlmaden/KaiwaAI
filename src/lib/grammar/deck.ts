/**
 * Deck vocabulary, reduced to what the sentence generator can use.
 *
 * Cards come from `/api/flashcards/review`, which already returns the part of
 * speech, verb/adjective type and stored forms. Anything that is not a single
 * noun, verb or adjective (phrases, expressions, adverbs, particles) is dropped:
 * the templates only place words whose role they can guarantee.
 */

export type DeckKind = "noun" | "verb" | "i-adj" | "na-adj";

export type DeckForm = { form: string; reading?: string | null; formType: string };

export type DeckWord = {
  /** Surface to practise: the dictionary form when the card has one. */
  word: string;
  /** Kana reading; equals `word` for kana-only entries. */
  reading: string;
  /** First English gloss, cleaned for sentence use ("to write" → "write"). */
  gloss: string;
  kind: DeckKind;
  verbType: string | null;
  question: boolean;
  forms: DeckForm[];
};

type CardLike = {
  word?: string | null;
  dictionary?: string | null;
  reading?: string | null;
  meaning?: string | null;
  partOfSpeech?: string | null;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: Array<{ form: string; reading?: string | null; formType?: string | null }> | null;
};

const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/;
/** Long words are usually expressions the templates can't place safely. */
const MAX_WORD_LENGTH = 6;

/** "to write; writing" → "write"; "a cat" → "cat"; "expensive (for…)" → "expensive". */
export function cleanGloss(meaning?: string | null): string {
  if (!meaning) return "";
  const first = meaning.split(/[;,、]/)[0] ?? "";
  return first
    .replace(/\([^)]*\)/g, "")
    .replace(/^(to|a|an|the)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function kindOf(card: CardLike, surface: string): DeckKind | null {
  switch (card.partOfSpeech) {
    case "noun":
      return "noun";
    case "verb":
      return "verb";
    case "adjective":
      if (card.adjectiveType === "na_adjective") return "na-adj";
      if (card.adjectiveType === "i_adjective") return "i-adj";
      return surface.endsWith("い") ? "i-adj" : "na-adj";
    default:
      return null;
  }
}

export function toDeckWord(card: CardLike): DeckWord | null {
  const surface = (card.dictionary || card.word || "").trim();
  if (!surface || surface.length > MAX_WORD_LENGTH) return null;
  if (!JAPANESE.test(surface)) return null;
  if (surface.endsWith("。") || surface.includes(" ")) return null;

  const kind = kindOf(card, surface);
  const gloss = cleanGloss(card.meaning);
  if (!kind || !gloss) return null;

  const forms: DeckForm[] = [];
  for (const form of card.forms ?? []) {
    if (!form.form || !form.formType) continue;
    forms.push({ form: form.form, reading: form.reading, formType: form.formType });
  }

  return {
    word: surface,
    reading: (card.reading ?? "").trim() || surface,
    gloss,
    kind,
    verbType: card.verbType ?? null,
    question: surface.endsWith("か"),
    forms,
  };
}

/** Deduped by surface form, so a word saved twice does not double its drills. */
export function deckWordsFrom(cards: CardLike[]): DeckWord[] {
  const byWord = new Map<string, DeckWord>();
  for (const card of cards) {
    const word = toDeckWord(card);
    if (!word || byWord.has(word.word)) continue;
    byWord.set(word.word, word);
  }
  return Array.from(byWord.values());
}
