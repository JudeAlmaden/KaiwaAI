import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { type CachedToken } from "@/lib/types";
import { lookupWordBySurface } from "@/lib/conjugation-generator";
import { FlashcardStatus } from "@/generated/prisma/client";
import { sanitizeString } from "@/lib/sanitize";
import { flashcardLimiter } from "@/lib/rate-limiter";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const wordsOnly = url.searchParams.get("wordsOnly") === "true";

  // Fast query for just the word list (used for chat vocabulary checks)
  if (wordsOnly) {
    const userFlashcards = await prisma.userFlashcard.findMany({
      where: { userId: user.id },
      include: {
        word: true,
        wordForm: true,
        phrase: true,
      },
    });
    const words = userFlashcards.map((uf) => ({
      word: uf.phrase?.text || uf.word?.dictionary || "",
      meaning: uf.phrase?.meanings || uf.word?.meanings || "[]",
      form: uf.wordForm?.form,
    }));
    return NextResponse.json({ words });
  }

  const where: { userId: string; status?: FlashcardStatus } = { userId: user.id };
  if (status && ["new", "learning", "known"].includes(status)) {
    where.status = status as FlashcardStatus;
  }

  const cards = await prisma.userFlashcard.findMany({
    where,
    include: {
      word: true,
      wordForm: true,
      phrase: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Format for compatibility with old API
  const formattedCards = cards.map((card) => {
    // Handle both words and phrases
    let word: string;
    let reading: string;
    let meanings: string[] = [];
    let partOfSpeech: string;

    if (card.phrase) {
      // It's a phrase
      word = card.phrase.text;
      reading = card.phrase.reading;
      try {
        meanings = JSON.parse(card.phrase.meanings);
      } catch {
        meanings = [card.phrase.meanings];
      }
      partOfSpeech = card.phrase.partOfSpeech;
    } else if (card.word) {
      // It's a dictionary word
      word = card.wordForm?.form || card.word.dictionary;
      reading = card.wordForm?.reading || card.word.reading;
      try {
        meanings = JSON.parse(card.word.meanings);
      } catch {
        meanings = [card.word.meanings];
      }
      partOfSpeech = card.word.partOfSpeech;
    } else {
      // Shouldn't happen, but handle gracefully
      word = "Unknown";
      reading = "Unknown";
      meanings = ["Unknown"];
      partOfSpeech = "unknown";
    }

    return {
      id: card.id,
      word,
      reading,
      meaning: meanings.join("; "),
      partOfSpeech,
      status: card.status,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      timesReviewed: card.timesReviewed,
      exposures: card.exposures,
      nextReview: card.nextReview,
      lastReviewedAt: card.lastReviewedAt,
      createdAt: card.createdAt,
      note: card.note,
      isPhrase: Boolean(card.phrase),
      formType: card.wordForm?.formType ?? null,
      wordId: card.wordId ?? null,
      dictionary: card.word?.dictionary ?? null,
    };
  });

  return NextResponse.json({ cards: formattedCards });
}


// Add a word/form to user's flashcards using the new dictionary system.
// Accepts either:
// 1. token + dictForm → lookup in Word table
// 2. wordId + wordFormId → direct add
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (flashcardLimiter.isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many flashcard operations. Please slow down." },
      { status: 429 }
    );
  }

  let body: {
    token?: CachedToken;
    word?: {
      word: string;
      reading: string;
      romaji: string;
      meaning: string;
      pos: string;
    };
    wordId?: number;
    wordFormId?: string | null;
    wordFormIds?: string[];
    baseOnly?: boolean;
    sourceMessageId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Normalize LookupBox direct addition (body.word) to body.token
  if (body.word && !body.token) {
    body.token = {
      surface: body.word.word,
      reading: body.word.reading,
      romaji: body.word.romaji || "",
      meaning: body.word.meaning,
      pos: body.word.pos as CachedToken["pos"],
      dictForm: body.word.word,
    };
  }

  let wordId: number | null = null;
  let wordFormId: string | null = null;

  // Keep only the dictionary/base card for a word and remove all of its
  // conjugation cards.
  if (body.baseOnly) {
    if (!Number.isInteger(body.wordId)) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 });
    }

    const word = await prisma.word.findUnique({ where: { id: body.wordId } });
    if (!word) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    await prisma.userFlashcard.deleteMany({
      where: { userId: user.id, wordId: body.wordId, wordFormId: { not: null } },
    });

    const baseCard = await prisma.userFlashcard.findFirst({
      where: { userId: user.id, wordId: body.wordId, wordFormId: null },
    });
    if (!baseCard) {
      await prisma.userFlashcard.create({
        data: { userId: user.id, wordId: body.wordId, status: FlashcardStatus.learning },
      });
    }

    return NextResponse.json({ baseOnly: true });
  }

  // Batch-add every available form for a word. This is one request so adding a
  // full conjugation set does not trip the per-card rate limit.
  if (body.wordFormIds !== undefined) {
    if (
      !Number.isInteger(body.wordId) ||
      !Array.isArray(body.wordFormIds) ||
      body.wordFormIds.length === 0 ||
      body.wordFormIds.length > 20 ||
      body.wordFormIds.some((id) => typeof id !== "string" || id.length > 50)
    ) {
      return NextResponse.json({ error: "Invalid word forms" }, { status: 400 });
    }

    const formIds = [...new Set(body.wordFormIds)];
    const wordForms = await prisma.wordForm.findMany({
      where: { wordId: body.wordId, id: { in: formIds } },
      select: { id: true },
    });
    if (wordForms.length !== formIds.length) {
      return NextResponse.json({ error: "One or more forms were not found" }, { status: 404 });
    }

    // For regular verbs (godan/ichidan) and regular adjectives (i/na), the
    // base-word insert path already auto-creates all conjugated flashcards in
    // one shot, so the batch button in chat has been hidden for those types.
    // If any caller still reaches this path redundantly, first ensure the
    // BASE card (wordFormId = null) exists so `getAppBlockerConfig / rules
    // counts / ReviewClient savedWords.has()` etc. don't report a partially
    // saved deck — then fall through to createMany (still skipDupes safe).
    const wordForBatch = await prisma.word.findUnique({
      where: { id: body.wordId },
      select: {
        id: true,
        dictionary: true,
        verbType: true,
        adjectiveType: true,
        partOfSpeech: true,
      },
    });
    if (wordForBatch) {
      const baseCard = await prisma.userFlashcard.findFirst({
        where: { userId: user.id, wordId: body.wordId, wordFormId: null },
      });
      if (!baseCard) {
        await prisma.userFlashcard.create({
          data: {
            userId: user.id,
            wordId: body.wordId!,
            status: FlashcardStatus.learning,
          },
        });
      }
      try {
        const { autoAddKanjiFromWord } = await import("@/lib/auto-add-kanji");
        await autoAddKanjiFromWord(user.id, wordForBatch.dictionary);
      } catch (error) {
        console.error("Failed to auto-add kanji:", error);
      }
    }

    const result = await prisma.userFlashcard.createMany({
      data: wordForms.map((form) => ({
        userId: user.id,
        wordId: body.wordId!,
        wordFormId: form.id,
        status: FlashcardStatus.learning,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ added: result.count, formIds });
  }

  // Case 1: Adding from a token (chat tap-to-add or normalized LookupBox)
  if (body.token) {
    const token = body.token;

    // Strict input length validation
    if (
      (token.dictForm && token.dictForm.length > 100) ||
      (token.surface && token.surface.length > 100) ||
      (token.reading && token.reading.length > 100) ||
      (token.meaning && token.meaning.length > 500) ||
      (token.romaji && token.romaji.length > 500)
    ) {
      return NextResponse.json({ error: "Invalid token inputs (too long)" }, { status: 400 });
    }

    const dictForm = sanitizeString(token.dictForm);
    const cleanSurface = sanitizeString(token.surface);
    const cleanReading = sanitizeString(token.reading ?? dictForm);
    const cleanMeaning = sanitizeString(token.meaning ?? "");

    // Lookup word in dictionary
    let word = await lookupWordBySurface(dictForm);

    // Not in dictionary – seed it from the token metadata so we can save it
    if (!word) {
      const POS_MAP: Record<string, string> = {
        noun: "noun", verb: "verb", adjective: "adjective",
        adverb: "adverb", particle: "particle", conjunction: "conjunction",
        interjection: "interjection", expression: "expression",
        phrase: "phrase", pronoun: "pronoun", counter: "counter",
        suffix: "suffix", prefix: "prefix", auxiliary: "auxiliary",
        copula: "copula", other: "unclassified",
      };
      const partOfSpeech = (POS_MAP[(token.pos ?? "").toLowerCase()] ?? "unclassified") as
        | "noun" | "verb" | "adjective" | "adverb" | "particle" | "conjunction"
        | "interjection" | "expression" | "phrase" | "pronoun" | "counter"
        | "suffix" | "prefix" | "auxiliary" | "copula" | "unclassified";

      try {
        // Compute a negative ID that won't collide with JMdict integer IDs
        const agg = await prisma.word.aggregate({ _min: { id: true } });
        const nextId = Math.min(((agg._min.id ?? 0) as number) - 1, -1);

        word = await prisma.word.create({
          data: {
            id: nextId,
            dictionary: dictForm,
            reading: cleanReading,
            meanings: JSON.stringify(cleanMeaning ? [cleanMeaning] : ["(no definition)"]),
            partOfSpeech,
            aiGenerated: true,
          },
          include: { forms: true },
        });
      } catch {
        // Duplicate key race – re-fetch
        word = await lookupWordBySurface(dictForm);
      }
    }

    if (!word) {
      return NextResponse.json(
        { error: "Could not seed word into dictionary" },
        { status: 500 }
      );
    }

    wordId = word.id;

    // Try to find the exact form that was tapped
    const matchingForm = word.forms.find(
      (f) => f.form === cleanSurface || f.reading === cleanReading
    );
    
    // If surface matches a specific conjugation, save that form
    // Otherwise, save the base word (wordFormId = null)
    wordFormId = matchingForm?.id || null;
  } 
  // Case 2: Direct add (from dictionary page)
  else if (body.wordId !== undefined) {
    wordId = body.wordId;
    if (body.wordFormId && body.wordFormId.length > 50) {
      return NextResponse.json({ error: "Invalid wordFormId" }, { status: 400 });
    }
    wordFormId = body.wordFormId || null;
  } 
  else {
    return NextResponse.json(
      { error: "Missing token or wordId" },
      { status: 400 }
    );
  }

  if (!wordId) {
    return NextResponse.json({ error: "Invalid word" }, { status: 400 });
  }

  // Load the full word record (with forms) once so we can decide whether to
  // auto-insert conjugations for verbs/adjectives and avoid re-fetching below.
  const wordRecord = await prisma.word.findUnique({
    where: { id: wordId },
    include: { forms: true },
  });

  // Check if already exists (the single card the caller asked for)
  const existing = await prisma.userFlashcard.findUnique({
    where: {
      userId_wordFormId: {
        userId: user.id,
        wordFormId: wordFormId || "",
      },
    },
  });

  const alreadyExisted = !!existing;
  let card = existing;

  if (!card) {
    card = await prisma.userFlashcard.create({
      data: {
        userId: user.id,
        wordId,
        wordFormId,
        status: FlashcardStatus.learning,
      },
      include: {
        word: true,
        wordForm: true,
      },
    });
  }

  const addedConjugations = 0;

  // Auto-add kanji from this word to the user's review queue
  if (wordRecord) {
    try {
      const { autoAddKanjiFromWord } = await import("@/lib/auto-add-kanji");
      await autoAddKanjiFromWord(user.id, wordRecord.dictionary);
    } catch (error) {
      console.error("Failed to auto-add kanji:", error);
    }
  }

  return NextResponse.json({
    card,
    alreadyExisted,
    meaningMerged: false,
    addedConjugations,
  });
}
