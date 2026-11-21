import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listAvailablePersonas, resolveKaiId } from "@/lib/personas-server";

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
      // "kai" | "kai_mode" | "custom" — kai modes are personalities, not people.
      kind: p.kind,
      label: p.label,
      modeOfId: p.modeOfId,
      mine: p.userId === user.id,
    })),
  });
}

// POST: create a custom persona or custom attitude for Kai.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    label?: string;
    blurb?: string;
    personality?: string;
    avatar?: string;
    kind?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name ?? body.label ?? "").trim();
  const personality = (body.personality ?? "").trim();
  if (!name || !personality) {
    return NextResponse.json(
      { error: "Name and personality are required." },
      { status: 400 }
    );
  }

  const isKaiMode = body.kind === "kai_mode";
  const kaiId = isKaiMode ? await resolveKaiId() : null;
  const label = (body.label ?? body.name ?? "").trim().slice(0, 24);

  const persona = await prisma.persona.create({
    data: {
      userId: user.id,
      name: name.slice(0, 40),
      label: isKaiMode ? label || name.slice(0, 24) : null,
      blurb: (body.blurb ?? "").trim().slice(0, 80),
      personality: personality.slice(0, 2000),
      avatar: (body.avatar ?? (isKaiMode ? "✨" : "🤖")).trim().slice(0, 8) || (isKaiMode ? "✨" : "🤖"),
      builtin: false,
      kind: isKaiMode ? "kai_mode" : "custom",
      modeOfId: kaiId,
    },
    select: {
      id: true,
      name: true,
      label: true,
      blurb: true,
      avatar: true,
      personality: true,
      builtin: true,
      kind: true,
      modeOfId: true,
    },
  });

  return NextResponse.json({
    persona: {
      id: persona.id,
      name: persona.name,
      label: persona.label,
      blurb: persona.blurb,
      avatar: persona.avatar,
      personality: persona.personality,
      builtin: false,
      kind: persona.kind,
      modeOfId: persona.modeOfId,
      mine: true,
    },
  });
}
