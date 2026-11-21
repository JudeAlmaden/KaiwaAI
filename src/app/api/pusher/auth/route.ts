import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getPusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher not configured" }, { status: 500 });
  }

  // Pusher sends application/x-www-form-urlencoded by default, or JSON if configured
  let socketId: string | null = null;
  let channelName: string | null = null;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      socketId = body.socket_id;
      channelName = body.channel_name;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    try {
      const formData = await req.formData();
      socketId = formData.get("socket_id") as string | null;
      channelName = formData.get("channel_name") as string | null;
    } catch {
      return NextResponse.json({ error: "Invalid form body" }, { status: 400 });
    }
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "socket_id and channel_name required" }, { status: 400 });
  }

  // Authorization for private group chat channels: private-group-{groupId}
  if (channelName.startsWith("private-group-")) {
    const groupId = channelName.replace("private-group-", "");

    // Verify user is an accepted member of this chat
    const membership = await prisma.chatMember.findFirst({
      where: {
        chatId: groupId,
        userId: user.id,
        kind: "user",
        status: "accepted",
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member of this chat" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
}
