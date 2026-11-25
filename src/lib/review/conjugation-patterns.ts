/**
 * Conjugation pattern metadata: accurate names, beginner-friendly rule steps,
 * and short explanations of why a distractor is wrong.
 *
 * Rules are generated from the same tables the forms come from, so an
 * explanation can never drift from the answer.
 */

import {
  GODAN_ENDINGS,
  GODAN_ROW,
  GODAN_TE,
  groupFor,
  type ConjugableTarget,
} from "./conjugation";

export type PatternAttrs = {
  polite: boolean;
  past: boolean;
  negative: boolean;
  te: boolean;
  plain: boolean;
};

export function patternAttrs(formType: string): PatternAttrs {
  const polite = formType.startsWith("masu");
  return {
    polite,
    past: formType.includes("past"),
    negative: formType.includes("negative"),
    te: formType === "te",
    plain: !polite,
  };
}

/**
 * Japanese non-past covers habitual and future actions, so the polite form is
 * "polite non-past" — not "polite present".
 */
export const PATTERN_LABELS: Record<string, string> = {
  dictionary: "Dictionary form",
  masu: "Polite non-past",
  masu_negative: "Polite negative non-past",
  masu_past: "Polite past",
  masu_past_negative: "Polite negative past",
  te: "Te-form",
  plain_negative: "Plain negative non-past",
  plain_past: "Plain past",
  plain_past_negative: "Plain negative past",
  negative: "Negative non-past",
  past: "Past",
  past_negative: "Negative past",
  attributive: "Before a noun",
};

export function patternLabel(formType: string): string {
  return PATTERN_LABELS[formType] ?? formType.replaceAll("_", " ");
}

export function patternContrast(formType: string): string {
  return patternLabel(formType).toLowerCase();
}

/** Why a distractor is the wrong choice for this sentence. */
export function whyWrong(correctType: string, otherType: string): string {
  const correct = patternAttrs(correctType);
  const other = patternAttrs(otherType);

  if (other.te !== correct.te) {
    return other.te
      ? "It is a te-form, which this sentence doesn't ask for."
      : "The sentence needs a te-form, and this is a plain predicate.";
  }
  if (other.past !== correct.past) {
    return other.past
      ? "It is in the past, but the sentence isn't about the past."
      : "The sentence is about the past, and this form isn't.";
  }
  if (other.negative !== correct.negative) {
    return other.negative
      ? "It is negative, but the sentence isn't."
      : "The sentence is negative, and this form isn't.";
  }
  if (other.polite !== correct.polite) {
    return other.polite
      ? "It is polite, but this sentence is in the plain register."
      : "It is plain, but this sentence is polite.";
  }
  return `It is ${patternContrast(otherType)}, which this sentence doesn't call for.`;
}

export type ConjugationExample = { from: string; to: string };

export type Explanation = {
  /** 書く → 書きます */
  headline: string;
  /** Short rule steps, each one line. */
  steps: string[];
  /** One-line summary of what the answer says. */
  summary: string;
  /** Why each other choice fails, keyed by the surfaced form. */
  others: { form: string; why: string }[];
  /** Compact sound change, e.g. く → き + ます. */
  transform: string;
  /** Other verbs/adjectives that follow the same rule. */
  examples: ConjugationExample[];
  /** Optional progressive hints: context, word group, then the rule. */
  hints: string[];
};

function lastGodanEnding(dict: string) {
  const last = Array.from(dict).slice(-1)[0] ?? "";
  return (GODAN_ENDINGS as readonly string[]).includes(last)
    ? (last as (typeof GODAN_ENDINGS)[number])
    : null;
}

function godanSteps(dict: string, formType: string): string[] | null {
  const last = lastGodanEnding(dict);
  if (!last) return null;
  const row = GODAN_ROW[last];
  const teEnd = GODAN_TE[last];
  const taEnd = teEnd.replace("て", "た").replace("で", "だ");
  const intro = `${dict} is a Godan (う-verb).`;

  switch (formType) {
    case "masu":
      return [intro, `Change the final ${last} to ${row.i}.`, "Add ます.", "Polite non-past."];
    case "masu_negative":
      return [intro, `Change the final ${last} to ${row.i}.`, "Add ません.", "Polite negative non-past."];
    case "masu_past":
      return [intro, `Change the final ${last} to ${row.i}.`, "Add ました.", "Polite past."];
    case "masu_past_negative":
      return [
        intro,
        `Change the final ${last} to ${row.i}.`,
        "Add ませんでした.",
        "Polite negative past.",
      ];
    case "te":
      return [intro, `Use the te-form ending ${teEnd}.`, "This ending follows the sound change for 「" + last + "」."];
    case "plain_negative":
      return [intro, `Change the final ${last} to ${row.a}.`, "Add ない.", "Plain negative non-past."];
    case "plain_past":
      return [intro, `Use the past ending ${taEnd}.`, "It matches the te-form's sound change."];
    case "plain_past_negative":
      return [intro, `Change the final ${last} to ${row.a}.`, "Add なかった.", "Plain negative past."];
    default:
      return null;
  }
}

