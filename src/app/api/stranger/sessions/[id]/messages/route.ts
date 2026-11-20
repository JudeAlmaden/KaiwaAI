import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStrangerChatEnabled } from "@/lib/stranger/config";
import { maybeRunStrangerCleanup } from "@/lib/stranger/cleanup";
import { postMessage } from "@/lib/stranger/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isStrangerChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeRunStrangerCleanup();

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id } = await params;
  const result = await postMessage(user.id, id, body.content ?? "");

  if (!result.ok) {
    if (result.code === "rate-limited") {
      return NextResponse.json(
        { error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }
    if (result.code === "too-long") {
      return NextResponse.json(
        { error: "Message too long." },
        { status: 400 }
      );
    }
    if (result.code === "empty") {
      return NextResponse.json({ error: "Message required." }, { status: 400 });
    }
    return NextResponse.json({ error: "Chat unavailable." }, { status: 404 });
  }

  return NextResponse.json({ message: result.message });
}
