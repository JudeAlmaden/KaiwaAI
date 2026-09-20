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
  const limit = parseInt(url.searchParams.get("limit") || "500");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const groupId = url.searchParams.get("groupId"); // filter by KanjiGroup
  const heisigLesson = url.searchParams.get("heisigLesson"); // filter by RTK lesson

  // source param:
  //   "vocab"    — only kanji extracted from user's saved vocabulary words (legacy)
  //   "learning" — only kanji user has explicitly added to UserKanji (default for study tab)
  //   "all"      — all kanji in DB (for browse/add flow)
  const source = url.searchParams.get("source") ?? "learning";

  // Build where clause for Kanji table
  type KanjiWhere = {
    character?: { in: string[] };
    jlptLevel?: number;
    grade?: number;
    heisigLesson?: number;
    id?: { in: string[] };
  };
  const where: KanjiWhere = {};

  if (jlptLevel) where.jlptLevel = parseInt(jlptLevel);
  if (grade) where.grade = parseInt(grade);
  if (heisigLesson) where.heisigLesson = parseInt(heisigLesson);

  // Scope by source
  if (source === "vocab") {
    // Legacy: derive from user's flashcard words
    const userKanjiChars = await getUserKanji(user.id);
    if (userKanjiChars.length === 0) {
      return NextResponse.json({ kanji: [], total: 0, hasMore: false });
    }
    where.character = { in: userKanjiChars };
  } else if (source === "learning") {
    // Kanji user has explicitly added (UserKanji table)
    const userKanjiRecords = await prisma.userKanji.findMany({
      where: { userId: user.id },
      select: { kanji: { select: { character: true } } },
    });
    const chars = userKanjiRecords.map((uk) => uk.kanji.character);
    if (chars.length === 0) {
      return NextResponse.json({ kanji: [], total: 0, hasMore: false });
    }
    where.character = { in: chars };
  }
  // source === "all" — no character filter, whole DB

  // Filter by group membership
  if (groupId) {
    const groupEntries = await prisma.kanjiGroupEntry.findMany({
      where: { groupId },
      select: { kanjiId: true },
      orderBy: { order: "asc" },
    });
    where.id = { in: groupEntries.map((e) => e.kanjiId) };
  }

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
      heisigNumber: true,
      heisigLesson: true,
      heisigKeyword: true,
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
        (k.heisigKeyword?.toLowerCase().includes(searchLower) ?? false) ||
        meanings.some((m) => m.toLowerCase().includes(searchLower)) ||
        readingsOn.some((r) => r.includes(search)) ||
        readingsKun.some((r) => r.includes(search))
      );
    });
  }

  // Calculate mastery stats — only for learning/vocab source (expensive)
  const needsVocabStats = source === "vocab" || source === "learning";

  const kanjiWithStats = await Promise.all(
    kanjiData.map(async (k) => {
      if (!needsVocabStats) {
        return { ...k, vocabCount: 0, knownVocabCount: 0, masteryPercent: 0 };
      }
      const vocabWords = await getVocabWithKanji(user.id, k.character);
      const knownCount = vocabWords.filter((w) => w.status === "known").length;
      const masteryPercent =
        vocabWords.length > 0 ? Math.round((knownCount / vocabWords.length) * 100) : 0;

      return {
        ...k,
        vocabCount: vocabWords.length,
        knownVocabCount: knownCount,
        masteryPercent,
      };
    })
  );

  // Check UserKanji status, mnemonics, and user's custom meanings
  const userKanjiRecords = await prisma.userKanji.findMany({
    where: {
      userId: user.id,
      kanjiId: { in: kanjiWithStats.map((k) => k.id) },
    },
    select: { kanjiId: true, mnemonic: true, status: true, customMeaning: true },
  });

  const inReviewsSet = new Set(userKanjiRecords.map((uk) => uk.kanjiId));
  const hasMnemonicMap = new Map(
    userKanjiRecords
      .filter((uk) => uk.mnemonic && uk.mnemonic.trim().length > 0)
      .map((uk) => [uk.kanjiId, true])
  );
  const statusMap = new Map(userKanjiRecords.map((uk) => [uk.kanjiId, uk.status]));
  const customMeaningMap = new Map(userKanjiRecords.map((uk) => [uk.kanjiId, uk.customMeaning]));

  const kanjiWithReviewStatus = kanjiWithStats.map((k) => ({
    ...k,
    heisigKeyword: customMeaningMap.get(k.id) || k.heisigKeyword || null,
    inReviews: inReviewsSet.has(k.id),
    hasMnemonic: hasMnemonicMap.has(k.id),
    learningStatus: statusMap.get(k.id) ?? null,
  }));

  // Sort
  if (sortBy === "heisig") {
    kanjiWithReviewStatus.sort((a, b) => {
      const aNum = a.heisigNumber ?? 99999;
      const bNum = b.heisigNumber ?? 99999;
      return aNum - bNum;
    });
  } else if (sortBy === "mastery") {
    kanjiWithReviewStatus.sort((a, b) => b.masteryPercent - a.masteryPercent);
  } else if (sortBy === "strokes") {
    kanjiWithReviewStatus.sort((a, b) => a.strokes - b.strokes);
  } else {
    // frequency (default)
    kanjiWithReviewStatus.sort((a, b) => {
      const aFreq = a.frequency ?? 999999;
      const bFreq = b.frequency ?? 999999;
      return aFreq - bFreq;
    });
  }

  const total = kanjiWithReviewStatus.length;
  const paginatedKanji = kanjiWithReviewStatus.slice(offset, offset + limit);

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

