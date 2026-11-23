/**
 * Normalize typed kanji input and return it only when it is exactly one
 * character, so a paste like "六六" is rejected instead of saved.
 */
export function normalizeKanjiCharacter(input: string): string | null {
  const normalized = input.trim().normalize("NFKC");
  return [...normalized].length === 1 ? normalized : null;
}
