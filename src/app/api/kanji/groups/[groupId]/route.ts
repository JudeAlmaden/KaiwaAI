import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET    /api/kanji/groups/[groupId]
// PATCH  /api/kanji/groups/[groupId]
// DELETE /api/kanji/groups/[groupId]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const group = await prisma.kanjiGroup.findFirst({
    where: { id: groupId, userId: user.id },
    include: {
      entries: {
        include: {
          kanji: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const userKanjiRecords = await prisma.userKanji.findMany({
    where: {
      userId: user.id,
      kanjiId: { in: group.entries.map((e) => e.kanjiId) },
    },
    select: { kanjiId: true, status: true, mnemonic: true },
  });
  const ukMap = new Map(userKanjiRecords.map((uk) => [uk.kanjiId, uk]));

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      kind: group.kind,
      lessonNumber: group.lessonNumber,
      entries: group.entries.map((e) => ({
        id: e.id,
        order: e.order,
        kanjiId: e.kanjiId,
        character: e.kanji.character,
        heisigNumber: e.kanji.heisigNumber,
        heisigLesson: e.kanji.heisigLesson,
        heisigKeyword: e.kanji.heisigKeyword,
        meanings: JSON.parse(e.kanji.meanings) as string[],
        readingsOn: JSON.parse(e.kanji.readingsOn) as string[],
        readingsKun: JSON.parse(e.kanji.readingsKun) as string[],
        jlptLevel: e.kanji.jlptLevel,
        strokes: e.kanji.strokes,
        isAdded: ukMap.has(e.kanjiId),
        status: ukMap.get(e.kanjiId)?.status ?? null,
        mnemonic: ukMap.get(e.kanjiId)?.mnemonic ?? null,
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const group = await prisma.kanjiGroup.findFirst({
    where: { id: groupId, userId: user.id },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Prevent renaming system-seeded heisig_lesson groups
  if (group.kind === "heisig_lesson" && body.name) {
    return NextResponse.json({ error: "Cannot rename Heisig lesson groups" }, { status: 400 });
  }

  const updated = await prisma.kanjiGroup.update({
    where: { id: groupId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
    },
  });

  return NextResponse.json({ group: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const group = await prisma.kanjiGroup.findFirst({
    where: { id: groupId, userId: user.id },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (group.kind === "heisig_lesson") {
    return NextResponse.json({ error: "Cannot delete Heisig lesson groups" }, { status: 400 });
  }

  await prisma.kanjiGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
