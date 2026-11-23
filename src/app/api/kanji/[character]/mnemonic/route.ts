import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveKanjiMnemonic } from "@/lib/kanji-mnemonic/mnemonic-store";

// GET: Retrieve current mnemonic for a kanji
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
    select: { id: true },
  });
  if (!kanji) return NextResponse.json({ mnemonic: null });

  const userKanji = await prisma.userKanji.findFirst({
    where: { userId: user.id, kanjiId: kanji.id },
    select: { mnemonic: true },
  });

  return NextResponse.json({
    mnemonic: userKanji?.mnemonic ?? null,
    source: userKanji?.mnemonic ? "user" : "none",
  });
}

// PUT: The one write path for a mnemonic note. Blank text deletes it.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  let body: { mnemonic?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.mnemonic !== "string") {
    return NextResponse.json({ error: "Mnemonic text required" }, { status: 400 });
  }

  try {
    const kanji = await prisma.kanji.findUnique({
      where: { character: decodedChar },
    });
    if (!kanji) {
      return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
    }

    const saved = await saveKanjiMnemonic(user.id, kanji.id, body.mnemonic);
    return NextResponse.json({ success: true, mnemonic: saved.mnemonic });
  } catch (error) {
    console.error("Error saving mnemonic:", error);
    return NextResponse.json({ error: "Failed to save mnemonic" }, { status: 500 });
  }
}

// PATCH kept as an alias for existing clients; same behaviour as PUT.
export const PATCH = PUT;
