/**
 * Generate conjugations for Japanese verbs and adjectives.
 * Called on-demand when a word's forms don't exist in the database.
 */

import { prisma } from "./prisma";
import { VerbType, AdjectiveType } from "@/generated/prisma/client";

interface ConjugationRule {
  formType: string;
  stemChange: (stem: string, lastChar: string) => string;
  ending: string;
}

// Godan verb conjugation rules (u-verbs)
const GODAN_RULES: ConjugationRule[] = [
  {
    formType: "masu",
    stemChange: (stem, last) => stem + conjugateGodan(last, "i"),
    ending: "ます",
  },
  {
    formType: "masu_negative",
    stemChange: (stem, last) => stem + conjugateGodan(last, "i"),
    ending: "ません",
  },
  {
    formType: "masu_past",
    stemChange: (stem, last) => stem + conjugateGodan(last, "i"),
    ending: "ました",
  },
  {
    formType: "masu_past_negative",
    stemChange: (stem, last) => stem + conjugateGodan(last, "i"),
    ending: "ませんでした",
  },
  {
    formType: "te",
    stemChange: (stem, last) => stem + conjugateGodanTe(last),
    ending: "",
  },
  {
    formType: "plain_negative",
    stemChange: (stem, last) => stem + conjugateGodan(last, "a"),
    ending: "ない",
  },
  {
    formType: "plain_past",
    stemChange: (stem, last) => stem + conjugateGodanTa(last),
    ending: "",
  },
  {
    formType: "plain_past_negative",
    stemChange: (stem, last) => stem + conjugateGodan(last, "a"),
    ending: "なかった",
  },
];

// Ichidan verb conjugation rules (ru-verbs)
const ICHIDAN_RULES: ConjugationRule[] = [
  { formType: "masu", stemChange: (stem) => stem, ending: "ます" },
  { formType: "masu_negative", stemChange: (stem) => stem, ending: "ません" },
  { formType: "masu_past", stemChange: (stem) => stem, ending: "ました" },
  { formType: "masu_past_negative", stemChange: (stem) => stem, ending: "ませんでした" },
  { formType: "te", stemChange: (stem) => stem, ending: "て" },
  { formType: "plain_negative", stemChange: (stem) => stem, ending: "ない" },
  { formType: "plain_past", stemChange: (stem) => stem, ending: "た" },
  { formType: "plain_past_negative", stemChange: (stem) => stem, ending: "なかった" },
];

// I-adjective conjugation rules
const I_ADJECTIVE_RULES: ConjugationRule[] = [
  { formType: "masu", stemChange: (stem) => stem, ending: "いです" },
  { formType: "negative", stemChange: (stem) => stem, ending: "くない" },
  { formType: "past", stemChange: (stem) => stem, ending: "かった" },
  { formType: "past_negative", stemChange: (stem) => stem, ending: "くなかった" },
];

// Na-adjective conjugation rules
const NA_ADJECTIVE_RULES: ConjugationRule[] = [
  { formType: "masu", stemChange: (stem) => stem, ending: "です" },
  { formType: "negative", stemChange: (stem) => stem, ending: "じゃない" },
  { formType: "past", stemChange: (stem) => stem, ending: "だった" },
  { formType: "past_negative", stemChange: (stem) => stem, ending: "じゃなかった" },
];

function conjugateGodan(lastChar: string, rowVowel: string): string {
  const godanMap: Record<string, Record<string, string>> = {
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
  return godanMap[lastChar]?.[rowVowel] || lastChar;
}

function conjugateGodanTe(lastChar: string): string {
  const teMap: Record<string, string> = {
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
  return teMap[lastChar] || "て";
}

function conjugateGodanTa(lastChar: string): string {
  return conjugateGodanTe(lastChar).replace("て", "た").replace("で", "だ");
}

export async function generateConjugations(wordId: number) {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: { forms: true },
  });

  if (!word) {
    throw new Error(`Word ${wordId} not found`);
  }

  // If forms already exist, return them
  if (word.forms.length > 0) {
    return word.forms;
  }

  const forms: Array<{
    wordId: number;
    form: string;
    reading: string;
    formType: string;
    generated: boolean;
  }> = [];

  // Always add dictionary form
  forms.push({
    wordId: word.id,
    form: word.dictionary,
    reading: word.reading,
    formType: "dictionary",
    generated: false,
  });

  // Generate based on part of speech
  if (word.verbType === VerbType.godan) {
    const stem = word.dictionary.slice(0, -1);
    const lastChar = word.dictionary.slice(-1);
    const readingStem = word.reading.slice(0, -1);
    const lastReadingChar = word.reading.slice(-1);

    for (const rule of GODAN_RULES) {
      const formKanji = rule.stemChange(stem, lastChar) + rule.ending;
      const formReading = rule.stemChange(readingStem, lastReadingChar) + rule.ending;
      forms.push({
        wordId: word.id,
        form: formKanji,
        reading: formReading,
        formType: rule.formType,
        generated: true,
      });
    }
  } else if (word.verbType === VerbType.ichidan) {
    const stem = word.dictionary.slice(0, -1); // Remove る
    const readingStem = word.reading.slice(0, -1);

    for (const rule of ICHIDAN_RULES) {
      const formKanji = rule.stemChange(stem) + rule.ending;
      const formReading = rule.stemChange(readingStem) + rule.ending;
      forms.push({
        wordId: word.id,
        form: formKanji,
        reading: formReading,
        formType: rule.formType,
        generated: true,
      });
    }
  } else if (word.adjectiveType === AdjectiveType.i_adjective) {
    const stem = word.dictionary.slice(0, -1); // Remove い
    const readingStem = word.reading.slice(0, -1);

    for (const rule of I_ADJECTIVE_RULES) {
      const formKanji = rule.stemChange(stem) + rule.ending;
      const formReading = rule.stemChange(readingStem) + rule.ending;
      forms.push({
        wordId: word.id,
        form: formKanji,
        reading: formReading,
        formType: rule.formType,
        generated: true,
      });
    }
  } else if (word.adjectiveType === AdjectiveType.na_adjective) {
    for (const rule of NA_ADJECTIVE_RULES) {
      const formKanji = rule.stemChange(word.dictionary) + rule.ending;
      const formReading = rule.stemChange(word.reading) + rule.ending;
      forms.push({
        wordId: word.id,
        form: formKanji,
        reading: formReading,
        formType: rule.formType,
        generated: true,
      });
    }
  }

  // Insert all forms into database
  for (const form of forms) {
    await prisma.wordForm.create({
      data: form,
    });
  }

  return forms;
}

/**
 * Lookup a word by surface form, checking both Word.dictionary and WordForm.form
 */
export async function lookupWordBySurface(surface: string) {
  // First try exact match on dictionary form
  let word = await prisma.word.findUnique({
    where: { dictionary: surface },
    include: { forms: true },
  });

  if (word) {
    if (word.forms.length === 0) {
      // Generate forms on-demand
      await generateConjugations(word.id);
      word = await prisma.word.findUnique({
        where: { id: word.id },
        include: { forms: true },
      });
    }
    return word;
  }

  // If not found, try to find by word form
  const wordForm = await prisma.wordForm.findFirst({
    where: { form: surface },
    include: {
      word: {
        include: { forms: true },
      },
    },
  });

  if (wordForm) {
    if (wordForm.word.forms.length === 0) {
      await generateConjugations(wordForm.word.id);
      return await prisma.word.findUnique({
        where: { id: wordForm.word.id },
        include: { forms: true },
      });
    }
    return wordForm.word;
  }

  return null;
}
