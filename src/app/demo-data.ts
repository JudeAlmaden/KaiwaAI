// The scripted conversation that plays on the landing page.
// Each Kai message is a list of tokens; "word" tokens are tappable and carry a
// reading, romaji, and meaning (this is the real tap-to-translate data).

export type Token = {
  t: string; // the surface text
  word?: {
    reading: string;
    romaji: string;
    en: string;
    pos: string; // part of speech
  };
};

export type DemoMessage = {
  from: "kai" | "you";
  tokens: Token[];
};

export const demoConversation: DemoMessage[] = [
  {
    from: "kai",
    tokens: [
      { t: "こんにちは", word: { reading: "こんにちは", romaji: "konnichiwa", en: "hello", pos: "greeting" } },
      { t: "！" },
      { t: "わたし", word: { reading: "わたし", romaji: "watashi", en: "I, me", pos: "pronoun" } },
      { t: "は" },
      { t: "カイ", word: { reading: "カイ", romaji: "Kai", en: "Kai (a name)", pos: "noun" } },
      { t: "。" },
    ],
  },
  {
    from: "kai",
    tokens: [
      { t: "いっしょに", word: { reading: "いっしょに", romaji: "issho ni", en: "together", pos: "adverb" } },
      { t: "にほんご", word: { reading: "にほんご", romaji: "nihongo", en: "Japanese (language)", pos: "noun" } },
      { t: "を" },
      { t: "はなしましょう", word: { reading: "はなしましょう", romaji: "hanashimashou", en: "let's talk", pos: "verb" } },
      { t: "！" },
    ],
  },
];

// The word the demo auto-highlights and "saves" to show tap-to-translate + SRS.
export const demoHighlight = { messageIndex: 1, tokenIndex: 1 };
