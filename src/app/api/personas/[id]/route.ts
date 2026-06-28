import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// PATCH: rename / edit a persona. Built-in presets are locked — only the
// user's own custom personas can be edited.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { name?: string; blurb?: string; personality?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Built-in presets are read-only; only the owner can edit a custom persona.
  if (persona.builtin || persona.userId !== user.id) {
    return NextResponse.json(
      { error: "This persona can't be edited." },
      { status: 403 }
    );
  }

  const patch = {
    ...(typeof body.name === "string" && body.name.trim()
      ? { name: body.name.trim().slice(0, 40) }
      : {}),
    ...(typeof body.blurb === "string" ? { blurb: body.blurb.trim().slice(0, 80) } : {}),
    ...(typeof body.personality === "string" && body.personality.trim()
      ? { personality: body.personality.trim().slice(0, 2000) }
      : {}),
    ...(typeof body.avatar === "string" && body.avatar.trim()
      ? { avatar: body.avatar.trim().slice(0, 8) }
      : {}),
  };

  const updated = await prisma.persona.update({ where: { id }, data: patch });
  return NextResponse.json({
    persona: {
      id: updated.id,
      name: updated.name,
      blurb: updated.blurb,
      avatar: updated.avatar,
      builtin: false,
      mine: true,
    },
  });
}

// DELETE: remove the user's own persona.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona || persona.builtin || persona.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.persona.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
