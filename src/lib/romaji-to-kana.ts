/**
 * Convert romaji to hiragana for search purposes
 * Simple converter that handles common romanization patterns
 */

const ROMAJI_TO_HIRAGANA: Record<string, string> = {
  // Vowels
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  // K
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
  // S
  'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
  // T
  'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
  'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
  // N
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
  'n': 'ん',
  // H
  'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
  // M
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
  // Y
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  // R
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
  // W
  'wa': 'わ', 'wo': 'を',
  // G
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
  // Z
  'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
  // D
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
  // B
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
  // P
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
};

export function romajiToHiragana(romaji: string): string {
  if (!romaji) return '';
  
  let result = '';
  let input = romaji.toLowerCase();
  let i = 0;
  
  while (i < input.length) {
    // Try 3-character match first (for "sha", "chi", etc.)
    if (i + 3 <= input.length) {
      const three = input.substring(i, i + 3);
      if (ROMAJI_TO_HIRAGANA[three]) {
        result += ROMAJI_TO_HIRAGANA[three];
        i += 3;
        continue;
      }
    }
    
    // Try 2-character match
    if (i + 2 <= input.length) {
      const two = input.substring(i, i + 2);
      if (ROMAJI_TO_HIRAGANA[two]) {
        result += ROMAJI_TO_HIRAGANA[two];
        i += 2;
        continue;
      }
    }
    
    // Try 1-character match
    const one = input[i];
    if (ROMAJI_TO_HIRAGANA[one]) {
      result += ROMAJI_TO_HIRAGANA[one];
      i += 1;
      continue;
    }
    
    // If no match, keep the character as-is (for spaces, punctuation, etc.)
    result += one;
    i += 1;
  }
  
  return result;
}
