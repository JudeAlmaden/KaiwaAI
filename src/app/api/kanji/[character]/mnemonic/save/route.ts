import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PUT } from "../route";

// Legacy endpoint: same storage path as PUT, but it keeps its original
// contract of rejecting a blank mnemonic instead of deleting the note.
export async function POST(
  req: Request,
  context: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { mnemonic?: unknown } | null = null;
  try {
    body = await req.clone().json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body.mnemonic !== "string" || !body.mnemonic.trim()) {
    return NextResponse.json({ error: "Mnemonic text required" }, { status: 400 });
  }

  return PUT(req, context);
}
