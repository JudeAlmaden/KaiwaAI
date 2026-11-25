/**
 * Sentence templates for deck words.
 *
 * Each builder turns one saved word into exercises for a concept the learner
 * already has in the curriculum. Templates only place words whose grammatical
 * role is guaranteed by the card's part of speech, and every sentence is
 * checked by hand-written rules — nothing is guessed about meaning.
 *
 * Verbs are the exception: whether a verb takes を depends on the verb, so
 * sentences are only built for verbs that already have a curated scene in
 * `lib/review/sentence-frames.ts`. Every other verb still gets conjugation
 * drills, which need no complements.
 */

import { formsForTarget } from "@/lib/review/conjugation";
import { sceneFor, type SceneFrame } from "@/lib/review/sentence-frames";
import { ENGLISH_VERBS } from "@/lib/review/sentence-task";
import type { DeckWord } from "./deck";
import type { GrammarExercise } from "./types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ExerciseDraft = DistributiveOmit<GrammarExercise, "id">;

/** Partners for adjective sentences when the deck has no nouns yet. */
const FALLBACK_NOUNS = ["ほん", "まち", "へや"];
const FALLBACK_NOUN_EN: Record<string, string> = {
  ほん: "book",
  まち: "town",
  へや: "room",
};

const PARTICLE_OF_ENDING: Record<string, string> = {
  は: "particle-wa",
  を: "particle-wo",
  に: "particle-ni-de",
  で: "particle-ni-de",
  へ: "particle-he",
  の: "particle-no",
  も: "particle-mo",
};

const PARTICLE_OPTIONS: Record<string, string[]> = {
  "particle-wa": ["は", "が", "を", "で"],
  "particle-wo": ["を", "は", "に", "が"],
  "particle-ni-de": ["に", "で", "を", "は"],
  "particle-he": ["へ", "を", "で", "の"],
  "particle-no": ["の", "は", "を", "に"],
  "particle-mo": ["も", "は", "が", "を"],
};

function words(word: DeckWord): string[] {
  return word.reading === word.word ? [word.word] : [word.word, word.reading];
}

/** Trailing particle of a curated scene phrase: "てがみを" → ["てがみ", "を"]. */
function splitPhrase(phrase: string): string[] {
  const last = phrase.slice(-1);
  if (!PARTICLE_OF_ENDING[last]) return [phrase];
  return [phrase.slice(0, -1), last];
}

function stripFinalKana(value: string): string {
  return Array.from(value).slice(0, -1).join("");
}

/** いい is irregular: よくない, not いくない. */
function negatable(adjective: string): boolean {
  return !adjective.endsWith("いい");
}

// ── Nouns ─────────────────────────────────────────────────────────────────

export function nounDrafts(noun: DeckWord): ExerciseDraft[] {
  const n = noun.word;
  const g = noun.gloss;
  const sentence = `これは${n}です。`;

  return [
    {
      kind: "assemble",
      concept: "noun-sentence",
      stage: 1,
      en: `This is the ${g}.`,
      ja: sentence,
      tiles: ["これ", "は", n, "です", "を"],
      solution: ["これ", "は", n, "です"],
      words: words(noun),
      rule: "A は B です: the topic comes first, です finishes the sentence.",
      structure: ["topic: これ + は", `description: ${n}`, "polite: です"],
      highlights: [{ token: "は", note: "marks これ as the topic" }],
    },
    {
      kind: "particle",
      concept: "particle-wa",
      stage: 1,
      en: `This is the ${g}.`,
      ja: sentence,
      before: "これ",
      after: `${n}です。`,
      answer: "は",
      options: PARTICLE_OPTIONS["particle-wa"]!,
      whyWrong: {
        が: "が presents new information; here これ is the topic.",
        を: "を marks an object, and です needs a topic.",
        で: "で marks where an action happens.",
      },
      words: words(noun),
      rule: "は marks the topic: これは = “as for this”.",
    },
    {
      kind: "particle",
      concept: "particle-ga",
      stage: 2,
      en: `I like the ${g}.`,
      ja: `わたしは${n}がすきです。`,
      before: `わたしは${n}`,
      after: "すきです。",
      answer: "が",
      options: ["が", "を", "は", "に"],
      whyWrong: {
        を: "すき takes が, not を: すきです.",
        は: "は would make it the topic instead of what you like.",
        に: "に marks direction or time.",
      },
      words: words(noun),
      rule: "すき takes が for the thing that is liked.",
      highlights: [{ token: "が", note: "marks what is liked" }],
    },
    {
      kind: "assemble",
      concept: "particle-no",
      stage: 2,
      en: `This is my ${g}.`,
      ja: `これはわたしの${n}です。`,
      tiles: ["これ", "は", "わたし", "の", n, "です", "を"],
      solution: ["これ", "は", "わたし", "の", n, "です"],
      words: words(noun),
      rule: "A の B: the owner comes first, then の, then the thing owned.",
    },
  ];
}

