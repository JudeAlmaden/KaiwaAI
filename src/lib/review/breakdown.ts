/** Anything that names a word or a kanji can get a Kai's Breakdown. */
export type BreakdownTarget = {
  word?: string | null;
  character?: string | null;
};

export function canBreakdown(card: BreakdownTarget): boolean {
  return Boolean(card.word?.trim() || card.character?.trim());
}
