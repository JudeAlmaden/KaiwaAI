import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getVocabWithKanji } from "@/lib/kanji-db";

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

    // Check if user has a mnemonic for this kanji
    let mnemonic;
    try {
      mnemonic = await prisma.kanjiMnemonic.findUnique({
        where: {
          userId_kanjiId: { userId: user.id, kanjiId: kanji.id },
        },
      });
      console.log("[Kanji API] Mnemonic:", mnemonic ? "Found" : "None");
    } catch (mnemonicError) {
      console.error("[Kanji API] Mnemonic query error:", mnemonicError);
      // Non-fatal, continue without mnemonic
      mnemonic = null;
    }

    // Get vocabulary examples
    let vocabularyExamples;
    try {
      vocabularyExamples = await getVocabWithKanji(user.id, decodedChar);
      console.log("[Kanji API] Vocab examples:", vocabularyExamples.length);
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
      console.log("[Kanji API] JSON parsing successful");
    } catch (parseError) {
      console.error("[Kanji API] JSON parse error:", parseError);
      throw new Error(`Failed to parse kanji data: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    return NextResponse.json({
      kanji: {
        id: kanji.id,
        character: kanji.character,
        strokes: kanji.strokes,
        grade: kanji.grade,
        frequency: kanji.frequency,
        jlptLevel: kanji.jlptLevel,
        ...parsedData,
        wkLevel: kanji.wkLevel,
      },
      mnemonic: mnemonic?.mnemonic || null,
      vocabularyExamples: vocabularyExamples.map((v) => ({
        id: v.id,
        word: v.word,
        reading: v.reading,
        romaji: v.romaji,
        meaning: v.meaning,
        status: v.status,
      })),
    });
  } catch (error) {
    console.error("[Kanji API] Fatal error:", error);
    console.error("[Kanji API] Stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}
