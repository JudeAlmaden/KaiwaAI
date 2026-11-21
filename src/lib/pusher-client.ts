import PusherClient from "pusher-js";

let clientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1";

  if (!key) return null;

  if (!clientInstance) {
    clientInstance = new PusherClient(key, {
      cluster,
      forceTLS: true,
    });
  }

  return clientInstance;
}