// POST: Add or update a kanji with user's mnemonic, Heisig keyword, lesson, frame number, and group
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  type KanjiPostBody = {
    character?: string;
    keyword?: string;
    heisigKeyword?: string;
    heisigLesson?: number | string;
    heisigNumber?: number | string;
    mnemonic?: string;
    groupId?: string;
  };

  let body: KanjiPostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { character, keyword, heisigKeyword, heisigLesson, heisigNumber, mnemonic, groupId } = body;

  if (!character || typeof character !== "string" || !character.trim()) {
    return NextResponse.json({ error: "Character is required" }, { status: 400 });
  }

  const char = character.trim();
  const kw = (heisigKeyword || keyword || "").trim();
  const lesson = heisigLesson ? Number(heisigLesson) : null;
  const frame = heisigNumber ? Number(heisigNumber) : null;

  // Upsert the Kanji record
  let kanji = await prisma.kanji.findUnique({ where: { character: char } });
  if (!kanji) {
    kanji = await prisma.kanji.create({
      data: {
        character: char,
        meanings: JSON.stringify(kw ? [kw] : [char]),
        readingsOn: JSON.stringify([]),
        readingsKun: JSON.stringify([]),
        radicals: JSON.stringify([]),
        strokes: 1,
        heisigKeyword: kw || null,
        heisigLesson: lesson,
        heisigNumber: frame,
      },
    });
  } else {
    // update heisig fields if provided
    const updateData: { heisigKeyword?: string; heisigLesson?: number | null; heisigNumber?: number | null } = {};
    if (kw) updateData.heisigKeyword = kw;
    if (lesson !== null) updateData.heisigLesson = lesson;
    if (frame !== null) updateData.heisigNumber = frame;
    if (Object.keys(updateData).length > 0) {
      kanji = await prisma.kanji.update({
        where: { id: kanji.id },
        data: updateData,
      });
    }
  }

  // Upsert UserKanji so it is part of the user's review queue
  const existingUK = await prisma.userKanji.findUnique({
    where: { userId_kanjiId: { userId: user.id, kanjiId: kanji.id } },
  });

  let userKanji;
  if (existingUK) {
    userKanji = await prisma.userKanji.update({
      where: { id: existingUK.id },
      data: {
        customMeaning: kw || existingUK.customMeaning,
        mnemonic: mnemonic !== undefined ? (mnemonic?.trim() || null) : existingUK.mnemonic,
      },
    });
  } else {
    userKanji = await prisma.userKanji.create({
      data: {
        userId: user.id,
        kanjiId: kanji.id,
        status: "new",
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        timesReviewed: 0,
        nextReview: new Date(),
        customMeaning: kw || null,
        mnemonic: mnemonic?.trim() || null,
      },
    });
  }

  // If groupId provided, add to KanjiGroupEntry
  if (groupId) {
    const group = await prisma.kanjiGroup.findFirst({
      where: { id: groupId, userId: user.id },
    });
    if (group) {
      const existingEntry = await prisma.kanjiGroupEntry.findUnique({
        where: { groupId_kanjiId: { groupId: group.id, kanjiId: kanji.id } },
      });
      if (!existingEntry) {
        const maxOrder = await prisma.kanjiGroupEntry.aggregate({
          where: { groupId: group.id },
          _max: { order: true },
        });
        await prisma.kanjiGroupEntry.create({
          data: {
            groupId: group.id,
            kanjiId: kanji.id,
            order: (maxOrder._max.order ?? -1) + 1,
          },
        });
      }
    }
  }

  return NextResponse.json({ kanji, userKanji }, { status: 201 });
}

