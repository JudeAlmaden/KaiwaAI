import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getUserKanji, getVocabWithKanji } from "@/lib/kanji-db";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search");
  const jlptLevel = url.searchParams.get("jlptLevel");
  const grade = url.searchParams.get("grade");
  const sortBy = url.searchParams.get("sortBy") || "frequency";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Get user's unique kanji from vocabulary
  const userKanjiChars = await getUserKanji(user.id);

  if (userKanjiChars.length === 0) {
    return NextResponse.json({ kanji: [], total: 0, hasMore: false });
  }

  // Build where clause
  const where: {
    character: { in: string[] };
    jlptLevel?: number;
    grade?: number;
  } = {
    character: { in: userKanjiChars },
  };

  if (jlptLevel) where.jlptLevel = parseInt(jlptLevel);
  if (grade) where.grade = parseInt(grade);

  // Fetch kanji data
  let kanjiData = await prisma.kanji.findMany({
    where,
    select: {
      id: true,
      character: true,
      meanings: true,
      readingsOn: true,
      readingsKun: true,
      jlptLevel: true,
      strokes: true,
      frequency: true,
    },
  });

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    kanjiData = kanjiData.filter((k) => {
      const meanings = JSON.parse(k.meanings) as string[];
      const readingsOn = JSON.parse(k.readingsOn) as string[];
      const readingsKun = JSON.parse(k.readingsKun) as string[];
      
      return (
        k.character.includes(search) ||
        meanings.some((m) => m.toLowerCase().includes(searchLower)) ||
        readingsOn.some((r) => r.includes(search)) ||
        readingsKun.some((r) => r.includes(search))
      );
    });
  }

  // Calculate mastery for each kanji (can be expensive, consider caching)
  const kanjiWithStats = await Promise.all(
    kanjiData.map(async (k) => {
      const vocabWords = await getVocabWithKanji(user.id, k.character);
      const knownCount = vocabWords.filter((w) => w.status === "known").length;
      const masteryPercent = vocabWords.length > 0
        ? Math.round((knownCount / vocabWords.length) * 100)
        : 0;

      return {
        ...k,
        vocabCount: vocabWords.length,
        knownVocabCount: knownCount,
        masteryPercent,
      };
    })
  );

  // Sort
  if (sortBy === "mastery") {
    kanjiWithStats.sort((a, b) => b.masteryPercent - a.masteryPercent);
  } else if (sortBy === "strokes") {
    kanjiWithStats.sort((a, b) => a.strokes - b.strokes);
  } else if (sortBy === "frequency") {
    // Already sorted by vocabulary frequency from getUserKanji
    // But also consider kanji's own frequency rank
    kanjiWithStats.sort((a, b) => {
      const aFreq = a.frequency || 999999;
      const bFreq = b.frequency || 999999;
      return aFreq - bFreq;
    });
  }

  const total = kanjiWithStats.length;
  const paginatedKanji = kanjiWithStats.slice(offset, offset + limit);

  // Parse JSON strings
  const result = paginatedKanji.map((k) => ({
    ...k,
    meanings: JSON.parse(k.meanings) as string[],
    readingsOn: JSON.parse(k.readingsOn) as string[],
    readingsKun: JSON.parse(k.readingsKun) as string[],
  }));

  return NextResponse.json({
    kanji: result,
    total,
    hasMore: offset + limit < total,
  });
}
