import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// POST   /api/kanji/groups/[groupId]/entries  — add kanji to group
// DELETE /api/kanji/groups/[groupId]/entries  — remove kanji from group (body: { kanjiId })

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  let body: { character?: string; kanjiId?: string; order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify group belongs to user
  const group = await prisma.kanjiGroup.findFirst({
    where: { id: groupId, userId: user.id },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Resolve kanji by character or ID
  let kanjiId = body.kanjiId;
  if (!kanjiId && body.character) {
    const kanji = await prisma.kanji.findUnique({
      where: { character: body.character },
      select: { id: true },
    });
    if (!kanji) return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
    kanjiId = kanji.id;
  }

  if (!kanjiId) return NextResponse.json({ error: "kanjiId or character required" }, { status: 400 });

  // Get max order for append
  const maxOrder = await prisma.kanjiGroupEntry.aggregate({
    where: { groupId },
    _max: { order: true },
  });
  const nextOrder = body.order ?? (maxOrder._max.order ?? -1) + 1;

  const entry = await prisma.kanjiGroupEntry.upsert({
    where: { groupId_kanjiId: { groupId, kanjiId } },
    create: { groupId, kanjiId, order: nextOrder },
    update: { order: nextOrder },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  let body: { kanjiId?: string; character?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const group = await prisma.kanjiGroup.findFirst({
    where: { id: groupId, userId: user.id },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  let kanjiId = body.kanjiId;
  if (!kanjiId && body.character) {
    const kanji = await prisma.kanji.findUnique({
      where: { character: body.character },
      select: { id: true },
    });
    kanjiId = kanji?.id;
  }

  if (!kanjiId) return NextResponse.json({ error: "kanjiId or character required" }, { status: 400 });

  await prisma.kanjiGroupEntry.deleteMany({ where: { groupId, kanjiId } });
  return NextResponse.json({ ok: true });
}
