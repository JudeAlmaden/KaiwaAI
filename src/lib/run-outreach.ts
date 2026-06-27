import "server-only";
import { prisma } from "./prisma";
import { dayKeyFor } from "./day";
import { canReachOut, moodFor, MOOD_PROMPT } from "./outreach";
import { generateWithStoredKey } from "./gemini-server";

function localParts(now: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = fmt.format(now).split(":").map(Number);
  return { hour: h % 24, minute: m };
}

export type OutreachOutcome = { userId: string; sent: boolean; reason?: string };

/** Evaluate all opted-in users and have Kai message first where eligible. */
export async function runOutreach(now = new Date()): Promise<OutreachOutcome[]> {
  const users = await prisma.user.findMany({
    where: { outreachMode: { not: "off" }, geminiKeyEnc: { not: null } },
  });

  const results: OutreachOutcome[] = [];

  for (const user of users) {
    const { hour, minute } = localParts(now, user.timezone);
    const elig = canReachOut({
      mode: user.outreachMode,
      consecutiveIgnored: user.consecutiveIgnored,
      hourLocal: hour,
      minutesLocal: minute,
      quietStart: user.quietStart,
      quietEnd: user.quietEnd,
      lastOutreachAt: user.lastOutreachAt,
      now,
      scheduledTimes: JSON.parse(user.outreachTimes || "[]"),
    });

    if (!elig.ok) {
      results.push({ userId: user.id, sent: false, reason: elig.reason });
      continue;
    }

    const mood = moodFor(user.consecutiveIgnored);

    const [memories, recentWords] = await Promise.all([
      prisma.memory.findMany({
        where: { userId: user.id },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 5,
        select: { content: true },
      }),
      prisma.flashcard.findMany({
        where: { userId: user.id, status: "learning" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { word: true },
      }),
    ]);

    const prompt = `You are Kai, a warm Japanese tutor and friend, messaging the user FIRST (they haven't opened the app).
${MOOD_PROMPT[mood]}
Write ONE short, natural opener (1-2 sentences). Mostly simple Japanese at their level with a short English gloss in parentheses if helpful. Be genuine, never naggy.
${memories.length ? `Things you remember: ${memories.map((m) => m.content).join("; ")}.` : ""}
${recentWords.length ? `Words they're learning: ${recentWords.map((w) => w.word).join(", ")}.` : ""}
Output just the message text.`;

    let text = "";
    try {
      text = await generateWithStoredKey(user.geminiKeyEnc!, prompt, {
        maxOutputTokens: 200,
      });
    } catch {
      results.push({ userId: user.id, sent: false, reason: "generation failed" });
      continue;
    }
    if (!text) {
      results.push({ userId: user.id, sent: false, reason: "empty" });
      continue;
    }

    const dayKey = dayKeyFor(now, user.timezone);
    await prisma.$transaction([
      prisma.message.create({
        data: { userId: user.id, role: "kai", content: text, dayKey },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          lastOutreachAt: now,
          consecutiveIgnored: { increment: 1 },
        },
      }),
    ]);

    results.push({ userId: user.id, sent: true });
  }

  return results;
}
