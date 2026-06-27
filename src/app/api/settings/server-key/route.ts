import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/crypto";

// Whether server-side keys are stored (never returns the keys themselves).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ stored: Boolean(user.geminiKeyEnc) });
}

// Store (encrypted) the user's Gemini key(s) for server-side use. Opt-in.
// Accepts `keys: string[]` (preferred) or a single `key: string`. All keys are
// stored as one encrypted JSON array so the server can rotate like the chat.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key?: string; keys?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const keys = (body.keys ?? (body.key ? [body.key] : []))
    .map((k) => (k ?? "").trim())
    .filter(Boolean);

  if (keys.length === 0) {
    return NextResponse.json({ error: "At least one key required." }, { status: 400 });
  }

  try {
    const enc = encryptSecret(JSON.stringify(keys));
    await prisma.user.update({
      where: { id: user.id },
      data: { geminiKeyEnc: enc },
    });
    return NextResponse.json({ stored: true, count: keys.length });
  } catch {
    return NextResponse.json(
      { error: "Could not store the keys (is ENCRYPTION_KEY set?)." },
      { status: 500 }
    );
  }
}

// Remove the server-side keys (server features stop; chat still uses the
// client-side keys).
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { geminiKeyEnc: null } });
  return NextResponse.json({ stored: false });
}
