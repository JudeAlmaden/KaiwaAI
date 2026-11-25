/**
 * Kanji for the Fill the blank sentence frames.
 *
 * The frames and scenes are authored in kana on purpose: one frame has to fit
 * every tense, and a guessed reading would be worse than kana. Display text is
 * upgraded for the everyday words whose kanji form is unambiguous, so a prompt
 * reads like real Japanese (きのう → 昨日) without touching answers, hints,
 * accepted spellings or audio.
 *
 * The frames build sentences as space-separated chunks ("わたしは きのう みずを"),
 * so each chunk is split into a stem and its trailing particle before lookup —
 * a kana particle is never rewritten into a kanji.
 */

const WORDS: Record<string, string> = {
  わたし: "私",
  きのう: "昨日",
  きょう: "今日",
  あした: "明日",
  まいにち: "毎日",
  みず: "水",
  ほん: "本",
  がっこう: "学校",
  てがみ: "手紙",
  ごはん: "ご飯",
  おんがく: "音楽",
  にほんご: "日本語",
  でんしゃ: "電車",
  えんぴつ: "鉛筆",
  まど: "窓",
  えいご: "英語",
  しゃしん: "写真",
  うた: "歌",
  でんき: "電気",
  たんご: "単語",
  かぎ: "鍵",
  べんきょう: "勉強",
  ともだち: "友達",
  へや: "部屋",
  いす: "椅子",
  いえ: "家",
  えき: "駅",
  かいしゃ: "会社",
  こうえん: "公園",
  とうきょう: "東京",
  りょうり: "料理",
  おちゃ: "お茶",
  くるま: "車",
  えいが: "映画",
  もんだい: "問題",
  ひと: "人",
  かぜ: "風",
  みせ: "店",
  まち: "町",
  なまえ: "名前",
  くだもの: "果物",
  て: "手",
  え: "絵",
};

const TRAILING_PARTICLES = new Set(["は", "が", "を", "に", "で", "と", "へ", "の", "も"]);


export type KanjiPart = { text: string; ruby?: string };

function chunkParts(chunk: string): KanjiPart[] {
  const whole = WORDS[chunk];
  if (whole) return [{ text: whole, ruby: chunk }];

  const particle = chunk.slice(-1);
  if (!TRAILING_PARTICLES.has(particle)) return [{ text: chunk }];

  const stem = chunk.slice(0, -1);
  const kanji = WORDS[stem];
  if (!kanji) return [{ text: chunk }];
  // Kanji and particle are separate parts so the ruby sits over the kanji only.
  return [{ text: kanji, ruby: stem }, { text: particle }];
}

/** Display parts with readings, ready for ruby annotation. */
export function toKanjiParts(text: string): KanjiPart[] {
  if (!text) return [];
  const parts: KanjiPart[] = [];
  text.split(" ").forEach((chunk, index) => {
    if (index > 0) parts.push({ text: " " });
    parts.push(...chunkParts(chunk));
  });
  return parts;
}

/** Kanji display form of a frame chunk string; anything unknown stays as-is. */
export function toKanji(text: string): string {
  return toKanjiParts(text).map((part) => part.text).join("");
}

/** Word → kana reading for every word this module converted. */
export function readingsFrom(parts: KanjiPart[]): Record<string, string> {
  const readings: Record<string, string> = {};
  for (const part of parts) {
    if (part.ruby) readings[part.text] = part.ruby;
  }
  return readings;
}
