import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { generateKanjiMnemonics } from "@/lib/gemini";

// POST: Generate mnemonics for multiple kanji
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { characters?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const characters = body.characters ?? [];
  if (!Array.isArray(characters) || characters.length === 0) {
    return NextResponse.json({ error: "Characters array required" }, { status: 400 });
  }

  if (characters.length > 20) {
    return NextResponse.json({ error: "Maximum 20 kanji at once" }, { status: 400 });
  }

  // Fetch kanji details
  const kanjiList = await prisma.kanji.findMany({
    where: { character: { in: characters } },
    select: {
      id: true,
      character: true,
      meanings: true,
      readingsOn: true,
      readingsKun: true,
    },
  });

  if (kanjiList.length === 0) {
    return NextResponse.json({ error: "No valid kanji found" }, { status: 404 });
  }

  try {
    // Generate mnemonics using AI
    const mnemonics = await generateKanjiMnemonics(
      kanjiList.map((k) => ({
        character: k.character,
        meanings: JSON.parse(k.meanings),
        readingsOn: JSON.parse(k.readingsOn),
        readingsKun: JSON.parse(k.readingsKun),
      }))
    );

    // Save mnemonics to user's kanji records
    const results = await Promise.all(
      kanjiList.map(async (kanji) => {
        const mnemonic = mnemonics[kanji.character];
        if (!mnemonic) return null;

        // Find or create user's kanji record
        const existing = await prisma.userKanji.findFirst({
          where: { userId: user.id, kanjiId: kanji.id },
        });

        if (existing) {
          // Update existing
          await prisma.userKanji.update({
            where: { id: existing.id },
            data: { mnemonic },
          });
        } else {
          // Create new
          await prisma.userKanji.create({
            data: {
              userId: user.id,
              kanjiId: kanji.id,
              mnemonic,
              status: "new",
            },
          });
        }

        return { character: kanji.character, mnemonic };
      })
    );

    return NextResponse.json({
      mnemonics: results.filter(Boolean),
    });
  } catch (error) {
    console.error("Failed to generate mnemonics:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate mnemonics";
    
    if (msg === "NO_API_KEY") {
      return NextResponse.json(
        { error: "Add your Gemini API key in Settings to generate mnemonics" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
