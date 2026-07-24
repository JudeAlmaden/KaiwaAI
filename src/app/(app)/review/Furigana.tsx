/**
 * Furigana component - displays Japanese text with reading annotations above kanji.
 * Handles conjugated verbs, adjectives, compound kanji, and okurigana correctly.
 * 
 * Usage:
 *   <Furigana word="食べた" reading="たべた" />
 *   <Furigana word="聞きます" reading="ききます" />
 */

export type FuriganaSegment = {
  text: string;
  ruby?: string;
};

export function alignFurigana(word: string, reading: string): FuriganaSegment[] {
  if (!word) return [];
  if (!reading || word === reading) return [{ text: word }];

  // Check if word contains any Kanji
  const hasKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(word);
  if (!hasKanji) return [{ text: word }];

  // Convert Katakana to Hiragana for matching
  const toHiragana = (str: string) =>
    str.replace(/[\u30a1-\u30f6]/g, (m) =>
      String.fromCharCode(m.charCodeAt(0) - 0x60)
    );

  const normReading = toHiragana(reading);
  const normWord = toHiragana(word);

  if (normWord === normReading) return [{ text: word }];

  // 1. Strip matching trailing Kana (Okurigana)
  let wordEnd = word.length;
  let readingEnd = normReading.length;

  while (
    wordEnd > 0 &&
    readingEnd > 0 &&
    !/[\u4e00-\u9faf\u3400-\u4dbf]/.test(word[wordEnd - 1]) &&
    toHiragana(word[wordEnd - 1]) === normReading[readingEnd - 1]
  ) {
    wordEnd--;
    readingEnd--;
  }

  const trailingKana = word.slice(wordEnd);
  const prefixWord = word.slice(0, wordEnd);
  let prefixReading = normReading.slice(0, readingEnd);

  // If reading was dictionary form (e.g. word="聞きます", reading="きく")
  if (!prefixReading && normReading) {
    prefixReading = normReading;
  }

  // 2. Align the prefix (Kanji and any preceding or intermediate Kana)
  const segments: FuriganaSegment[] = [];
  let wIdx = 0;
  let rIdx = 0;

  while (wIdx < prefixWord.length) {
    const char = prefixWord[wIdx];
    const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(char);

    if (isKanji) {
      // Group consecutive Kanji characters
      let kEnd = wIdx + 1;
      while (kEnd < prefixWord.length && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(prefixWord[kEnd])) {
        kEnd++;
      }
      const kanjiGroup = prefixWord.slice(wIdx, kEnd);

      // Look ahead for next Kana character in prefixWord
      let rubyEnd = prefixReading.length;
      if (kEnd < prefixWord.length) {
        const nextKana = toHiragana(prefixWord[kEnd]);
        const foundPos = prefixReading.indexOf(nextKana, rIdx + 1);
        if (foundPos !== -1) {
          rubyEnd = foundPos;
        }
      }

      const rubyText = prefixReading.slice(rIdx, Math.max(rIdx + 1, rubyEnd));
      segments.push({ text: kanjiGroup, ruby: rubyText || reading });
      wIdx = kEnd;
      rIdx = Math.max(rIdx + 1, rubyEnd);
    } else {
      // Kana character in prefix
      const kanaChar = prefixWord[wIdx];
      const hKana = toHiragana(kanaChar);

      if (rIdx < prefixReading.length && prefixReading[rIdx] === hKana) {
        rIdx++;
      }
      segments.push({ text: kanaChar });
      wIdx++;
    }
  }

  // Append any remaining unused reading to the last Kanji segment
  if (rIdx < prefixReading.length && segments.length > 0) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].ruby) {
        segments[i].ruby += prefixReading.slice(rIdx);
        break;
      }
    }
  }

  // 3. Append trailing Okurigana
  if (trailingKana) {
    segments.push({ text: trailingKana });
  }

  return segments;
}

type FuriganaProps = {
  word: string;
  reading: string;
  className?: string;
  size?: "small" | "normal";
};

export default function Furigana({ word, reading, className = "", size = "small" }: FuriganaProps) {
  const segments = alignFurigana(word, reading);
  const rubySize = size === "small" ? "0.35em" : "0.5em";

  return (
    <span className={`font-jp ${className}`}>
      {segments.map((seg, i) =>
        seg.ruby ? (
          <ruby key={i} className="ruby-text">
            {seg.text}
            <rt style={{ fontSize: rubySize }}>{seg.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
      <style jsx>{`
        .ruby-text rt {
          line-height: 1;
        }
      `}</style>
    </span>
  );
}
