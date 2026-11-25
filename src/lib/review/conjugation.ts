/**
 * The SRS conjugation forms, shared by the cheat-sheet and Sentence Forge.
 * These are the same formTypes stored in WordForm, so the app has one source
 * of truth for what a "form" is. Not a full Japanese conjugation engine.
 */

export type GodanEnding = "う" | "く" | "ぐ" | "す" | "つ" | "ぬ" | "ぶ" | "む" | "る";

export const GODAN_ROW: Record<GodanEnding, Record<string, string>> = {
  う: { a: "わ", i: "い", u: "う", e: "え", o: "お" },
  く: { a: "か", i: "き", u: "く", e: "け", o: "こ" },
  ぐ: { a: "が", i: "ぎ", u: "ぐ", e: "げ", o: "ご" },
  す: { a: "さ", i: "し", u: "す", e: "せ", o: "そ" },
  つ: { a: "た", i: "ち", u: "つ", e: "て", o: "と" },
  ぬ: { a: "な", i: "に", u: "ぬ", e: "ね", o: "の" },
  ぶ: { a: "ば", i: "び", u: "ぶ", e: "べ", o: "ぼ" },
  む: { a: "ま", i: "み", u: "む", e: "め", o: "も" },
  る: { a: "ら", i: "り", u: "る", e: "れ", o: "ろ" },
};

export const GODAN_TE: Record<GodanEnding, string> = {
  う: "って",
  つ: "って",
  る: "って",
  く: "いて",
  ぐ: "いで",
  ぬ: "んで",
  ぶ: "んで",
  む: "んで",
  す: "して",
};

export const GODAN_ENDINGS = ["う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る"] as const;

export type FormRow = {
  formType: string;
  label: string;
  result: string;
  rule: string;
};

function stemOf(dict: string, strip: number): string {
  return Array.from(dict).slice(0, -strip).join("");
}

function lastChar<T extends string>(dict: string, allowed: readonly T[]): T | null {
  const last = Array.from(dict).slice(-1)[0] || "";
  return allowed.includes(last as T) ? (last as T) : null;
}

export function buildGodan(dict: string): FormRow[] | { error: string } {
  const last = lastChar(dict, GODAN_ENDINGS);
  if (!last) return { error: "Godan verbs must end in one of う / く / ぐ / す / つ / ぬ / ぶ / む / る" };
  const stem = stemOf(dict, 1);
  const row = GODAN_ROW[last];
  const teEnd = GODAN_TE[last];
  const taEnd = teEnd.replace("て", "た").replace("で", "だ");
  const aRow = row["a"];
  const iRow = row["i"];
  return [
    { formType: "dictionary", label: "Dictionary (base)", result: dict, rule: "Ends in -u sound (う/く/ぐ/す/つ/ぬ/ぶ/む/る)" },
    { formType: "masu", label: "Polite non-past", result: stem + iRow + "ます", rule: `→ ${iRow}-row + ます` },
    { formType: "masu_negative", label: "Polite negative non-past", result: stem + iRow + "ません", rule: `→ ${iRow}-row + ません` },
    { formType: "masu_past", label: "Polite past", result: stem + iRow + "ました", rule: `→ ${iRow}-row + ました` },
    { formType: "masu_past_negative", label: "Polite past neg.", result: stem + iRow + "ませんでした", rule: `→ ${iRow}-row + ませんでした` },
    { formType: "te", label: "Te-form", result: stem + teEnd, rule: `→ ${teEnd} (sound change rule for 「${last}」)` },
    { formType: "plain_negative", label: "Plain neg.", result: stem + aRow + "ない", rule: `→ ${aRow}-row + ない` },
    { formType: "plain_past", label: "Plain past", result: stem + taEnd, rule: `→ ${taEnd} (te-form て↔た)` },
    { formType: "plain_past_negative", label: "Plain past neg.", result: stem + aRow + "なかった", rule: `→ ${aRow}-row + なかった` },
  ];
}

export function buildIchidan(dict: string): FormRow[] | { error: string } {
  if (!dict.endsWith("る")) return { error: "Ichidan verbs always end in る (e.g. 食べる / 見る / 起きる)" };
  const stem = stemOf(dict, 1);
  return [
    { formType: "dictionary", label: "Dictionary (base)", result: dict, rule: "Always ends in る; prior syllable is usually i/e sound" },
    { formType: "masu", label: "Polite non-past", result: stem + "ます", rule: "Drop る → add ます" },
    { formType: "masu_negative", label: "Polite negative non-past", result: stem + "ません", rule: "Drop る → add ません" },
    { formType: "masu_past", label: "Polite past", result: stem + "ました", rule: "Drop る → add ました" },
    { formType: "masu_past_negative", label: "Polite past neg.", result: stem + "ませんでした", rule: "Drop る → add ませんでした" },
    { formType: "te", label: "Te-form", result: stem + "て", rule: "Drop る → add て" },
    { formType: "plain_negative", label: "Plain neg.", result: stem + "ない", rule: "Drop る → add ない" },
    { formType: "plain_past", label: "Plain past", result: stem + "た", rule: "Drop る → add た" },
    { formType: "plain_past_negative", label: "Plain past neg.", result: stem + "なかった", rule: "Drop る → add なかった" },
  ];
}

