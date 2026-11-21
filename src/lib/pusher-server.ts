import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster =
    process.env.PUSHER_CLUSTER ||
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER ||
    "ap1";

  if (!appId || !key || !secret) {
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherInstance;
}

export async function triggerGroupEvent(
  groupId: string,
  event: string,
  data: unknown
): Promise<boolean> {
  const pusher = getPusherServer();
  if (!pusher) return false;

  try {
    await pusher.trigger(`group-${groupId}`, event, data);
    return true;
  } catch (err) {
    console.warn("Pusher trigger failed:", err);
    return false;
  }
}
