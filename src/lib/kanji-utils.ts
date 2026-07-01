/**
 * Extract unique kanji characters from a string
 * Kanji are in the Unicode range U+4E00–U+9FFF
 * @param text - Text containing Japanese characters
 * @returns Array of unique kanji characters
 */
export function extractKanji(text: string): string[] {
  const kanjiRegex = /[\u4E00-\u9FFF]/g;
  const matches = text.match(kanjiRegex);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Check if a string contains any kanji characters
 * @param text - Text to check
 * @returns True if text contains kanji
 */
export function hasKanji(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}
