/**
 * Sentence Construction curriculum.
 *
 * Concepts are topic tags: presentation groups them by module, and mastery is
 * tracked per concept. They are not stages and do not gate each other — the
 * practice stream can serve any exercise at any time.
 */

export type GrammarConcept = {
  id: string;
  moduleId: string;
  title: string;
  jp: string;
  /** One-line objective. */
  goal: string;
  /** Two or three beginner-friendly teaching lines. */
  teaches: string[];
};

export type GrammarModule = {
  id: string;
  title: string;
  jp: string;
  blurb: string;
};

export const MODULES: GrammarModule[] = [
  {
    id: "structure",
    title: "Basic sentence structure",
    jp: "文のしくみ",
    blurb: "Topic first, predicate last — the shape every later sentence keeps.",
  },
  {
    id: "particles",
    title: "Particles",
    jp: "助詞",
    blurb: "は, が, を, に, で, の, も and へ, one role at a time.",
  },
  {
    id: "adjectives",
    title: "Adjectives",
    jp: "形容詞",
    blurb: "Describe nouns and make polite negative and past statements.",
  },
  {
    id: "verbs",
    title: "Verbs and conjugation",
    jp: "動詞",
    blurb: "Verb groups, polite non-past, negatives, past and te-form.",
  },
  {
    id: "questions",
    title: "Questions and negation",
    jp: "質問と否定",
    blurb: "Ask with か, use question words, and say what is not true.",
  },
  {
    id: "expansion",
    title: "Sentence expansion",
    jp: "文の拡張",
    blurb: "Add time, place and frequency to the sentences you already know.",
  },
];

