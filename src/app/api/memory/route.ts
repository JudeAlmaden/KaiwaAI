import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const personaId = await resolvePersonaId(sp.get("personaId"));

  const memories = await prisma.memory.findMany({
    where: { userId: user.id, personaId },
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const category = CATEGORIES.includes(body.category ?? "") ? body.category! : "fact";
  const importance = Math.min(Math.max(body.importance ?? 1, 1), 5);
  const personaId = await resolvePersonaId(body.personaId);

  // Make sure the persona belongs to the user (or is built-in).
  if (personaId) {
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, OR: [{ builtin: true }, { userId: user.id }] },
      select: { id: true },
    });
    if (!persona)
      return NextResponse.json({ error: "Unknown persona." }, { status: 400 });
  }

  const memory = await prisma.memory.create({
    data: { userId: user.id, personaId, content, category, importance },
  });
  return NextResponse.json({ memory });
}