const ICHIDAN_ENDINGS: Record<string, string> = {
  masu: "ます",
  masu_negative: "ません",
  masu_past: "ました",
  masu_past_negative: "ませんでした",
  te: "て",
  plain_negative: "ない",
  plain_past: "た",
  plain_past_negative: "なかった",
};

function ichidanSteps(dict: string, formType: string): string[] | null {
  const ending = ICHIDAN_ENDINGS[formType];
  if (!ending) return null;
  return [`${dict} is an Ichidan (る-verb).`, "Drop the final る.", `Add ${ending}.`];
}

function iAdjSteps(dict: string, formType: string): string[] | null {
  const intro = `${dict} is an い-adjective.`;
  switch (formType) {
    case "masu":
      return [intro, "Keep the final い.", "Add です.", "Polite non-past."];
    case "negative":
      return [intro, "Drop the final い.", "Add くない.", "Add です to stay polite."];
    case "past":
      return [intro, "Drop the final い.", "Add かった.", "Add です to stay polite."];
    case "past_negative":
      return [intro, "Drop the final い.", "Add くなかった.", "Add です to stay polite."];
    default:
      return null;
  }
}

function naAdjSteps(dict: string, formType: string): string[] | null {
  const intro = `${dict} is a な-adjective.`;
  switch (formType) {
    case "masu":
      return [intro, `Use the stem ${dict}.`, "Add です.", "Polite non-past."];
    case "negative":
      return [intro, `Use the stem ${dict}.`, "Add じゃない.", "Add です to stay polite."];
    case "past":
      return [intro, `Use the stem ${dict}.`, "Add だった.", "Plain past."];
    case "past_negative":
      return [intro, `Use the stem ${dict}.`, "Add じゃなかった.", "Add です to stay polite."];
    default:
      return null;
  }
}

function ruleSteps(target: ConjugableTarget, dict: string, formType: string): string[] {
  const group = groupFor(target);
  if (group === "godan") {
    return godanSteps(dict, formType) ?? [];
  }
  if (group === "ichidan") {
    return ichidanSteps(dict, formType) ?? [];
  }
  if (group === "i-adj") {
    return iAdjSteps(dict, formType) ?? [];
  }
  if (group === "na-adj") {
    return naAdjSteps(dict, formType) ?? [];
  }
  if (group === "suru") {
    return ["する is an irregular verb.", `する → ${"this form"} — memorise the pair.`];
  }
  if (group === "kuru") {
    return ["来る is an irregular verb.", "The stem changes with the form — memorise the pair."];
  }
  return ["This word has a stored form.", "Learn the pair as a set."];
}

const CONTEXT_HINTS: Record<string, string> = {
  masu: "The sentence is about a current state or habit, so it needs a non-past form.",
  masu_negative: "ぜんぜん is followed by a negative expression.",
  masu_past: "きのう places the action in the past.",
  masu_past_negative: "きのうは places it in the past, and the meaning is negative.",
  te: "ください marks a request, which needs a te-form.",
  plain_negative: "ぜんぜん is followed by a negative expression.",
  plain_past: "きのう places the action in the past.",
  plain_past_negative: "きのうは places it in the past, and the meaning is negative.",
  negative: "The sentence describes a negative state.",
  past: "The sentence describes a state in the past.",
  past_negative: "The sentence describes a negative state in the past.",
};

const GROUP_HINTS: Record<string, string> = {
  godan: "This is a Group 1 (Godan) verb: its final sound moves across the あ/い/う/え/お rows.",
  ichidan: "This is a Group 2 (Ichidan) verb: drop the final る before adding the ending.",
  "i-adj": "This is an い-adjective: the final い changes with the form.",
  "na-adj": "This is a な-adjective: keep the stem and change the ending.",
  suru: "する is irregular: memorise its forms.",
  kuru: "来る is irregular: memorise its forms.",
  irregular: "This verb is irregular: memorise the pair.",
};

