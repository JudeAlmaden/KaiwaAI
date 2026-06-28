import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listAvailablePersonas } from "@/lib/personas-server";

// GET: built-in personas + the user's own custom personas.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const personas = await listAvailablePersonas(user.id);
  return NextResponse.json({
    personas: personas.map((p) => ({
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      avatar: p.avatar,
      builtin: p.builtin,
      mine: p.userId === user.id,
    })),
  });
}

// POST: create a custom persona.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; blurb?: string; personality?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const personality = (body.personality ?? "").trim();
  if (!name || !personality) {
    return NextResponse.json(
      { error: "Name and personality are required." },
      { status: 400 }
    );
  }

  const persona = await prisma.persona.create({
    data: {
      userId: user.id,
      name: name.slice(0, 40),
      blurb: (body.blurb ?? "").trim().slice(0, 80),
      personality: personality.slice(0, 2000),
      avatar: (body.avatar ?? "🤖").trim().slice(0, 8) || "🤖",
      builtin: false,
    },
  });

  return NextResponse.json({
    persona: {
      id: persona.id,
      name: persona.name,
      blurb: persona.blurb,
      avatar: persona.avatar,
      builtin: false,
      mine: true,
    },
  });
}
