import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// PATCH: Update mnemonic for a kanji in user's learning list
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;

  let body: { mnemonic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const mnemonic = (body.mnemonic ?? "").trim();
  if (!mnemonic) {
    return NextResponse.json({ error: "Mnemonic required" }, { status: 400 });
  }

  // Find the kanji
  const kanji = await prisma.kanji.findUnique({
    where: { character },
    select: { id: true },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  // Find or create user's kanji record
  let userKanji = await prisma.userKanji.findFirst({
    where: { userId: user.id, kanjiId: kanji.id },
  });

  if (!userKanji) {
    // Create new record if user hasn't added this kanji yet
    userKanji = await prisma.userKanji.create({
      data: {
        userId: user.id,
        kanjiId: kanji.id,
        mnemonic,
        status: "new",
      },
    });
  } else {
    // Update existing record
    userKanji = await prisma.userKanji.update({
      where: { id: userKanji.id },
      data: { mnemonic },
    });
  }

  return NextResponse.json({ mnemonic: userKanji.mnemonic });
}