const VERB_EXAMPLES: Record<string, ConjugationExample[]> = {
  masu: [
    { from: "書く", to: "書きます" },
    { from: "食べる", to: "食べます" },
    { from: "する", to: "します" },
  ],
  masu_negative: [
    { from: "書く", to: "書きません" },
    { from: "食べる", to: "食べません" },
    { from: "する", to: "しません" },
  ],
  masu_past: [
    { from: "書く", to: "書きました" },
    { from: "食べる", to: "食べました" },
    { from: "する", to: "しました" },
  ],
  masu_past_negative: [
    { from: "書く", to: "書きませんでした" },
    { from: "食べる", to: "食べませんでした" },
    { from: "する", to: "しませんでした" },
  ],
  te: [
    { from: "書く", to: "書いて" },
    { from: "食べる", to: "食べて" },
    { from: "する", to: "して" },
  ],
  plain_negative: [
    { from: "話す", to: "話さない" },
    { from: "書く", to: "書かない" },
    { from: "読む", to: "読まない" },
    { from: "飲む", to: "飲まない" },
  ],
  plain_past: [
    { from: "書く", to: "書いた" },
    { from: "食べる", to: "食べた" },
    { from: "する", to: "した" },
  ],
  plain_past_negative: [
    { from: "書く", to: "書かなかった" },
    { from: "食べる", to: "食べなかった" },
    { from: "する", to: "しなかった" },
  ],
};

const I_ADJ_EXAMPLES: Record<string, ConjugationExample[]> = {
  masu: [
    { from: "高い", to: "高いです" },
    { from: "おいしい", to: "おいしいです" },
    { from: "忙しい", to: "忙しいです" },
  ],
  negative: [
    { from: "高い", to: "高くない" },
    { from: "おいしい", to: "おいしくない" },
    { from: "忙しい", to: "忙しくない" },
  ],
  past: [
    { from: "高い", to: "高かった" },
    { from: "おいしい", to: "おいしかった" },
    { from: "忙しい", to: "忙しかった" },
  ],
  past_negative: [
    { from: "高い", to: "高くなかった" },
    { from: "おいしい", to: "おいしくなかった" },
    { from: "忙しい", to: "忙しくなかった" },
  ],
};

const NA_ADJ_EXAMPLES: Record<string, ConjugationExample[]> = {
  masu: [
    { from: "静か", to: "静かです" },
    { from: "元気", to: "元気です" },
    { from: "便利", to: "便利です" },
  ],
  negative: [
    { from: "静か", to: "静かじゃない" },
    { from: "元気", to: "元気じゃない" },
    { from: "便利", to: "便利じゃない" },
  ],
  past: [
    { from: "静か", to: "静かだった" },
    { from: "元気", to: "元気だった" },
    { from: "便利", to: "便利だった" },
  ],
  past_negative: [
    { from: "静か", to: "静かじゃなかった" },
    { from: "元気", to: "元気じゃなかった" },
    { from: "便利", to: "便利じゃなかった" },
  ],
};

/** Other examples that follow the same rule, preferring words other than the current one. */
export function examplesFor(target: ConjugableTarget, formType: string): ConjugationExample[] {
  const group = groupFor(target);
  const table =
    group === "i-adj" ? I_ADJ_EXAMPLES : group === "na-adj" ? NA_ADJ_EXAMPLES : VERB_EXAMPLES;
  const examples = table[formType] ?? [];
  const others = examples.filter((item) => item.from !== target.word);
  return others.length > 0 ? others : examples;
}

/** The one-line sound change shown under the answer. */
export function transformFor(target: ConjugableTarget, formType: string): string | null {
  const group = groupFor(target);
  if (group === "godan") {
    const last = lastGodanEnding(target.word);
    if (!last) return null;
    const row = GODAN_ROW[last];
    const teEnd = GODAN_TE[last];
    const taEnd = teEnd.replace("て", "た").replace("で", "だ");
    switch (formType) {
      case "masu":
        return `${last} → ${row.i} + ます`;
      case "masu_negative":
        return `${last} → ${row.i} + ません`;
      case "masu_past":
        return `${last} → ${row.i} + ました`;
      case "masu_past_negative":
        return `${last} → ${row.i} + ませんでした`;
      case "te":
        return `${last} → ${teEnd}`;
      case "plain_negative":
        return `${last} → ${row.a} + ない`;
      case "plain_past":
        return `${last} → ${taEnd}`;
      case "plain_past_negative":
        return `${last} → ${row.a} + なかった`;
      default:
        return null;
    }
  }
  if (group === "ichidan") {
    const ending = ICHIDAN_ENDINGS[formType];
    return ending ? `る → ${ending}` : null;
  }
  if (group === "i-adj") {
    switch (formType) {
      case "masu":
        return "い + です";
      case "negative":
        return "い → くない";
      case "past":
        return "い → かった";
      case "past_negative":
        return "い → くなかった";
      default:
        return null;
    }
  }
  if (group === "na-adj") {
    switch (formType) {
      case "masu":
        return "stem + です";
      case "negative":
        return "stem + じゃない";
      case "past":
        return "stem + だった";
      case "past_negative":
        return "stem + じゃなかった";
      default:
        return null;
    }
  }
  if (group === "suru" || group === "kuru" || group === "irregular") {
    return "irregular — memorise the pair";
  }
  return null;
}

