import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";

// Builds the prompt context: level + reinforce words + knownCount + memories
// + recent turns. Never returns the full known-words list (stays flat-sized).
// `personaId` scopes which persona's memory is loaded.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const personaId = await resolvePersonaId(sp.get("personaId"));

  const now = new Date();

  const [reinforceCards, knownCount, memories, recent] = await Promise.all([
    prisma.flashcard.findMany({
      where: {
        userId: user.id,
        OR: [
          { status: "learning" },
          { status: "known", nextReview: { lte: now } },
        ],
      },
      orderBy: { nextReview: "asc" },
      take: 5,
      select: { word: true },
    }),
    prisma.flashcard.count({ where: { userId: user.id, status: "known" } }),
    prisma.memory.findMany({
      where: { userId: user.id, personaId },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 12,
      select: { content: true },
    }),
    prisma.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { role: true, content: true },
    }),
  ]);

  return NextResponse.json({
    level: user.level,
    newWordBudget: user.maxNewWords,
    knownCount,
    reinforce: reinforceCards.map((c) => c.word),
    memories: memories.map((m) => m.content),
    recentTurns: recent.reverse(),
  });
}
