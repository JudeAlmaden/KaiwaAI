import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";
import { MEMORY_CATEGORIES, upsertMemory } from "@/lib/memory-upsert";

/** Bulk save memory suggestions (auto-memory mode) — one request instead of N. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    personaId?: string | null;
    items?: Array<{
      content?: string;
      category?: string;
      importance?: number;
      supersedesId?: string | null;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items required." }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: "Too many items (max 20)." }, { status: 400 });
  }

  const personaId = await resolvePersonaId(body.personaId);
  const results = [];

  for (const item of items) {
    const content = (item.content ?? "").trim();
    if (!content) continue;
    const category = (MEMORY_CATEGORIES as readonly string[]).includes(item.category ?? "")
      ? item.category!
      : "fact";
    const importance = Math.min(Math.max(item.importance ?? 1, 1), 5);
    const r = await upsertMemory({
      userId: user.id,
      personaId,
      content,
      category,
      importance,
      supersedesId: item.supersedesId,
    });
    results.push(r);
  }

  return NextResponse.json({ results });
}
