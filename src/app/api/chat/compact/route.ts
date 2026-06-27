import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor } from "@/lib/day";

const KEEP_RECENT = 8;

// Compact the conversation: keep the most recent messages, replace the older
// ones with a single summary note (so Kai still has the gist). The client
// generates the summary text (BYOK Gemini) and sends it here.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { summary?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const all = await prisma.message.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (all.length <= KEEP_RECENT) {
    return NextResponse.json({ ok: true, compacted: 0 });
  }

  const older = all.slice(0, all.length - KEEP_RECENT);
  const olderIds = older.map((m) => m.id);
  const summary = (body.summary ?? "").trim();
  const dayKey = dayKeyFor(new Date(), user.timezone);

  await prisma.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { id: { in: olderIds } } });
    if (summary) {
      // Insert the recap as a Kai message dated just before the kept ones.
      const earliestKept = all[all.length - KEEP_RECENT].createdAt;
      await tx.message.create({
        data: {
          userId: user.id,
          role: "kai",
          content: `(recap) ${summary}`,
          dayKey,
          summarized: true,
          createdAt: new Date(earliestKept.getTime() - 1000),
        },
      });
    }
  });

  return NextResponse.json({ ok: true, compacted: older.length });
}

// How many messages would be compacted (for the menu label / preview).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.message.count({ where: { userId: user.id } });
  return NextResponse.json({ compactable: Math.max(0, count - KEEP_RECENT) });
}
