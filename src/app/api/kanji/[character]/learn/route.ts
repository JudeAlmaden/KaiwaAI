import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// POST: Add a kanji to user's review queue (UserKanji table)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  type LearnBody = {
    mnemonic?: string;
    groupId?: string;
    keyword?: string;
    heisigKeyword?: string;
    heisigLesson?: number | string;
    heisigNumber?: number | string;
    readingsOn?: string[];
    readingsKun?: string[];
    radicals?: string[];
    strokes?: number;
  };

  // Optional body
  let body: LearnBody = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    // No body is fine
  }

  // Find the kanji, or create it if user is manually adding an RTK entry
  let kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });

  if (!kanji) {
    // Auto-create kanji record so user can add any kanji from their RTK material
    const kw = body.keyword || body.heisigKeyword || decodedChar;
    kanji = await prisma.kanji.create({
      data: {
        character: decodedChar,
        meanings: JSON.stringify([kw]),
        readingsOn: JSON.stringify(body.readingsOn || []),
        readingsKun: JSON.stringify(body.readingsKun || []),
        radicals: JSON.stringify(body.radicals || []),
        strokes: body.strokes || 1,
        heisigNumber: body.heisigNumber ? Number(body.heisigNumber) : null,
        heisigLesson: body.heisigLesson ? Number(body.heisigLesson) : null,
        heisigKeyword: kw,
      },
    });
  } else {
    // If Heisig fields were supplied, update the Kanji record
    const updateData: { heisigNumber?: number; heisigLesson?: number; heisigKeyword?: string } = {};
    if (body.heisigNumber) updateData.heisigNumber = Number(body.heisigNumber);
    if (body.heisigLesson) updateData.heisigLesson = Number(body.heisigLesson);
    if (body.heisigKeyword || body.keyword) {
      updateData.heisigKeyword = body.heisigKeyword || body.keyword;
    }
    if (Object.keys(updateData).length > 0) {
      kanji = await prisma.kanji.update({
        where: { id: kanji.id },
        data: updateData,
      });
    }
  }

  // Check if already in user's review queue
  const existing = await prisma.userKanji.findUnique({
    where: {
      userId_kanjiId: {
        userId: user.id,
        kanjiId: kanji.id,
      },
    },
  });

  const customMeaningVal = (body.heisigKeyword || body.keyword)?.trim() || null;
  const mnemonicVal = body.mnemonic?.trim() ?? null;

  let userKanji;
  if (existing) {
    // Already exists — update mnemonic and/or customMeaning if provided
    const updateData: { mnemonic?: string | null; customMeaning?: string | null } = {};
    if (body.mnemonic !== undefined) updateData.mnemonic = mnemonicVal;
    if (customMeaningVal !== null) updateData.customMeaning = customMeaningVal;

    if (Object.keys(updateData).length > 0) {
      userKanji = await prisma.userKanji.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      userKanji = existing;
    }
  } else {
    // Add to review queue
    userKanji = await prisma.userKanji.create({
      data: {
        userId: user.id,
        kanjiId: kanji.id,
        status: "new",
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        timesReviewed: 0,
        nextReview: new Date(), // Due immediately
        mnemonic: mnemonicVal,
        customMeaning: customMeaningVal,
      },
    });
  }

  // Add to group if requested or auto-link to user's matching heisig_lesson folder
  let targetGroupId = body.groupId;
  let targetGroup: { id: string; name: string; kind: string } | null = null;

  if (!targetGroupId && kanji.heisigLesson) {
    let lessonGroup = await prisma.kanjiGroup.findFirst({
      where: {
        userId: user.id,
        kind: "heisig_lesson",
        lessonNumber: kanji.heisigLesson,
      },
    });

    if (!lessonGroup) {
      lessonGroup = await prisma.kanjiGroup.create({
        data: {
          userId: user.id,
          name: `Lesson ${kanji.heisigLesson}`,
          kind: "heisig_lesson",
          lessonNumber: kanji.heisigLesson,
          order: kanji.heisigLesson,
        },
      });
    }

    targetGroupId = lessonGroup.id;
    targetGroup = { id: lessonGroup.id, name: lessonGroup.name, kind: lessonGroup.kind };
  } else if (targetGroupId) {
    const group = await prisma.kanjiGroup.findFirst({
      where: { id: targetGroupId, userId: user.id },
      select: { id: true, name: true, kind: true },
    });
    if (group) targetGroup = group;
  }

  try {
    if (targetGroupId && targetGroup) {
      const maxOrder = await prisma.kanjiGroupEntry.aggregate({
        where: { groupId: targetGroupId },
        _max: { order: true },
      });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      await prisma.kanjiGroupEntry.upsert({
        where: { groupId_kanjiId: { groupId: targetGroupId, kanjiId: kanji.id } },
        create: { groupId: targetGroupId, kanjiId: kanji.id, order: nextOrder },
        update: { order: nextOrder },
      });
    }

    return NextResponse.json({ ok: true, userKanji, group: targetGroup });
  } catch (err) {
    console.error("[Kanji Learn API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add kanji to study" },
      { status: 500 }
    );
  }
}

// PATCH: Update review status (mark known, reset)
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

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  const userKanji = await prisma.userKanji.findUnique({
    where: {
      userId_kanjiId: { userId: user.id, kanjiId: kanji.id },
    },
  });

  if (!userKanji) {
    return NextResponse.json({ error: "Kanji not in study queue" }, { status: 404 });
  }

  const body = await req.json();
  const { action, mnemonic, customMeaning } = body;

  if (action === "markKnown") {
    await prisma.userKanji.update({
      where: { id: userKanji.id },
      data: {
        status: "known",
        repetitions: Math.max(userKanji.repetitions, 3),
        interval: Math.max(userKanji.interval, 30),
      },
    });
    return NextResponse.json({ ok: true, status: "known" });
  }

  if (action === "reset") {
    await prisma.userKanji.update({
      where: { id: userKanji.id },
      data: {
        status: "new",
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReview: new Date(),
      },
    });
    return NextResponse.json({ ok: true, status: "new" });
  }

  const updateData: { mnemonic?: string | null; customMeaning?: string | null } = {};
  if (mnemonic !== undefined) updateData.mnemonic = mnemonic?.trim() || null;
  if (customMeaning !== undefined) updateData.customMeaning = customMeaning?.trim() || null;

  if (Object.keys(updateData).length > 0) {
    await prisma.userKanji.update({
      where: { id: userKanji.id },
      data: updateData,
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: Remove a kanji from user's review queue
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  // Find the kanji
  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  // Remove from review queue
  await prisma.userKanji.deleteMany({
    where: {
      userId: user.id,
      kanjiId: kanji.id,
    },
  });

  // Also remove from any group entries for this user
  await prisma.kanjiGroupEntry.deleteMany({
    where: {
      kanjiId: kanji.id,
      group: { userId: user.id },
    },
  });

  // Also remove user mnemonic if any
  await prisma.kanjiMnemonic.deleteMany({
    where: {
      userId: user.id,
      kanjiId: kanji.id,
    },
  });

  // If this was a custom-created kanji and has no other users, clean up the kanji row
  try {
    const userKanjiCount = await prisma.userKanji.count({ where: { kanjiId: kanji.id } });
    const groupCount = await prisma.kanjiGroupEntry.count({ where: { kanjiId: kanji.id } });
    if (userKanjiCount === 0 && groupCount === 0) {
      await prisma.kanji.delete({ where: { id: kanji.id } });
    }
  } catch {
    // Ignore if foreign key constraints prevent deletion (e.g. system seeded kanji)
  }

  return NextResponse.json({ ok: true });
}