// ── Adjectives ────────────────────────────────────────────────────────────

type Partner = { ja: string; en: string };

function partners(nouns: DeckWord[]): Partner[] {
  const fromDeck = nouns.slice(0, 2).map((noun) => ({ ja: noun.word, en: noun.gloss }));
  const fallback = FALLBACK_NOUNS.map((noun) => ({ ja: noun, en: FALLBACK_NOUN_EN[noun]! }));
  return [...fromDeck, ...fallback].slice(0, 2);
}

export function adjectiveDrafts(
  adjective: DeckWord,
  nouns: DeckWord[]
): ExerciseDraft[] {
  const drafts: ExerciseDraft[] = [];
  const partner = partners(nouns)[0]!;

  if (adjective.kind === "i-adj") {
    drafts.push({
      kind: "complete",
      concept: "i-adj",
      stage: 3,
      en: `This ${partner.en} is ${adjective.gloss}.`,
      ja: `この${partner.ja}は${adjective.word}です。`,
      before: `この${partner.ja}は`,
      after: "です。",
      answer: adjective.word,
      accepted: adjective.reading === adjective.word ? [] : [adjective.reading],
      hint: `the い-adjective meaning “${adjective.gloss}”`,
      words: words(adjective),
      rule: "い-adjectives keep their い before です.",
      structure: [`この + ${partner.ja}`, `は`, `${adjective.word} + です`],
    });

    if (negatable(adjective.word)) {
      const negative = `${stripFinalKana(adjective.word)}くない`;
      const negativeReading =
        adjective.reading === adjective.word
          ? null
          : `${stripFinalKana(adjective.reading)}くない`;
      drafts.push({
        kind: "complete",
        concept: "adj-negative",
        stage: 3,
        en: `This ${partner.en} is not ${adjective.gloss}.`,
        ja: `この${partner.ja}は${negative}です。`,
        before: `この${partner.ja}は`,
        after: "です。",
        answer: negative,
        accepted: negativeReading ? [negativeReading] : [],
        hint: "drop the final い, then add くない",
        words: words(adjective),
        rule: "い-adjective negative: い → くない, then です.",
        nearMisses: [
          {
            answer: `${adjective.word}じゃない`,
            note: "い-adjectives use くない: い → くない.",
          },
        ],
      });
    }

    drafts.push({
      kind: "assemble",
      concept: "adj-noun",
      stage: 1,
      en: `This is ${adjective.gloss} ${partner.en}.`,
      ja: `これは${adjective.word}${partner.ja}です。`,
      tiles: ["これ", "は", adjective.word, partner.ja, "です", "を"],
      solution: ["これ", "は", adjective.word, partner.ja, "です"],
      words: words(adjective),
      rule: "い-adjectives attach directly to the noun — no な.",
    });
    return drafts;
  }

  drafts.push({
    kind: "complete",
    concept: "na-adj",
    stage: 3,
    en: `This ${partner.en} is ${adjective.gloss}.`,
    ja: `この${partner.ja}は${adjective.word}です。`,
    before: `この${partner.ja}は`,
    after: "です。",
    answer: adjective.word,
    accepted: adjective.reading === adjective.word ? [] : [adjective.reading],
    hint: `the stem meaning “${adjective.gloss}”, with no な before です`,
    words: words(adjective),
    rule: "A な-adjective predicate keeps the bare stem before です.",
  });

  drafts.push({
    kind: "complete",
    concept: "adj-negative",
    stage: 3,
    en: `This ${partner.en} is not ${adjective.gloss}.`,
    ja: `この${partner.ja}は${adjective.word}じゃないです。`,
    before: `この${partner.ja}は${adjective.word}`,
    after: "。",
    answer: "じゃないです",
    accepted: ["ではないです", "じゃありません", "ではありません"],
    hint: "な-adjectives negate with じゃないです",
    words: words(adjective),
    rule: "な-adjectives negate with じゃないです, never くないです.",
    nearMisses: [
      {
        answer: `${stripFinalKana(adjective.word)}くないです`,
        note: "な-adjectives use じゃないです, not くないです.",
      },
    ],
  });

  drafts.push({
    kind: "assemble",
    concept: "adj-noun",
    stage: 2,
    en: `This is ${adjective.gloss} ${partner.en}.`,
    ja: `これは${adjective.word}な${partner.ja}です。`,
    tiles: ["これ", "は", adjective.word, "な", partner.ja, "です", "を"],
    solution: ["これ", "は", adjective.word, "な", partner.ja, "です"],
    words: words(adjective),
    rule: "な-adjectives need な before the noun they describe.",
  });
  return drafts;
}

