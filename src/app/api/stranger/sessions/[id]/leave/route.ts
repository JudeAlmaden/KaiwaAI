import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStrangerChatEnabled } from "@/lib/stranger/config";
import { leaveSession } from "@/lib/stranger/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isStrangerChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let reason: "skip" | "leave" = "leave";
  try {
    const body = (await req.json()) as { reason?: string };
    if (body.reason === "skip") reason = "skip";
  } catch {
    // no body = plain leave
  }

  const { id } = await params;
  const ok = await leaveSession(user.id, id, reason);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
