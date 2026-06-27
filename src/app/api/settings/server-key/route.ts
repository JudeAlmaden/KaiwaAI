import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/crypto";

// Whether a server-side key is stored (never returns the key itself).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ stored: Boolean(user.geminiKeyEnc) });
}

// Store (encrypted) the user's Gemini key for server-side use. Opt-in.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const key = (body.key ?? "").trim();
  if (!key) return NextResponse.json({ error: "Key required." }, { status: 400 });

  try {
    const enc = encryptSecret(key);
    await prisma.user.update({ where: { id: user.id }, data: { geminiKeyEnc: enc } });
    return NextResponse.json({ stored: true });
  } catch {
    return NextResponse.json(
      { error: "Could not store the key (is ENCRYPTION_KEY set?)." },
      { status: 500 }
    );
  }
}

// Remove the server-side key (server features stop working; chat still uses the
// client-side key).
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { geminiKeyEnc: null } });
  return NextResponse.json({ stored: false });
}
