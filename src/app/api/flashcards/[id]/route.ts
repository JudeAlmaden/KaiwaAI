import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Reset a card's SRS progress or update its status.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.flashcard.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "reset") {
    const card = await prisma.flashcard.update({
      where: { id },
      data: {
        status: "new",
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
      },
    });
    return NextResponse.json({ card });
  }

  if (body.action === "markKnown") {
    const next = new Date();
    next.setDate(next.getDate() + 21);
    const card = await prisma.flashcard.update({
      where: { id },
      data: { status: "known", repetitions: 3, interval: 21, nextReview: next },
    });
    return NextResponse.json({ card });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.flashcard.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.flashcard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
