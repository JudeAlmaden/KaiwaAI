import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { content?: string; category?: string; importance?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const category = CATEGORIES.includes(body.category ?? "") ? body.category! : "fact";
  const importance = Math.min(Math.max(body.importance ?? 1, 1), 5);

  const memory = await prisma.memory.create({
    data: { userId: user.id, content, category, importance },
  });
  return NextResponse.json({ memory });
}
