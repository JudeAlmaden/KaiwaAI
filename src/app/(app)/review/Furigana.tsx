/**
 * Furigana component - displays Japanese text with reading annotations above kanji
 * 
 * Usage:
 *   <Furigana word="食べる" reading="たべる" />
 * 
 * This will display the reading (hiragana) above the kanji characters.
 */

type FuriganaProps = {
  word: string;
  reading: string;
  className?: string;
  size?: "small" | "normal"; // small for flashcards, normal for chat popups
};

export default function Furigana({ word, reading, className = "", size = "small" }: FuriganaProps) {
  // If word and reading are the same (all hiragana), no furigana needed
  if (word === reading) {
    return <span className={`font-jp ${className}`}>{word}</span>;
  }

  // Simple algorithm: split word into kanji and kana segments
  // For each kanji, try to extract the corresponding reading
  const segments: { text: string; ruby?: string }[] = [];
  
  let wordIdx = 0;
  let readingIdx = 0;
  
  while (wordIdx < word.length) {
    const char = word[wordIdx];
    
    // Check if character is kanji (Unicode range)
    const isKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(char);
    
    if (isKanji) {
      // Find the next non-kanji character in word
      let kanjiEnd = wordIdx + 1;
      while (kanjiEnd < word.length && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(word[kanjiEnd])) {
        kanjiEnd++;
      }
      
      const kanjiSegment = word.slice(wordIdx, kanjiEnd);
      
      // Find corresponding reading
      // Look ahead to the next kana in word to find where reading ends
      let nextKana = "";
      if (kanjiEnd < word.length) {
        nextKana = word[kanjiEnd];
      }
      
      // Find where this kana appears in the reading
      let readingEnd = readingIdx;
      if (nextKana) {
        const kanaPos = reading.indexOf(nextKana, readingIdx);
        if (kanaPos !== -1) {
          readingEnd = kanaPos;
        } else {
          // If we can't find it, take the rest of the reading
          readingEnd = reading.length;
        }
      } else {
        // Last kanji, take remaining reading
        readingEnd = reading.length;
      }
      
      const rubyText = reading.slice(readingIdx, readingEnd);
      segments.push({ text: kanjiSegment, ruby: rubyText });
      
      wordIdx = kanjiEnd;
      readingIdx = readingEnd;
    } else {
      // Kana character - no furigana needed
      segments.push({ text: char });
      wordIdx++;
      readingIdx++;
    }
  }

  const rubySize = size === "small" ? "0.35em" : "0.5em";
  
  return (
    <span className={`font-jp ${className}`}>
      {segments.map((seg, i) => (
        seg.ruby ? (
          <ruby key={i} className="ruby-text">
            {seg.text}
            <rt style={{ fontSize: rubySize }}>{seg.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      ))}
      <style jsx>{`
        .ruby-text rt {
          line-height: 1;
        }
      `}</style>
    </span>
  );
}
