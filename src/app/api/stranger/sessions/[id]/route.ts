import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStrangerChatEnabled } from "@/lib/stranger/config";
import { maybeRunStrangerCleanup } from "@/lib/stranger/cleanup";
import { getSessionView } from "@/lib/stranger/service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isStrangerChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeRunStrangerCleanup();

  const { id } = await params;
  const after = new URL(req.url).searchParams.get("after") ?? undefined;
  const view = await getSessionView(user.id, id, after || undefined);
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(view);
}
