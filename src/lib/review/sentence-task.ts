import { formsForTarget, type TargetForm } from "./conjugation";
import {
  distractorTypes,
  explainConjugation,
  patternAttrs,
  patternLabel,
  type Explanation,
} from "./conjugation-patterns";
import { stageFor, usesChoices, type PatternStats, type PracticeStage } from "./conjugation-mastery";
import { readingsFrom, toKanjiParts } from "./kanji-frames";
import { sceneFor, type SceneFrame } from "./sentence-frames";

export type StoredForm = {
  form: string;
  reading?: string | null;
  formType: string;
};

export type SentenceTarget = {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: StoredForm[];
};

type CardLike = {
  id: string;
  word?: string | null;
  reading?: string | null;
  meaning?: string | null;
  partOfSpeech?: string | null;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: StoredForm[];
};

/** Particles used in the hints. */
export const BASIC_PARTICLES = ["は", "が", "を", "に", "で"] as const;
/** Every particle the checks accept, including valid ones not in the hint row. */
export const COMMON_PARTICLES = [
  ...BASIC_PARTICLES,
  "へ",
  "も",
  "と",
  "や",
  "から",
  "まで",
  "の",
] as const;

/** First few usable words from the due queue, one per surface form. */
export function pickSentenceTargets(cards: CardLike[], count = 1): SentenceTarget[] {
  const targets: SentenceTarget[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const word = card.word?.trim();
    if (!word || word === "Unknown" || seen.has(word)) continue;
    seen.add(word);
    targets.push({
      id: card.id,
      word,
      reading: card.reading?.trim() ?? "",
      meaning: card.meaning?.trim() ?? "",
      partOfSpeech: card.partOfSpeech ?? "unknown",
      verbType: card.verbType ?? null,
      adjectiveType: card.adjectiveType ?? null,
      forms: card.forms ?? [],
    });
    if (targets.length === count) break;
  }

  return targets;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function textAppears(sentence: string, value: string): boolean {
  if (!value) return false;
  // Kanji can appear inside a longer compound (今週末), which still counts.
  if (/[\u4e00-\u9fff]/.test(value)) return sentence.includes(value);
  // A kana reading is only accepted at a word boundary so ご doesn't match りんご,
  // but a particle before it is still a boundary (わたしは + つかれました).
  return new RegExp(`(^|[^ぁ-んァ-ヶー]|[はがをにでへもとやの])${escapeRegExp(value)}`).test(
    sentence
  );
}

/**
 * Accept the target in any form the SRS knows, so 疲れる is still present in
 * 疲れた / 疲れました and a correct Evolve check does not say it is missing.
 */
export function containsTarget(sentence: string, target: SentenceTarget): boolean {
  const candidates = [target.word, target.reading];
  for (const form of formsForTarget(target)) candidates.push(form.form, form.reading);
  return candidates.some((value) => textAppears(sentence, value));
}

// shortcut: surface or reading match; upgrade to conjugation matching if learners start paraphrasing.
export function missingTargets(sentence: string, targets: SentenceTarget[]): SentenceTarget[] {
  return targets.filter((target) => !containsTarget(sentence, target));
}

// A polite verb ending needs a masu-stem in front, so a noun + ました (こんしゅうました)
// is not mistaken for a sentence.
const STEM = "[いきぎしじちぢにひびみりえけげせぜてでねへべぺめれ]";
const I_ADJ_PRE = `(?:[\u4e00-\u9fff]|${STEM}|[あかさたなはまやらわおこそとのほもよろ])`;
const PREDICATE_END = new RegExp(
  `(です|${STEM}ます|${STEM}ますか|${STEM}ました|${STEM}ません|${STEM}ませんか|ですか|でした|じゃない|ではない|ない|なかった|かった|くない|たい|ほしい|${I_ADJ_PRE}い|(?:(?<!ま)[いきぎしじちぢにひびみりえけげせぜてでねへべぺめれっ]た|[んみび]だ|だった)|だ|る|う|く|す|つ|ぬ|ぶ|む|ぐ)[。！？!?]?\\s*$`
);

/** True when the sentence has an ending, not just a topic or a bare word. */
export function hasPredicate(sentence: string): boolean {
  return PREDICATE_END.test(sentence.trim());
}

export type SentencePattern = {
  /** Required particle, or null when the verb decides it. */
  particle: string | null;
  skeleton: string;
  hint: string;
};

/** Frames avoid assuming transitivity, which the dictionary data does not have. */
export function sentencePatternFor(target: SentenceTarget): SentencePattern {
  if (target.partOfSpeech === "verb") {
    return {
      particle: null,
      skeleton: `＿＿ ＿＿ ${target.word}`,
      hint: "Add the object/topic with the particle this verb needs (を・に・が・で).",
    };
  }
  if (target.partOfSpeech === "adjective") {
    return {
      particle: "は",
      skeleton: `＿＿ は ${target.word} です`,
      hint: `Describe something as "${target.meaning}".`,
    };
  }
  if (target.partOfSpeech === "noun") {
    return {
      particle: "は",
      skeleton: `${target.word} は ＿＿ です`,
      hint: "Describe it, or use it with an action if it is a time word.",
    };
  }
  return {
    particle: null,
    skeleton: `${target.word} ＿＿`,
    hint: "Use it in a sentence that ends with a predicate.",
  };
}

export type EvolveTask = {
  id: string;
  label: string;
  hint: string;
  test: (sentence: string) => boolean;
};

function formTest(target: SentenceTarget, formTypes: string[]) {
  const forms = formsForTarget(target).filter((form) => formTypes.includes(form.formType));
  return (sentence: string) =>
    forms.some((form) => textAppears(sentence, form.form) || textAppears(sentence, form.reading));
}

/** Only transformations the word class can actually take, in either register. */
export function evolveTasksFor(target: SentenceTarget): EvolveTask[] {
  if (target.partOfSpeech === "verb") {
    return [
      {
        id: "past",
        label: "Past tense",
        hint: "ました / た",
        test: formTest(target, ["masu_past", "plain_past"]),
      },
      {
        id: "negative",
        label: "Negative",
        hint: "ません / ない",
        test: formTest(target, ["masu_negative", "plain_negative"]),
      },
      {
        id: "question",
        label: "Question",
        hint: "ますか / ませんか / ？",
        test: (s) => /(ますか|ませんか|[？?]\s*$)/.test(s),
      },
    ];
  }

  if (target.partOfSpeech === "adjective") {
    return [
      {
        id: "past",
        label: "Past tense",
        hint: "かったです / でした",
        test: (s) => formTest(target, ["past"])(s) || /でした/.test(s),
      },
      {
        id: "negative",
        label: "Negative",
        hint: "くないです / じゃないです",
        test: (s) => formTest(target, ["negative"])(s) || /(くありません|じゃありません|ではない)/.test(s),
      },
      {
        id: "question",
        label: "Question",
        hint: "ですか / かったですか / ？",
        test: (s) => /(ですか|でしたか|かったですか|[？?]\s*$)/.test(s),
      },
    ];
  }

  return [
    { id: "past", label: "Past tense", hint: "でした", test: (s) => /でした/.test(s) },
    {
      id: "negative",
      label: "Negative",
      hint: "じゃないです / ではない",
      test: (s) => /(じゃないです|じゃありません|ではない)/.test(s),
    },
    {
      id: "question",
      label: "Question",
      hint: "ですか / でしたか / ？",
      test: (s) => /(ですか|でしたか|[？?]\s*$)/.test(s),
    },
  ];
}

export function normalizedSentence(sentence: string): string {
  return sentence.replace(/[\s。！？!?、,.]+/g, "");
}

export function sameSentence(a: string, b: string): boolean {
  return normalizedSentence(a) === normalizedSentence(b);
}

export function usedParticles(sentence: string): string[] {
  // です, でした, ではない, でも contain で but are copula/conjunction forms, not the particle.
  return COMMON_PARTICLES.filter((particle) =>
    particle === "で" ? /で(?!(?:す|した|は|もない))/.test(sentence) : sentence.includes(particle)
  );
}

export function remixSituationFor(target: SentenceTarget): string {
  if (target.partOfSpeech === "verb") {
    return `Say what you did yesterday with ${target.word}.`;
  }
  if (target.partOfSpeech === "adjective") {
    return `Describe something with ${target.word}.`;
  }
  if (target.partOfSpeech === "noun") {
    return `Tell a friend about ${target.word}.`;
  }
  return `Use ${target.word} in one short sentence.`;
}

/* --------------------------------------------------------------------------
 * Sentence games: translate an English line, or fill in a missing conjugation.
 * Both are answered and checked locally — no AI call, no SRS writes.
 * ----------------------------------------------------------------------- */

export type GameGroup = "verb" | "i-adj" | "na-adj" | "noun" | "other";

/** Kana/kanji and punctuation differences never fail an answer. */
export function normalizeAnswer(value: string): string {
  return value
    .replace(/[\u3000\s。、．，！？!?.,]+/g, "")
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function uniqueAnswers(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** The word class decides which sentence frames are grammatical. */
export function targetGroup(target: SentenceTarget): GameGroup {
  if (target.partOfSpeech === "verb") return "verb";
  if (target.partOfSpeech === "adjective") {
    if (target.adjectiveType === "i_adjective") return "i-adj";
    if (target.adjectiveType === "na_adjective") return "na-adj";
    return target.word.endsWith("い") ? "i-adj" : "na-adj";
  }
  if (target.partOfSpeech === "noun") return "noun";
  return "other";
}

type FormPick = { form: string; reading: string; label: string; rule: string };

function picksFor(target: SentenceTarget): { list: TargetForm[]; get: (formType: string) => FormPick | null } {
  const list = formsForTarget(target);
  const byType = new Map(list.map((form) => [form.formType, form]));
  return {
    list,
    get(formType) {
      const form = byType.get(formType);
      if (!form) return null;
      return {
        form: form.form,
        reading: form.reading || form.form,
        label: form.label,
        rule: form.rule,
      };
    },
  };
}

function englishMeaning(target: SentenceTarget): string {
  const first = (target.meaning || "").split(/[;,/]/)[0]?.trim() ?? "";
  return first || target.word;
}

export type TranslationRound = {
  /** The English sentence to put into Japanese. */
  prompt: string;
  /** The canonical Japanese answer, in kana. */
  answer: string;
  /** Every spelling that counts: the kana answer and its kanji version. */
  accepted: string[];
  /** The form the answer practices, e.g. "Polite non-past". */
  note: string;
  /** Short grammar note shown after answering. */
  rule: string;
  /** True when this is a real sentence frame, false for the vocabulary fallback. */
  frame: boolean;
};

type SentenceVariant = {
  en: string;
  ja: (word: string) => string;
  form: string;
  reading: string;
  note: string;
  rule: string;
};

/**
 * One English sentence built from one due word. Short, single-clause frames
 * keep the answer unique, so the check is local and instant.
 */
export function buildTranslationRound(target: SentenceTarget, seed = 0): TranslationRound {
  const group = targetGroup(target);
  const meaning = englishMeaning(target);
  const kanaWord = target.reading || target.word;
  const picks = picksFor(target);
  let variants: SentenceVariant[] | null = null;

  if (group === "verb") {
    const masu = picks.get("masu");
    const negative = picks.get("masu_negative");
    const te = picks.get("te");
    if (masu && negative && te) {
      const base = meaning.replace(/^to\s+/i, "");
      const stem = masu.form.replace(/ます$/, "");
      const kanaStem = masu.reading.replace(/ます$/, "");
      variants = [
        {
          en: `I ${base} every day.`,
          ja: (word) => `まいにち${word}。`,
          form: masu.form,
          reading: masu.reading,
          note: masu.label,
          rule: masu.rule,
        },
        {
          en: `I don't ${base} at all.`,
          ja: (word) => `ぜんぜん${word}。`,
          form: negative.form,
          reading: negative.reading,
          note: negative.label,
          rule: negative.rule,
        },
        {
          en: `Please ${base}.`,
          ja: (word) => `${word}ください。`,
          form: te.form,
          reading: te.reading,
          note: te.label,
          rule: te.rule,
        },
        {
          en: `I want to ${base}.`,
          ja: (word) => word,
          form: `${stem}たいです`,
          reading: `${kanaStem}たいです`,
          note: "Tai-form (want to)",
          rule: "Drop ます from the polite form → add たいです",
        },
      ];
    }
  }

  if (group === "noun") {
    variants = [
      {
        en: `That's the ${meaning}.`,
        ja: (word) => `それは${word}です。`,
        form: target.word,
        reading: kanaWord,
        note: "Noun + です",
        rule: "です makes the sentence polite.",
      },
      {
        en: `That isn't the ${meaning}.`,
        ja: (word) => `それは${word}じゃないです。`,
        form: target.word,
        reading: kanaWord,
        note: "Noun + じゃないです",
        rule: "Polite negative: じゃないです.",
      },
      {
        en: `Is that the ${meaning}?`,
        ja: (word) => `それは${word}ですか。`,
        form: target.word,
        reading: kanaWord,
        note: "Noun question",
        rule: "Add か at the end to ask a question.",
      },
      {
        en: `The ${meaning} is here.`,
        ja: (word) => `${word}はここにあります。`,
        form: target.word,
        reading: kanaWord,
        note: "Noun + は + あります",
        rule: "は marks the topic; あります says it exists.",
      },
    ];
  }

  if (group === "i-adj" || group === "na-adj") {
    const dict = picks.get("dictionary");
    const negative = picks.get("negative");
    const past = picks.get("past");
    if (dict && negative && past) {
      variants = [
        {
          en: `This is ${meaning}.`,
          ja: (word) => `これは${word}です。`,
          form: dict.form,
          reading: dict.reading,
          note: "Polite predicate",
          rule: group === "i-adj" ? "い-adjective + です." : "な-adjective stem + です.",
        },
        {
          en: `This isn't ${meaning}.`,
          ja: (word) => `これは${word}です。`,
          form: negative.form,
          reading: negative.reading,
          note: negative.label,
          rule: negative.rule,
        },
        {
          en: `That was ${meaning}.`,
          ja: (word) => `それは${word}。`,
          form: past.form,
          reading: past.reading,
          note: past.label,
          rule: past.rule,
        },
        {
          en: `Is this ${meaning}?`,
          ja: (word) => `これは${word}ですか。`,
          form: dict.form,
          reading: dict.reading,
          note: "Polite question",
          rule: "Add か to the polite sentence.",
        },
      ];
    }
  }

  if (!variants || variants.length === 0) {
    return {
      prompt: `Write the Japanese for “${meaning}”.`,
      answer: kanaWord,
      accepted: uniqueAnswers([kanaWord, target.word]),
      note: "Vocabulary",
      rule: "You can answer in kana or kanji.",
      frame: false,
    };
  }

  const variant = variants[((seed % variants.length) + variants.length) % variants.length];
  const answer = variant.ja(variant.reading);
  return {
    prompt: variant.en,
    answer,
    accepted: uniqueAnswers([answer, variant.ja(variant.form)]),
    note: variant.note,
    rule: variant.rule,
    frame: true,
  };
}

/** Typed conjugation answers accept kanji or kana, ignoring punctuation and spacing. */
export function isConjugationCorrect(answer: string, round: ConjugationRound): boolean {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  return round.accepted.some((candidate) => normalizeAnswer(candidate) === normalized);
}

/** Words that can only be translated as a bare word make a flashcard, not a sentence. */
export function supportsTranslationSentence(target: SentenceTarget): boolean {
  return buildTranslationRound(target, 0).frame;
}

/** Typed kana/kanji answers are compared after normalising punctuation and width. */
export function isTranslationCorrect(answer: string, round: TranslationRound): boolean {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  return round.accepted.some((candidate) => normalizeAnswer(candidate) === normalized);
}

export type ConjugationChoice = { text: string; reading: string; formType: string };

export type ConjugationRound = {
  /** The form being asked for, e.g. "Polite past". */
  label: string;
  /** formType from the shared SRS builders, e.g. "masu_past". */
  formType: string;
  /** 1 recognition · 2 understanding · 3 transformation · 4 application. */
  stage: PracticeStage;
  /** Choices until the pattern is steady, then free typing. */
  mode: "choice" | "typed";
  /** "Polite" or "Plain" — the only hint a typed sentence gets. */
  register: string;
  /** Rule steps plus why the other choices fail. */
  explanation: Explanation;
  /** Optional progressive hints: context, word group, then the rule. */
  hints: string[];
  /** Kana/kanji spellings that count as correct for typed answers. */
  accepted: string[];
  /** English cue for the frame. */
  cue: string;
  /** Japanese text before the blank. */
  before: string;
  /** Japanese text after the blank. */
  after: string;
  answer: string;
  answerReading: string;
  rule: string;
  /** The whole sentence with the answer filled in. */
  fullAnswer: string;
  /** Kana readings for the kanji in `before`/`after`/`fullAnswer`. */
  readings: Record<string, string>;
  /** English sentence with the verb blanked, e.g. "I ___ a letter every day." */
  promptEn: string;
  /** Natural English of the completed sentence, shown after answering. */
  translation: string;
  choices: ConjugationChoice[];
};

type Frame = { before: string; after: string; cue: string; time?: string };

const VERB_FRAMES: Record<string, Frame> = {
  masu: { before: "まいにち", after: "。", cue: "Polite non-past", time: "every day" },
  masu_negative: {
    before: "ぜんぜん",
    after: "。",
    cue: "Polite negative non-past",
  },
  masu_past: { before: "きのう", after: "。", cue: "Polite past", time: "yesterday" },
  masu_past_negative: {
    before: "きのうは",
    after: "。",
    cue: "Polite past · negative",
    time: "yesterday",
  },
  te: { before: "", after: "ください。", cue: "Request · te-form" },
  plain_negative: {
    before: "ぜんぜん",
    after: "。",
    cue: "Plain · negative",
  },
  plain_past: { before: "きのう", after: "。", cue: "Plain past", time: "yesterday" },
  plain_past_negative: {
    before: "きのうは",
    after: "。",
    cue: "Plain past · negative",
    time: "yesterday",
  },
};

const I_ADJ_FRAMES: Record<string, Frame> = {
  masu: { before: "これは", after: "。", cue: "Polite non-past" },
  negative: { before: "これは", after: "です。", cue: "Negative" },
  past: { before: "それは", after: "です。", cue: "Past" },
  past_negative: { before: "それは", after: "です。", cue: "Past · negative" },
};

const NA_ADJ_FRAMES: Record<string, Frame> = {
  masu: { before: "これは", after: "。", cue: "Polite non-past" },
  negative: { before: "これは", after: "です。", cue: "Negative" },
  past: { before: "それは", after: "。", cue: "Plain past" },
  past_negative: { before: "それは", after: "です。", cue: "Past · negative" },
};

/** Curated English verbs, so a scene's object reads naturally (listen *to* music). */
export const ENGLISH_VERBS: Record<string, string> = {
  書く: "write",
  読む: "read",
  食べる: "eat",
  飲む: "drink",
  見る: "watch",
  聞く: "listen to",
  話す: "speak",
  買う: "buy",
  待つ: "wait for",
  使う: "use",
  作る: "make",
  洗う: "wash",
  開ける: "open",
  閉める: "close",
  教える: "teach",
  習う: "learn",
  借りる: "borrow",
  貸す: "lend",
  送る: "send",
  持つ: "carry",
  撮る: "take",
  歌う: "sing",
  消す: "turn off",
  つける: "turn on",
  覚える: "memorize",
  忘れる: "forget",
  調べる: "look up",
  始める: "start",
  勉強する: "study",
  弾く: "play",
  描く: "draw",
  会う: "meet",
  乗る: "ride",
  入る: "enter",
  座る: "sit on",
  行く: "go",
  来る: "come",
  帰る: "return",
  出る: "leave",
  降りる: "get off",
  働く: "work",
  遊ぶ: "play",
  歩く: "walk",
  走る: "run",
  泳ぐ: "swim",
  住む: "live",
  休む: "rest",
  する: "do",
};

const IRREGULAR_PAST: Record<string, string> = {
  be: "was",
  become: "became",
  begin: "began",
  break: "broke",
  bring: "brought",
  build: "built",
  buy: "bought",
  choose: "chose",
  come: "came",
  cut: "cut",
  do: "did",
  draw: "drew",
  drink: "drank",
  eat: "ate",
  fall: "fell",
  feel: "felt",
  find: "found",
  fly: "flew",
  forget: "forgot",
  get: "got",
  give: "gave",
  go: "went",
  grow: "grew",
  have: "had",
  hear: "heard",
  hit: "hit",
  hold: "held",
  keep: "kept",
  know: "knew",
  leave: "left",
  lend: "lent",
  let: "let",
  light: "lit",
  lose: "lost",
  make: "made",
  mean: "meant",
  meet: "met",
  pay: "paid",
  put: "put",
  read: "read",
  ride: "rode",
  run: "ran",
  say: "said",
  see: "saw",
  sell: "sold",
  send: "sent",
  show: "showed",
  sing: "sang",
  sit: "sat",
  sleep: "slept",
  speak: "spoke",
  spend: "spent",
  stand: "stood",
  steal: "stole",
  swim: "swam",
  take: "took",
  teach: "taught",
  tell: "told",
  think: "thought",
  throw: "threw",
  understand: "understood",
  wake: "woke",
  wear: "wore",
  win: "won",
  write: "wrote",
};

/** Regular verbs that double their final consonant before -ed. */
const DOUBLE_FINAL = new Set([
  "stop",
  "plan",
  "chat",
  "shop",
  "drop",
  "trip",
  "hug",
  "admit",
  "prefer",
]);

function englishBase(meaning: string): string {
  const first = (meaning || "").split(/[;,/]/)[0]?.trim() ?? "";
  return first
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/^to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function regularPast(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("e")) return `${word}d`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ied`;
  if (DOUBLE_FINAL.has(lower)) return `${word}${word.slice(-1)}ed`;
  return `${word}ed`;
}

function pastTense(base: string): string {
  const [head, ...rest] = base.split(/\s+/);
  if (!head) return base;
  const past = IRREGULAR_PAST[head.toLowerCase()] ?? regularPast(head);
  return [past, ...rest].join(" ");
}

/** A natural English sentence for the same scene and verb form. */
function translationFor(input: {
  target: SentenceTarget;
  group: GameGroup;
  formType: string;
  scene: SceneFrame | null;
  objectEn?: string;
  time?: string;
}): string {
  const { target, group, formType, scene, objectEn, time } = input;
  const past = formType.includes("past");
  const negative = formType.includes("negative");

  if (group === "i-adj" || group === "na-adj") {
    const adjective = englishBase(target.meaning) || "like that";
    const phrase = negative ? `not ${adjective}` : adjective;

    if (target.word === "好き" && scene?.nounEn) {
      const verb = past
        ? negative
          ? "did not like"
          : "liked"
        : negative
          ? "do not like"
          : "like";
      return `I ${verb} ${past ? "that" : "this"} ${scene.nounEn}.`;
    }
    if (target.word === "忙しい" && scene?.adjectiveTopicEn) {
      return `I ${past ? (negative ? "was not" : "was") : negative ? "am not" : "am"} ${adjective} ${scene.adjectiveTopicEn}.`;
    }

    if (scene?.adjectiveTopicEn) {
      const topic = scene.adjectiveTopicEn;
      return `${topic.charAt(0).toUpperCase()}${topic.slice(1)} ${past ? "was" : "is"} ${phrase}.`;
    }
    if (scene?.nounEn) {
      return `${past ? "That" : "This"} ${scene.nounEn} ${past ? "was" : "is"} ${phrase}.`;
    }
    return `${past ? "That one was" : "This one is"} ${phrase}.`;
  }

  if (group === "verb") {
    const base = ENGLISH_VERBS[target.word] ?? (englishBase(target.meaning) || "do");
    let phrase = base;
    if (past && negative) phrase = `did not ${base}`;
    else if (past) phrase = pastTense(base);
    else if (negative) phrase = `do not ${base}`;

    const object = objectEn ?? scene?.en;
    if (formType === "te") {
      return `Please ${phrase}${object ? ` ${object}` : " it"}.`;
    }
    // ぜんぜん is the negative frame's adverb; keep it in the English.
    const timeWord =
      formType === "masu_negative" || formType === "plain_negative" ? "at all" : time;
    const topic = scene?.topicEn ?? "I";
    return `${[topic, phrase, object, timeWord].filter(Boolean).join(" ")}.`;
  }

  return "";
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = (Math.abs(seed) + 1) * 1664525 + 1013904223;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A Japanese frame with the conjugated word missing, plus four form choices.
 * Nouns (and words without a usable form) return null and are skipped.
 */
export function buildConjugationRound(
  target: SentenceTarget,
  seed = 0,
  patternStats?: PatternStats | null
): ConjugationRound | null {
  const group = targetGroup(target);
  const frames =
    group === "verb"
      ? VERB_FRAMES
      : group === "i-adj"
        ? I_ADJ_FRAMES
        : group === "na-adj"
          ? NA_ADJ_FRAMES
          : null;
  if (!frames) return null;

  const all = formsForTarget(target);
  const scene = sceneFor(target.word);
  const usable = all.filter(
    (form) => frames[form.formType] && !scene?.skip?.includes(form.formType)
  );
  if (usable.length === 0) return null;

  const correct = usable[Math.abs(seed) % usable.length];
  const frame = frames[correct.formType];
  const sceneOverride = scene?.overrides?.[correct.formType];
  const isPast = correct.formType.includes("past");

  // A scene turns the stub frame into a full sentence; the adjective noun
  // flips この → その in past frames because the sentence points elsewhere.
  const before =
    sceneOverride?.before ??
    (!scene
      ? frame.before
      : group === "verb"
        ? correct.formType === "te"
          ? scene.complement ?? ""
          : [scene.topic, frame.before, scene.complement].filter(Boolean).join(" ")
        : scene.noun
          ? `${isPast ? "その" : "この"} ${scene.noun}は`
          : scene.adjectiveTopic ?? frame.before);
  const after = sceneOverride?.after ?? frame.after;
  // Display only: the frames are authored in kana, the prompt reads better in
  // kanji. Answers, accepted spellings and audio are untouched.
  const beforeParts = toKanjiParts(before);
  const afterParts = toKanjiParts(after);
  const displayBefore = beforeParts.map((part) => part.text).join("");
  const displayAfter = afterParts.map((part) => part.text).join("");
  const readings = { ...readingsFrom(beforeParts), ...readingsFrom(afterParts) };

  // Near-miss distractors from the pattern table, never random stored forms:
  // "it is past", "it is negative" are the mistakes worth teaching.
  const byType = new Map(all.map((form) => [form.formType, form]));
  const seen = new Set([normalizeAnswer(correct.form), correct.formType]);
  const distractors: TargetForm[] = [];
  for (const type of distractorTypes(
    correct.formType,
    all.map((form) => form.formType)
  )) {
    const form = byType.get(type);
    if (!form || seen.has(normalizeAnswer(form.form))) continue;
    seen.add(normalizeAnswer(form.form));
    distractors.push(form);
  }
  for (const form of seededShuffle(all, seed + 3)) {
    if (distractors.length >= 3) break;
    const key = normalizeAnswer(form.form);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(form);
  }


  // The drill is meaning-first: the English sentence carries the situation and
  // the blank, the cue says which tense/register to produce, and the Japanese
  // sentence is only revealed after answering.
  const objectEn = sceneOverride?.en ?? scene?.en;
  const promptEn =
    group === "verb"
      ? correct.formType === "te"
        ? `Please ___ ${objectEn ?? "it"}.`
        : [scene?.topicEn ?? "I", "___", objectEn, frame.time].filter(Boolean).join(" ") + "."
      : `${isPast ? "That" : "This"} ${scene?.nounEn ?? "one"} ${isPast ? "was" : "is"} ___.`;

  const choices = seededShuffle([correct, ...distractors], seed + 11).map((form) => ({
    text: form.form,
    reading: form.reading || form.form,
    formType: form.formType,
  }));
  const translation = translationFor({
    target,
    group,
    formType: correct.formType,
    scene,
    objectEn: sceneOverride?.en,
    time: frame.time,
  });
  const stats = patternStats ?? null;
  const stage = stageFor(stats);
  const typed = stage === 4 || (stage === 3 && !usesChoices(stage, stats));
  const explanation = explainConjugation({
    target,
    formType: correct.formType,
    form: correct.form,
    dictionaryForm: target.word,
    choices,
  });

  return {
    // Stored WordForms label themselves with the raw form type, so prefer a
    // readable name over "masu" in the feedback.
    label: patternLabel(correct.formType),
    formType: correct.formType,
    stage,
    mode: typed ? "typed" : "choice",
    register: patternAttrs(correct.formType).polite ? "Polite" : "Plain",
    explanation,
    hints: explanation.hints,
    accepted: Array.from(
      new Set([correct.form, correct.reading || correct.form])
    ),
    cue: frame.cue,
    before: displayBefore,
    after: displayAfter,
    answer: correct.form,
    answerReading: correct.reading || correct.form,
    rule: correct.rule,
    fullAnswer: [displayBefore, `${correct.form}${displayAfter}`].filter(Boolean).join(" "),
    promptEn,
    translation,
    readings,
    choices,
  };
}
