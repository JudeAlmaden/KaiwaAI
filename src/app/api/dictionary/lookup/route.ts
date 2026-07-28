import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupWordBySurface, generateConjugations } from "@/lib/conjugation-generator";
import { sanitizeString } from "@/lib/sanitize";
import { lookupLimiter } from "@/lib/rate-limiter";
import { PartOfSpeech } from "@/generated/prisma/client";

/**
 * Lookup a word in the dictionary by dictionary form or surface form.
 * Returns the word entry, all conjugations, and user's flashcard status.
 *
 * Query params:
 * - dictForm: dictionary form (e.g., 飲む)
 * - surface:  surface form (e.g., 飲んだ) – will find base word
 * - metadata: JSON string { reading, meaning, pos } – used to seed missing words as Phrases
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (lookupLimiter.isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many lookups. Please slow down." },
      { status: 429 }
    );
  }

  const url = new URL(req.url);
  const dictForm = url.searchParams.get("dictForm");
  const surface  = url.searchParams.get("surface");
  const metadata = url.searchParams.get("metadata");

  if (!dictForm && !surface) {
    return NextResponse.json(
      { error: "Missing dictForm or surface parameter" },
      { status: 400 }
    );
  }

  if (dictForm && dictForm.length > 100) {
    return NextResponse.json({ error: "dictForm too long" }, { status: 400 });
  }
  if (surface && surface.length > 100) {
    return NextResponse.json({ error: "surface too long" }, { status: 400 });
  }

  try {
    let word;
    let phrase;

    if (dictForm) {
      // 1. Try exact match on dictionary form
      word = await prisma.word.findUnique({
        where: { dictionary: dictForm },
        include: { forms: true },
      });

      // 2. Not found in dictionary – check if user has it as a phrase
      if (!word) {
        phrase = await prisma.phrase.findUnique({
          where: {
            userId_text: {
              userId: user.id,
              text: dictForm,
            },
          },
        });
      }

      // 3. If dictForm lookup failed, try the surface form too (covers conjugated forms)
      if (!word && surface) {
        word = await lookupWordBySurface(surface);
      }

      // 4. Not in dictionary or phrases – prepare a transient representation (no DB writes on GET)
      if (!word && !phrase && metadata) {
        try {
          const { reading, meaning, pos } = JSON.parse(metadata) as {
            reading?: string;
            meaning?: string;
            pos?: string;
          };

          // Map AI POS string → Prisma enum value
          const POS_MAP: Record<string, string> = {
            noun: "noun", verb: "verb", adjective: "adjective",
            adverb: "adverb", particle: "particle", conjunction: "conjunction",
            interjection: "interjection", expression: "expression",
            phrase: "phrase", pronoun: "pronoun", counter: "counter",
            suffix: "suffix", prefix: "prefix", auxiliary: "auxiliary",
            copula: "copula",
          };
          const partOfSpeech = POS_MAP[(pos ?? "").toLowerCase()] ?? "unclassified";

          const cleanText = sanitizeString(dictForm).substring(0, 100);
          const cleanReading = sanitizeString(reading ?? dictForm).substring(0, 100);
          const cleanMeaning = sanitizeString(meaning ?? "").substring(0, 500);

          phrase = {
            id: "temp",
            userId: user.id,
            text: cleanText,
            reading: cleanReading,
            meanings: JSON.stringify(cleanMeaning ? [cleanMeaning] : ["(no definition)"]),
            partOfSpeech: partOfSpeech as PartOfSpeech,
            source: "ai_lookup",
            verified: false,
            reviewed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        } catch {
          phrase = null;
        }
      }

      // 4. Generate conjugations on-demand if it's a dictionary word with no forms
      if (word && word.forms.length === 0) {
        await generateConjugations(word.id);
        word = await prisma.word.findUnique({
          where: { id: word.id },
          include: { forms: true },
        });
      }
    } else if (surface) {
      word = await lookupWordBySurface(surface);
    }

    // Handle Phrase response
    if (phrase) {
      const userFlashcard = phrase.id === "temp"
        ? null
        : await prisma.userFlashcard.findUnique({
            where: {
              userId_phraseId: {
                userId: user.id,
                phraseId: phrase.id,
              },
            },
          });

      let meanings: string[] = [];
      try {
        meanings = JSON.parse(phrase.meanings);
      } catch {
        meanings = [phrase.meanings];
      }

      return NextResponse.json({
        type: "phrase",
        phrase: {
          id: phrase.id,
          text: phrase.text,
          reading: phrase.reading,
          meanings,
          partOfSpeech: phrase.partOfSpeech,
          source: phrase.source,
          verified: phrase.verified,
        },
        saved: Boolean(userFlashcard),
      });
    }

    // Handle Word response
    if (!word) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    // Check which forms the user has already added to flashcards
    const userFlashcards = await prisma.userFlashcard.findMany({
      where: { userId: user.id, wordId: word.id },
      include: { wordForm: true },
    });

    const savedFormIds = new Set(
      userFlashcards.map((uf) => uf.wordFormId).filter(Boolean) as string[]
    );

    let meanings: string[] = [];
    try {
      meanings = JSON.parse(word.meanings);
    } catch {
      meanings = [word.meanings];
    }

    return NextResponse.json({
      type: "word",
      word: {
        id: word.id,
        dictionary: word.dictionary,
        reading: word.reading,
        meanings,
        partOfSpeech: word.partOfSpeech,
        verbType: word.verbType,
        adjectiveType: word.adjectiveType,
        jlptLevel: word.jlptLevel,
        frequency: word.frequency,
      },
      forms: word.forms.map((f) => ({
        id: f.id,
        form: f.form,
        reading: f.reading,
        formType: f.formType,
        saved: savedFormIds.has(f.id),
      })),
      userHasBaseWord: userFlashcards.some((uf) => uf.wordFormId === null),
    });
  } catch (err) {
    console.error("Dictionary lookup error:", err);
    return NextResponse.json(
      { error: "Failed to lookup word" },
      { status: 500 }
    );
  }
}
