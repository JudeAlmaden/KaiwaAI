import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  let body: { mnemonic: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.mnemonic || typeof body.mnemonic !== "string") {
    return NextResponse.json({ error: "Mnemonic text required" }, { status: 400 });
  }

  // Find kanji by character
  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  try {
    // Save or update mnemonic
    await prisma.kanjiMnemonic.upsert({
      where: { userId_kanjiId: { userId: user.id, kanjiId: kanji.id } },
      update: { mnemonic: body.mnemonic },
      create: { userId: user.id, kanjiId: kanji.id, mnemonic: body.mnemonic },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving mnemonic:", error);
    return NextResponse.json(
      { error: "Failed to save mnemonic" },
      { status: 500 }
    );
  }
}
