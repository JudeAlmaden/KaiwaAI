import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET  /api/kanji/groups — list all groups for the user
// POST /api/kanji/groups — create a new custom group

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.kanjiGroup.findMany({
    where: { userId: user.id },
    include: {
      entries: {
        include: {
          kanji: {
            select: {
              id: true,
              character: true,
              heisigNumber: true,
              heisigLesson: true,
              heisigKeyword: true,
              meanings: true,
              jlptLevel: true,
              strokes: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ kind: "asc" }, { lessonNumber: "asc" }, { createdAt: "asc" }],
  });

  // Get user's UserKanji records to compute completion stats and attach custom meanings & mnemonics
  const userKanjiRecords = await prisma.userKanji.findMany({
    where: { userId: user.id },
    select: { kanjiId: true, status: true, customMeaning: true, mnemonic: true },
  });
  const userKanjiMap = new Map(userKanjiRecords.map((uk) => [uk.kanjiId, uk]));

  const result = groups.map((g) => {
    const total = g.entries.length;
    const added = g.entries.filter((e) => userKanjiMap.has(e.kanjiId)).length;
    const known = g.entries.filter((e) => userKanjiMap.get(e.kanjiId)?.status === "known").length;

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      kind: g.kind,
      lessonNumber: g.lessonNumber,
      order: g.order,
      createdAt: g.createdAt,
      total,
      added,
      known,
      completionPct: total > 0 ? Math.round((known / total) * 100) : 0,
      entries: g.entries.map((e) => {
        const uk = userKanjiMap.get(e.kanjiId);
        return {
          id: e.id,
          order: e.order,
          kanjiId: e.kanjiId,
          character: e.kanji.character,
          heisigNumber: e.kanji.heisigNumber,
          heisigKeyword: uk?.customMeaning || e.kanji.heisigKeyword || null,
          customMeaning: uk?.customMeaning || null,
          mnemonic: uk?.mnemonic || null,
          meanings: JSON.parse(e.kanji.meanings) as string[],
          jlptLevel: e.kanji.jlptLevel,
          strokes: e.kanji.strokes,
          isAdded: !!uk,
          status: uk?.status ?? null,
        };
      }),
    };
  });

  return NextResponse.json({ groups: result });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; description?: string; kind?: string; lessonNumber?: number; order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Auto-determine order if not provided
  let folderOrder = body.order;
  if (folderOrder === undefined) {
    const maxOrder = await prisma.kanjiGroup.aggregate({
      where: { userId: user.id },
      _max: { order: true },
    });
    folderOrder = (maxOrder._max.order ?? -1) + 1;
  }

  const group = await prisma.kanjiGroup.create({
    data: {
      userId: user.id,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      kind: body.kind ?? "custom",
      lessonNumber: body.lessonNumber ?? null,
      order: folderOrder,
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
