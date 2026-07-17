import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Returns the user context needed to personalise a quest generation prompt.
// The actual Gemini call happens client-side (BYOK) — this just supplies
// level, known-word count, and the words the user is currently reinforcing.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [reinforceCards, knownCount] = await Promise.all([
    prisma.userFlashcard.findMany({
      where: {
        userId: user.id,
        OR: [{ status: "learning" }, { status: "known" }],
      },
      orderBy: { nextReview: "asc" },
      take: 8,
      include: { word: true, phrase: true },
    }),
    prisma.userFlashcard.count({ where: { userId: user.id, status: "known" } }),
  ]);

  return NextResponse.json({
    level: user.level,
    knownCount,
    reinforce: reinforceCards
      .map((c) => c.phrase?.text || c.word?.dictionary || "")
      .filter(Boolean),
  });
}
