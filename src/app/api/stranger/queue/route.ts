import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStrangerChatEnabled } from "@/lib/stranger/config";
import { maybeRunStrangerCleanup } from "@/lib/stranger/cleanup";
import { joinQueue, leaveQueue, queueState } from "@/lib/stranger/service";

function disabled() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// GET doubles as the waiting poll: it reports the current state and retries the
// match, so a partner who arrived after the last POST still gets paired.
export async function GET() {
  if (!isStrangerChatEnabled()) return disabled();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeRunStrangerCleanup();
  return NextResponse.json(await queueState(user.id));
}

export async function POST() {
  if (!isStrangerChatEnabled()) return disabled();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeRunStrangerCleanup();
  return NextResponse.json(await joinQueue(user.id));
}

export async function DELETE() {
  if (!isStrangerChatEnabled()) return disabled();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await leaveQueue(user.id);
  return NextResponse.json({ ok: true });
}
