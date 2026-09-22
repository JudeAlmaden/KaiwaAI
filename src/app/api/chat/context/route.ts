import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";
import { isMood, type Mood } from "@/lib/mood";

// Builds the prompt context: level + reinforce words + knownCount + memories
// + recent turns + mood + summary. Never returns the full known-words list.
// `personaId` scopes which persona's memory is loaded.
// `chatId` scopes recentTurns + mood/summary to the current conversation.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const personaId = await resolvePersonaId(sp.get("personaId"));
  const chatId = sp.get("chatId");

  const now = new Date();

  const [reinforceCards, knownCount, memories, chatRow, recent] =
    await Promise.all([
      prisma.userFlashcard.findMany({
        where: {
          userId: user.id,
          OR: [
            { status: "learning" },
            { status: "known", nextReview: { lte: now } },
          ],
        },
        orderBy: { nextReview: "asc" },
        take: 5,
        include: { word: true, phrase: true },
      }),
      prisma.userFlashcard.count({ where: { userId: user.id, status: "known" } }),
      prisma.memory.findMany({
        where: {
          userId: user.id,
          personaId,
          supersededById: null,
        },
        orderBy: [
          { importance: "desc" },
          { lastUsedAt: "desc" },
          { updatedAt: "desc" },
        ],
        take: 10,
        select: { id: true, content: true },
      }),
      chatId
        ? prisma.chat.findFirst({
            where: {
              id: chatId,
              members: { some: { userId: user.id, kind: "user", status: "accepted" } },
            },
            select: {
              mood: true,
              moodScore: true,
              summary: true,
              summaryUpToId: true,
            },
          })
        : Promise.resolve(null),
      chatId
        ? prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { senderKind: true, content: true, senderUserId: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

  // Touch lastUsedAt for injected memories (fire-and-forget).
  if (memories.length > 0) {
    const ids = memories.map((m) => m.id);
    void prisma.memory
      .updateMany({
        where: { id: { in: ids } },
        data: { lastUsedAt: now },
      })
      .catch(() => {});
  }

  let hoursSinceUserReply: number | undefined;
  const lastUser = recent.find((m) => m.senderKind === "user");
  if (lastUser) {
    hoursSinceUserReply =
      (now.getTime() - new Date(lastUser.createdAt).getTime()) / 3.6e6;
  } else if (chatId) {
    hoursSinceUserReply = Infinity;
  }

  const mood: Mood | undefined = chatRow && isMood(chatRow.mood) ? chatRow.mood : undefined;

  return NextResponse.json({
    level: user.level,
    newWordBudget: user.maxNewWords,
    knownCount,
    reinforce: reinforceCards.map((c) => c.phrase?.text || c.word?.dictionary || ""),
    memories: memories.map((m) => m.content),
    recentTurns: recent
      .slice()
      .reverse()
      .map((m) => ({
        role: m.senderKind === "user" ? "user" : "kai",
        content: m.content,
      })),
    mood: mood ?? "neutral",
    moodScore: chatRow?.moodScore ?? 0,
    hoursSinceUserReply,
    summary: chatRow?.summary ?? null,
  });
}