function hintsFor(
  target: ConjugableTarget,
  formType: string,
  rawSteps: string[]
): string[] {
  const context =
    CONTEXT_HINTS[formType] ?? "The sentence's time and meaning decide the tense and polarity.";
  const group = groupFor(target);
  const grammar = group ? GROUP_HINTS[group] : "Identify the word class first.";
  const mechanics = rawSteps
    .slice(1)
    .filter((step) => step !== `${patternLabel(formType)}.`)
    .map((step) => step.replace("this form", "the target form"))
    .join(" ");
  return mechanics ? [context, grammar, mechanics] : [context, grammar];
}

export function explainConjugation(input: {
  target: ConjugableTarget;
  formType: string;
  form: string;
  dictionaryForm?: string;
  choices?: { text: string; formType?: string }[];
}): Explanation {
  const dictionary = input.dictionaryForm ?? input.target.word;
  const rawSteps = ruleSteps(input.target, dictionary, input.formType);
  const steps = rawSteps.map((step) => step.replace("this form", input.form));
  const summary = patternLabel(input.formType).toLowerCase();
  const others = (input.choices ?? [])
    .filter((choice) => choice.formType && choice.text !== input.form)
    .map((choice) => ({
      form: choice.text,
      why: whyWrong(input.formType, choice.formType as string),
    }));

  return {
    headline: `${dictionary} → ${input.form}`,
    steps: [...steps, `Result: ${input.form} (${summary}).`],
    summary,
    others,
    transform: transformFor(input.target, input.formType) ?? "",
    examples: examplesFor(input.target, input.formType),
    hints: hintsFor(input.target, input.formType, rawSteps),
  };
}

/** Curated near-miss distractors: the mistakes learners actually make. */
const DISTRACTOR_TYPES: Record<string, string[]> = {
  // "masu" is shared by verbs and adjectives, so both families are offered and
  // the ones the word doesn't have are skipped.
  masu: [
    "masu_past",
    "masu_negative",
    "masu_past_negative",
    "negative",
    "past",
    "past_negative",
  ],
  masu_negative: ["masu", "masu_past", "masu_past_negative"],
  masu_past: ["masu", "masu_negative", "masu_past_negative"],
  masu_past_negative: ["masu", "masu_past", "masu_negative"],
  te: ["plain_past", "masu", "plain_negative"],
  plain_negative: ["plain_past", "masu_negative", "plain_past_negative"],
  plain_past: ["te", "plain_negative", "plain_past_negative"],
  plain_past_negative: ["plain_past", "plain_negative", "te"],
  negative: ["masu", "past", "past_negative"],
  past: ["masu", "negative", "past_negative"],
  past_negative: ["past", "negative", "masu"],
};

/**
 * Three distractors for a pattern, preferring the curated near-misses, then
 * leftover forms in the same register. Never mixes in forms that would make a
 * second answer defensible (e.g. both polite and plain of the same tense).
 */
export function distractorTypes(formType: string, available: string[]): string[] {
  const wanted = DISTRACTOR_TYPES[formType] ?? [];
  const picked: string[] = [];
  for (const type of wanted) {
    if (type === formType) continue;
    if (!available.includes(type)) continue;
    if (picked.includes(type)) continue;
    picked.push(type);
    if (picked.length === 3) break;
  }
  if (picked.length < 3) {
    const correct = patternAttrs(formType);
    for (const type of available) {
      if (type === formType || picked.includes(type)) continue;
      const attrs = patternAttrs(type);
      if (attrs.polite !== correct.polite || attrs.past !== correct.past) continue;
      picked.push(type);
      if (picked.length === 3) break;
    }
  }
  return picked;
}