export function buildIAdj(dict: string): FormRow[] | { error: string } {
  if (!dict.endsWith("い")) return { error: "I-adjectives always end in い (e.g. 高い / 新しい)" };
  const stem = stemOf(dict, 1);
  return [
    { formType: "dictionary", label: "Dictionary (attributive)", result: dict, rule: "Ends in hiragana い (pronounced [i])" },
    { formType: "masu", label: "Polite predicate", result: dict + "です", rule: "…い + です (casual→polite)" },
    { formType: "negative", label: "Plain neg.", result: stem + "くない", rule: "Drop い → add くない" },
    { formType: "past", label: "Plain past", result: stem + "かった", rule: "Drop い → add かった" },
    { formType: "past_negative", label: "Plain past neg.", result: stem + "くなかった", rule: "Drop い → add くなかった" },
  ];
}

export function buildNaAdj(dict: string): FormRow[] | { error: string } {
  if (dict.length === 0) return { error: "Enter a na-adjective stem (e.g. 綺麗 / 静か / 有名)" };
  const stem = dict;
  return [
    { formType: "dictionary", label: "Dictionary / stem", result: stem, rule: "Stem only (no な / だ in dictionary form)" },
    { formType: "attributive", label: "Before a noun", result: stem + "な", rule: "Stem + な (e.g. 静かな場所)" },
    { formType: "masu", label: "Polite predicate", result: stem + "です", rule: "Stem + です (e.g. 静かです)" },
    { formType: "negative", label: "Plain neg.", result: stem + "じゃない", rule: "Stem + じゃない" },
    { formType: "past", label: "Plain past", result: stem + "だった", rule: "Stem + だった" },
    { formType: "past_negative", label: "Plain past neg.", result: stem + "じゃなかった", rule: "Stem + じゃなかった" },
  ];
}

export type ConjugableTarget = {
  word: string;
  reading?: string | null;
  partOfSpeech?: string | null;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: Array<{ form: string; reading?: string | null; formType: string }> | null;
};

export type TargetForm = {
  formType: string;
  label: string;
  form: string;
  reading: string;
  rule: string;
};

export type ConjugationCategory = "godan" | "ichidan" | "i-adj" | "na-adj" | "suru" | "kuru" | "irregular";

export function categoryFor(target: ConjugableTarget): "godan" | "ichidan" | "i-adj" | "na-adj" | null {
  if (target.partOfSpeech === "verb") {
    if (target.verbType === "godan") return "godan";
    if (target.verbType === "ichidan") return "ichidan";
    return null;
  }
  if (target.partOfSpeech === "adjective") {
    if (target.adjectiveType === "i_adjective") return "i-adj";
    if (target.adjectiveType === "na_adjective") return "na-adj";
    return target.word.endsWith("い") ? "i-adj" : "na-adj";
  }
  return null;
}

/** Category for explanations: generated groups plus the irregular verb types. */
export function groupFor(target: ConjugableTarget): ConjugationCategory | null {
  if (target.partOfSpeech === "verb") {
    if (target.verbType === "godan" || target.verbType === "ichidan") return target.verbType;
    if (target.verbType === "suru") return "suru";
    if (target.verbType === "kuru") return "kuru";
    if (target.verbType === "irregular") return "irregular";
    return null;
  }
  return categoryFor(target);
}

function buildFor(category: "godan" | "ichidan" | "i-adj" | "na-adj", text: string) {
  switch (category) {
    case "godan":
      return buildGodan(text);
    case "ichidan":
      return buildIchidan(text);
    case "i-adj":
      return buildIAdj(text);
    case "na-adj":
      return buildNaAdj(text);
  }
}

/**
 * Every form the SRS knows for this word: stored WordForms first, then the
 * shared builders for anything the database has not generated yet.
 */
export function formsForTarget(target: ConjugableTarget): TargetForm[] {
  const byType = new Map<string, TargetForm>();

  for (const stored of target.forms ?? []) {
    if (!stored.form) continue;
    byType.set(stored.formType, {
      formType: stored.formType,
      label: stored.formType === "dictionary" ? "Dictionary (base)" : stored.formType.replaceAll("_", " "),
      form: stored.form,
      reading: stored.reading || stored.form,
      rule: "",
    });
  }

  const category = categoryFor(target);
  if (category) {
    const surface = buildFor(category, target.word);
    const reading = target.reading && target.reading !== target.word ? buildFor(category, target.reading) : null;
    if (!("error" in surface)) {
      const readingByType = reading && !("error" in reading) ? new Map(reading.map((row) => [row.formType, row.result])) : null;
      for (const row of surface) {
        if (byType.has(row.formType)) continue;
        byType.set(row.formType, {
          formType: row.formType,
          label: row.label,
          form: row.result,
          reading: readingByType?.get(row.formType) ?? row.result,
          rule: row.rule,
        });
      }
    }
  }

  if (!byType.has("dictionary")) {
    byType.set("dictionary", {
      formType: "dictionary",
      label: "Dictionary (base)",
      form: target.word,
      reading: target.reading || target.word,
      rule: "",
    });
  }

  return Array.from(byType.values());
}
