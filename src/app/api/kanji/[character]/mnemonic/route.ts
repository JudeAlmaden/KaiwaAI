import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getOrCreateMnemonic } from "@/lib/kanji-mnemonic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;
  const decodedChar = decodeURIComponent(character);

  let body: { regenerate?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine
  }

  // Find kanji by character
  const kanji = await prisma.kanji.findUnique({
    where: { character: decodedChar },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  try {
    const result = await getOrCreateMnemonic(
      user.id,
      kanji.id,
      body.regenerate || false
    );

    return NextResponse.json({
      mnemonic: result.mnemonic,
      cached: result.cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate mnemonic";
    
    if (message === "NO_API_KEY") {
      return NextResponse.json(
        { error: "API key required. Add your Gemini key in Settings." },
        { status: 400 }
      );
    }
    
    if (message === "BAD_API_KEY") {
      return NextResponse.json(
        { error: "Invalid API key. Check your Gemini key in Settings." },
        { status: 400 }
      );
    }
    
    if (message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate mnemonic" },
      { status: 500 }
    );
  }
}
