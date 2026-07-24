import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Whether server-side keys are stored.
// If ?sync=true, returns decrypted keys so user can sync keys to a new device.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const wantsSync = url.searchParams.get("sync") === "true";

  if (!user.geminiKeyEnc) {
    return NextResponse.json({ stored: false, keys: [] });
  }

  if (wantsSync) {
    try {
      const decrypted = decryptSecret(user.geminiKeyEnc);
      let keys: string[] = [];
      try {
        const parsed = JSON.parse(decrypted);
        keys = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        keys = [decrypted];
      }
      return NextResponse.json({ stored: true, keys });
    } catch {
      return NextResponse.json({ error: "Failed to decrypt server key" }, { status: 500 });
    }
  }

  return NextResponse.json({ stored: true });
}

// Store (encrypted) the user's Gemini key(s) for server-side use. Opt-in.
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

// Remove the server-side keys
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { geminiKeyEnc: null } });
  return NextResponse.json({ stored: false });
}
