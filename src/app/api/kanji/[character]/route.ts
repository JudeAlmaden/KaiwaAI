import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getVocabWithKanji } from "@/lib/kanji-db";
import { loadComponentMap } from "@/lib/kanji-mnemonic/context.server";
import { mergeComponents } from "@/lib/kanji-mnemonic/context";
import { saveKanjiMnemonic } from "@/lib/kanji-mnemonic/mnemonic-store";
import type { ComponentContext } from "@/lib/kanji-mnemonic/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("[Kanji API] No user authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { character } = await params;
    const decodedChar = decodeURIComponent(character);

    console.log("[Kanji API] User:", user.id, "Looking for:", decodedChar);

    // Fetch kanji data
    let kanji;
    try {
      kanji = await prisma.kanji.findUnique({
        where: { character: decodedChar },
      });
      console.log("[Kanji API] Prisma query result:", kanji ? `Found ${kanji.character}` : "Not found");
    } catch (dbError) {
      console.error("[Kanji API] Database error:", dbError);
      throw new Error(`Database query failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }

    if (!kanji) {
      return NextResponse.json({ error: `Kanji not found: ${decodedChar}` }, { status: 404 });
    }

    // Check for mnemonic: look in UserKanji first, then KanjiMnemonic
    let mnemonicText: string | null = null;
    let userKanji = null;
    try {
      userKanji = await prisma.userKanji.findUnique({
        where: {
          userId_kanjiId: { userId: user.id, kanjiId: kanji.id },
        },
      });
      if (userKanji?.mnemonic) {
        mnemonicText = userKanji.mnemonic;
      } else {
        const km = await prisma.kanjiMnemonic.findUnique({
          where: {
            userId_kanjiId: { userId: user.id, kanjiId: kanji.id },
          },
        });
        mnemonicText = km?.mnemonic || null;
      }
    } catch (mnemonicError) {
      console.error("[Kanji API] Mnemonic query error:", mnemonicError);
    }

    // Get groups containing this kanji
    let userGroups: { id: string; name: string; kind: string; type: string; lessonNumber: number | null }[] = [];
    try {
      const groupEntries = await prisma.kanjiGroupEntry.findMany({
        where: {
          kanjiId: kanji.id,
          group: { userId: user.id },
        },
        include: {
          group: { select: { id: true, name: true, kind: true, lessonNumber: true } },
        },
      });
      userGroups = groupEntries.map((ge) => ({
        id: ge.group.id,
        name: ge.group.name,
        kind: ge.group.kind,
        type: ge.group.kind,
        lessonNumber: ge.group.lessonNumber,
      }));
    } catch (e) {
      console.error("[Kanji API] Group entries error:", e);
    }

    // Get vocabulary examples
    let vocabularyExamples;
    try {
      vocabularyExamples = await getVocabWithKanji(user.id, decodedChar);
    } catch (vocabError) {
      console.error("[Kanji API] Vocab query error:", vocabError);
      throw new Error(`Failed to get vocabulary: ${vocabError instanceof Error ? vocabError.message : String(vocabError)}`);
    }

    // Parse JSON fields
    let parsedData;
    try {
      parsedData = {
        meanings: JSON.parse(kanji.meanings),
        readingsOn: JSON.parse(kanji.readingsOn),
        readingsKun: JSON.parse(kanji.readingsKun),
        radicals: JSON.parse(kanji.radicals),
      };
    } catch (parseError) {
      console.error("[Kanji API] JSON parse error:", parseError);
      throw new Error(`Failed to parse kanji data: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    let parsedPrimitives: string[] = [];
    try {
      if (kanji.primitives) parsedPrimitives = JSON.parse(kanji.primitives) as string[];
    } catch {
      parsedPrimitives = [];
    }

    // Resolve the primitives to the meanings the learner already knows, in one
    // batched query, so mnemonic generation can build on earlier keywords.
    let components: ComponentContext[] = [];
    try {
      const componentMap = await loadComponentMap(user.id, parsedPrimitives);
      components = mergeComponents(parsedPrimitives, componentMap);
    } catch (componentError) {
      console.error("[Kanji API] Component context error:", componentError);
    }

    const effectiveKeyword = userKanji?.customMeaning || kanji.heisigKeyword || null;

    return NextResponse.json({
      kanji: {
        id: kanji.id,
        character: kanji.character,
        strokes: kanji.strokes,
        grade: kanji.grade,
        frequency: kanji.frequency,
        jlptLevel: kanji.jlptLevel,
        heisigNumber: kanji.heisigNumber,
        heisigLesson: kanji.heisigLesson,
        heisigKeyword: kanji.heisigKeyword,
        primitives: parsedPrimitives,
        components,
        customMeaning: userKanji?.customMeaning || null,
        effectiveKeyword,
        ...parsedData,
        wkLevel: kanji.wkLevel,
      },
      mnemonic: userKanji?.mnemonic || mnemonicText,
      inReviews: !!userKanji,
      userKanji: userKanji ? {
        status: userKanji.status,
        repetitions: userKanji.repetitions,
        nextReview: userKanji.nextReview,
        srsStage: userKanji.repetitions,
        customMeaning: userKanji.customMeaning,
        mnemonic: userKanji.mnemonic,
      } : null,
      groups: userGroups,
      vocabularyExamples: vocabularyExamples.map((v) => {
        let word: string;
        let reading: string;
        let meaning: string;
        const romaji = "";

        if (v.phrase) {
          word = v.phrase.text;
          reading = v.phrase.reading;
          try {
            const meanings = JSON.parse(v.phrase.meanings);
            meaning = Array.isArray(meanings) ? meanings.join("; ") : String(meanings);
          } catch {
            meaning = v.phrase.meanings;
          }
        } else if (v.word) {
          word = v.word.dictionary;
          reading = v.word.reading;
          try {
            const meanings = JSON.parse(v.word.meanings);
            meaning = Array.isArray(meanings) ? meanings.join("; ") : String(meanings);
          } catch {
            meaning = v.word.meanings;
          }
        } else {
          word = "Unknown";
          reading = "Unknown";
          meaning = "Unknown";
        }

        return {
          id: v.id,
          word,
          reading,
          romaji,
          meaning,
          status: v.status,
        };
      }),
    });
  } catch (error) {
    console.error("[Kanji API] Fatal error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}

// PATCH: Update Heisig metadata (keyword, lesson, number), primitives, and/or personal mnemonic
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });
  if (!kanji) return NextResponse.json({ error: "Kanji not found" }, { status: 404 });

  const body = await req.json();
  const { heisigKeyword, heisigLesson, heisigNumber, mnemonic, primitives } = body;

  const kanjiUpdates: {
    heisigKeyword?: string | null;
    heisigLesson?: number | null;
    heisigNumber?: number | null;
    primitives?: string | null;
  } = {};
  if (heisigKeyword !== undefined) kanjiUpdates.heisigKeyword = heisigKeyword?.trim() || null;
  if (heisigLesson !== undefined) kanjiUpdates.heisigLesson = heisigLesson !== null && heisigLesson !== "" ? Number(heisigLesson) : null;
  if (heisigNumber !== undefined) kanjiUpdates.heisigNumber = heisigNumber !== null && heisigNumber !== "" ? Number(heisigNumber) : null;
  if (primitives !== undefined) {
    kanjiUpdates.primitives = Array.isArray(primitives) ? JSON.stringify(primitives) : null;
  }

  if (Object.keys(kanjiUpdates).length > 0) {
    await prisma.kanji.update({
      where: { id: kanji.id },
      data: kanjiUpdates,
    });
  }

  // Mnemonic writes go through the single store helper.
  if (mnemonic !== undefined) {
    await saveKanjiMnemonic(
      user.id,
      kanji.id,
      typeof mnemonic === "string" ? mnemonic : ""
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove a kanji from user's study list (UserKanji + group entries)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  await prisma.userKanji.deleteMany({
    where: {
      userId: user.id,
      kanjiId: kanji.id,
    },
  });

  await prisma.kanjiGroupEntry.deleteMany({
    where: {
      kanjiId: kanji.id,
      group: { userId: user.id },
    },
  });

  await prisma.kanjiMnemonic.deleteMany({
    where: {
      userId: user.id,
      kanjiId: kanji.id,
    },
  });

  // `Kanji` is the shared dictionary and has no owner, so dropping a card from
  // one user's list must never delete the row: doing so removes the character
  // from browse and search for everyone. Unreferenced rows simply stay put.
  return NextResponse.json({ success: true });
}

