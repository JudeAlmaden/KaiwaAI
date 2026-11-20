import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";
import { MEMORY_CATEGORIES, upsertMemory } from "@/lib/memory-upsert";

// GET: memories for a persona (default Kai) or for one conversation.
// `?chatId=` returns the caller's notes for that group/DM, which is a different
// bucket from Kai's global memory.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const chatId = sp.get("chatId");

  if (chatId) {
    const member = await prisma.chatMember.findFirst({
      where: { chatId, userId: user.id, kind: "user", status: "accepted" },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

    const memories = await prisma.memory.findMany({
      where: { userId: user.id, chatId, supersededById: null },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ memories });
  }

  const personaId = await resolvePersonaId(sp.get("personaId"));
  const memories = await prisma.memory.findMany({
    // chatId: null keeps conversation notes out of the persona diary.
    where: { userId: user.id, personaId, chatId: null, supersededById: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    content?: string;
    category?: string;
    importance?: number;
    personaId?: string | null;
    chatId?: string | null;
    supersedesId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const category = (MEMORY_CATEGORIES as readonly string[]).includes(body.category ?? "")
    ? body.category!
    : "fact";
  const importance = Math.min(Math.max(body.importance ?? 1, 1), 5);
  const chatId = typeof body.chatId === "string" && body.chatId ? body.chatId : null;

  if (chatId) {
    const member = await prisma.chatMember.findFirst({
      where: { chatId, userId: user.id, kind: "user", status: "accepted" },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Not a member." }, { status: 403 });

    const result = await upsertMemory({
      userId: user.id,
      personaId: null,
      chatId,
      content,
      category,
      importance,
      supersedesId: body.supersedesId,
    });
    return NextResponse.json(result);
  }

  const personaId = await resolvePersonaId(body.personaId);
  if (personaId) {
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, OR: [{ builtin: true }, { userId: user.id }] },
      select: { id: true },
    });
    if (!persona)
      return NextResponse.json({ error: "Unknown persona." }, { status: 400 });
  }

  const result = await upsertMemory({
    userId: user.id,
    personaId,
    chatId: null,
    content,
    category,
    importance,
    supersedesId: body.supersedesId,
  });

  return NextResponse.json(result);
}
