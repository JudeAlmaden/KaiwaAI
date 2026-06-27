import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.memory.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: { content?: string; category?: string; importance?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: { content?: string; category?: string; importance?: number } = {};
  if (typeof body.content === "string" && body.content.trim()) {
    data.content = body.content.trim();
  }
  if (body.category && CATEGORIES.includes(body.category)) {
    data.category = body.category;
  }
  if (typeof body.importance === "number") {
    data.importance = Math.min(Math.max(body.importance, 1), 5);
  }

  const memory = await prisma.memory.update({ where: { id }, data });
  return NextResponse.json({ memory });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.memory.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.memory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