export const CONCEPTS: GrammarConcept[] = [
  {
    id: "word-order",
    moduleId: "structure",
    title: "Word order",
    jp: "語順",
    goal: "Put the topic first and the predicate last.",
    teaches: [
      "Japanese runs topic → object → verb.",
      "The predicate — です or a verb — always comes last.",
      "Particles attach after the word they mark.",
    ],
  },
  {
    id: "desu",
    moduleId: "structure",
    title: "です and だ",
    jp: "です・だ",
    goal: "End a noun sentence politely with です, casually with だ.",
    teaches: [
      "です ends a polite noun sentence.",
      "だ is the casual equivalent, used with friends.",
      "Japanese has no articles: ねこ can be \"a cat\" or \"the cat\".",
    ],
  },
  {
    id: "noun-sentence",
    moduleId: "structure",
    title: "Noun sentences",
    jp: "名詞文",
    goal: "Say that A is B with A は B です.",
    teaches: [
      "A は B です means \"A is B\".",
      "は marks the topic, not the grammatical subject.",
      "The description comes before です.",
    ],
  },
  {
    id: "particle-wa",
    moduleId: "particles",
    title: "は — topic",
    jp: "は",
    goal: "Mark what the sentence is about.",
    teaches: [
      "は marks the topic: what the rest of the sentence is about.",
      "It is written は but read わ.",
      "It can also contrast: きょうは… (as for today).",
    ],
  },
  {
    id: "particle-ga",
    moduleId: "particles",
    title: "が — subject",
    jp: "が",
    goal: "Mark the subject, especially new information.",
    teaches: [
      "が marks the subject, often the new information in a sentence.",
      "すき, わかります and ほしい take が, not を.",
      "は and が can both be natural; は shifts the topic.",
    ],
  },
  {
    id: "particle-wo",
    moduleId: "particles",
    title: "を — object",
    jp: "を",
    goal: "Mark the direct object of an action.",
    teaches: [
      "を marks the direct object: what the action is done to.",
      "It is written を but read お.",
      "Object + を comes before the verb.",
    ],
  },
  {
    id: "particle-ni-de",
    moduleId: "particles",
    title: "に and で",
    jp: "に・で",
    goal: "Separate destination/time from the place of an action.",
    teaches: [
      "に marks a destination or a specific time.",
      "で marks where an action happens, or the tool used.",
      "Both can translate as \"in/at/to\" — the verb decides.",
    ],
  },
  {
    id: "particle-no",
    moduleId: "particles",
    title: "の — possession",
    jp: "の",
    goal: "Link two nouns, owner before thing.",
    teaches: [
      "A の B means \"A's B\" or \"B of A\".",
      "The owner comes first: わたしのほん = my book.",
      "の also links a category: にほんのほん = a Japanese book.",
    ],
  },
  {
    id: "particle-mo",
    moduleId: "particles",
    title: "も — also",
    jp: "も",
    goal: "Say \"also\" by replacing は or が.",
    teaches: [
      "も means \"also / too\".",
      "It replaces は or が in the same slot: わたしも.",
      "It never appears together with は.",
    ],
  },
  {
    id: "particle-he",
    moduleId: "particles",
    title: "へ — direction",
    jp: "へ",
    goal: "Mark the direction you are heading.",
    teaches: [
      "へ marks direction and is read え.",
      "For destinations, に and へ are usually interchangeable.",
      "へ puts the focus on the journey toward the place.",
    ],
  },
  {
    id: "i-adj",
    moduleId: "adjectives",
    title: "い-adjectives",
    jp: "い形容詞",
    goal: "Use an い-adjective as a predicate.",
    teaches: [
      "い-adjectives end in い in the dictionary form.",
      "Add です to make a polite sentence: たかいです.",
      "Before a noun they stay unchanged: たかいやま.",
    ],
  },
  {
    id: "na-adj",
    moduleId: "adjectives",
    title: "な-adjectives",
    jp: "な形容詞",
    goal: "Use a な-adjective as a predicate.",
    teaches: [
      "な-adjectives take な before a noun: しずかなまち.",
      "As a predicate they take です: しずかです.",
      "The dictionary form is the stem, with no な or だ.",
    ],
  },
  {
    id: "adj-negative",
    moduleId: "adjectives",
    title: "Negative adjectives",
    jp: "否定形",
    goal: "Say something is not tall, quiet, or interesting.",
    teaches: [
      "い-adjective: い → くない (たかい → たかくない).",
      "Add です to stay polite: たかくないです.",
      "な-adjective: stem + じゃないです.",
    ],
  },
  {
    id: "adj-noun",
    moduleId: "adjectives",
    title: "Adjectives before nouns",
    jp: "名詞修飾",
    goal: "Describe a noun, then use the phrase in a sentence.",
    teaches: [
      "Adjective + noun forms one noun phrase.",
      "い-adjectives attach directly; な-adjectives need な.",
      "The phrase can become the topic: このしずかなまちは…",
    ],
  },
  {
    id: "verb-godan",
    moduleId: "verbs",
    title: "Godan verbs",
    jp: "五段動詞",
    goal: "Recognise Godan verbs and make the polite non-past.",
    teaches: [
      "Godan verbs shift across the あ/い/う/え/お rows.",
      "Polite non-past: u-row → i-row + ます (のむ → のみます).",
      "The dictionary form ends in a u-row kana.",
    ],
  },
  {
    id: "verb-ichidan",
    moduleId: "verbs",
    title: "Ichidan verbs",
    jp: "一段動詞",
    goal: "Drop る and attach the ending.",
    teaches: [
      "Ichidan verbs drop る before every ending.",
      "たべる → たべます / たべて / たべない.",
      "If the syllable before る is い or え, it is usually Ichidan.",
    ],
  },
  {
    id: "verb-irregular",
    moduleId: "verbs",
    title: "Irregular verbs",
    jp: "不規則動詞",
    goal: "Learn する and 来る as fixed pairs.",
    teaches: [
      "する and 来る are irregular — memorise each form.",
      "する → します; 来る → きます.",
      "Noun + する makes a verb: べんきょうする → べんきょうします.",
    ],
  },
  {
    id: "verb-negative",
    moduleId: "verbs",
    title: "Negative verbs",
    jp: "動詞の否定",
    goal: "Turn ます into ません.",
    teaches: [
      "Polite negative: ます → ません.",
      "のみます → のみません.",
      "Plain negative uses the あ-row: のむ → のまない.",
    ],
  },
  {
    id: "verb-past",
    moduleId: "verbs",
    title: "Past verbs",
    jp: "過去形",
    goal: "Talk about what happened with ました.",
    teaches: [
      "Polite past: ます → ました.",
      "たべます → たべました.",
      "Polite negative past: ませんでした.",
    ],
  },
  {
    id: "verb-te",
    moduleId: "verbs",
    title: "Te-form",
    jp: "て形",
    goal: "Link actions and make requests with てください.",
    teaches: [
      "The te-form links actions and forms requests with ください.",
      "Godan verbs change by sound: のむ → のんで.",
      "Ichidan verbs drop る and add て: たべる → たべて.",
    ],
  },
  {
    id: "question-ka",
    moduleId: "questions",
    title: "Questions with か",
    jp: "か",
    goal: "Turn a statement into a question by adding か.",
    teaches: [
      "Add か to the end of a polite sentence.",
      "Word order does not change.",
      "A question mark is optional in Japanese.",
    ],
  },
  {
    id: "question-words",
    moduleId: "questions",
    title: "Question words",
    jp: "疑問詞",
    goal: "Ask what, who, where, when and why.",
    teaches: [
      "なん/なに (what), だれ (who), どこ (where), いつ (when), なぜ (why).",
      "The question word stays where the answer would go.",
      "Add か at the end as usual.",
    ],
  },
  {
    id: "negation",
    moduleId: "questions",
    title: "Negative sentences",
    jp: "否定文",
    goal: "Say what is not true, for nouns and verbs.",
    teaches: [
      "Nouns: です → じゃないです.",
      "Verbs: ます → ません (polite) or ない (plain).",
      "ませんか is an invitation, not a plain question.",
    ],
  },
  {
    id: "time",
    moduleId: "expansion",
    title: "Time expressions",
    jp: "時の表現",
    goal: "Place きのう, あした and まいにち naturally.",
    teaches: [
      "Time words usually come early in the sentence.",
      "きのう, あした and まいにち need no particle.",
      "に marks a specific clock time or date.",
    ],
  },
  {
    id: "location",
    moduleId: "expansion",
    title: "Locations",
    jp: "場所",
    goal: "Say where an action happens.",
    teaches: [
      "で marks where an action happens.",
      "に marks where something exists, or a destination.",
      "へ marks direction toward a place.",
    ],
  },
  {
    id: "frequency",
    moduleId: "expansion",
    title: "Frequency",
    jp: "頻度",
    goal: "Say how often something happens.",
    teaches: [
      "いつも (always), よく (often), ときどき (sometimes).",
      "Frequency adverbs sit before the verb.",
      "あまり and ぜんぜん need a negative ending.",
    ],
  },
  {
    id: "combine",
    moduleId: "expansion",
    title: "Longer sentences",
    jp: "長い文",
    goal: "Combine time, place and description in one sentence.",
    teaches: [
      "Longer sentences add time, place and description around one core.",
      "Keep the predicate last.",
      "Every noun keeps the particle its role needs.",
    ],
  },
];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((concept) => [concept.id, concept]));

export const MODULE_BY_ID = new Map(MODULES.map((module) => [module.id, module]));

export function conceptsForModule(moduleId: string): GrammarConcept[] {
  return CONCEPTS.filter((concept) => concept.moduleId === moduleId);
}

/** Concepts in teaching order for one module, or the whole curriculum. */
export function orderedConcepts(moduleId?: string): GrammarConcept[] {
  return moduleId ? conceptsForModule(moduleId) : CONCEPTS;
}

export function conceptIndex(conceptId: string): number {
  return CONCEPTS.findIndex((concept) => concept.id === conceptId);
}