// ── Verbs ─────────────────────────────────────────────────────────────────

type VerbForm = { form: string; reading: string; rule: string };

function formOf(verb: DeckWord, formType: string): VerbForm | null {
  const target = {
    word: verb.word,
    reading: verb.reading,
    partOfSpeech: "verb",
    verbType: verb.verbType,
    forms: verb.forms.map((form) => ({
      form: form.form,
      reading: form.reading,
      formType: form.formType,
    })),
  };
  const match = formsForTarget(target).find((form) => form.formType === formType);
  if (!match || !match.form) return null;
  return {
    form: match.form,
    reading: match.reading || match.form,
    rule: match.rule || "Change the ending to match the form.",
  };
}

function verbConcept(verb: DeckWord): string {
  if (verb.verbType === "ichidan") return "verb-ichidan";
  if (verb.verbType === "suru" || verb.verbType === "kuru" || verb.verbType === "irregular") {
    return "verb-irregular";
  }
  return "verb-godan";
}

function transformDraft(
  verb: DeckWord,
  form: VerbForm,
  concept: string,
  target: string,
  conjugation: string
): ExerciseDraft {
  return {
    kind: "transform",
    concept,
    stage: 4,
    from: verb.word,
    fromEn: `to ${verb.gloss}`,
    target,
    answer: form.form,
    // The kana spelling counts too: 書きます or かきます.
    accepted: form.reading && form.reading !== form.form ? [form.reading] : [],
    ja: form.form,
    words: words(verb),
    hint: `start from 「${verb.word}」 and change the ending`,
    rule: form.rule,
    conjugation: { form: conjugation, steps: [form.rule] },
  };
}

function sceneEnglish(verb: DeckWord, scene: SceneFrame): string {
  const subject = scene.topicEn ?? "I";
  const verbEn = ENGLISH_VERBS[verb.word] ?? ENGLISH_VERBS[verb.gloss] ?? verb.gloss;
  return [subject, verbEn, scene.en].filter(Boolean).join(" ");
}

function sceneDrafts(verb: DeckWord, scene: SceneFrame, masu: VerbForm): ExerciseDraft[] {
  if (!scene.topic || !scene.complement) return [];

  const topic = splitPhrase(scene.topic);
  const complement = splitPhrase(scene.complement);
  const en = `${sceneEnglish(verb, scene)}.`;
  const solution = [...topic, ...complement, masu.form];
  const ending = complement[complement.length - 1] ?? "";
  const concept = PARTICLE_OF_ENDING[ending] ?? "particle-wo";

  const drafts: ExerciseDraft[] = [
    {
      kind: "assemble",
      concept,
      stage: 2,
      en,
      ja: `${solution.join("")}。`,
      tiles: [...solution, "です"],
      solution,
      words: words(verb),
      rule: "Topic → complement with its particle → polite verb at the end.",
      structure: [`topic: ${scene.topic}`, `complement: ${scene.complement}`, `verb: ${masu.form}`],
    },
  ];

  if (PARTICLE_OF_ENDING[ending]) {
    drafts.push({
      kind: "particle",
      concept,
      stage: 1,
      en,
      ja: `${solution.join("")}。`,
      before: [...topic, ...complement.slice(0, -1)].join(""),
      after: `${masu.form}。`,
      answer: ending,
      options: PARTICLE_OPTIONS[concept] ?? ["に", "で", "を", "は"],
      words: words(verb),
      rule: `The particle ${ending} belongs to 「${complement.join("")}」.`,
    });
  }

  return drafts;
}

export function verbDrafts(verb: DeckWord): ExerciseDraft[] {
  const masu = formOf(verb, "masu");
  const negative = formOf(verb, "masu_negative");
  const past = formOf(verb, "masu_past");
  const scene = sceneFor(verb.word);
  const concept = verbConcept(verb);

  const drafts: ExerciseDraft[] = [];
  if (masu) {
    drafts.push(transformDraft(verb, masu, concept, "Polite non-past (ます)", "Polite non-past"));
  }
  if (masu && scene) drafts.push(...sceneDrafts(verb, scene, masu));
  if (negative) {
    drafts.push(
      transformDraft(verb, negative, "verb-negative", "Polite negative (ません)", "Polite negative")
    );
  }
  if (past) {
    drafts.push(transformDraft(verb, past, "verb-past", "Polite past (ました)", "Polite past"));
  }
  return drafts;
}

export function draftsFor(word: DeckWord, nouns: DeckWord[]): ExerciseDraft[] {
  switch (word.kind) {
    case "noun":
      return nounDrafts(word);
    case "verb":
      return verbDrafts(word);
    default:
      return adjectiveDrafts(word, nouns);
  }
}
