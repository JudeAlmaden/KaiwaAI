import "server-only";
import * as webpush from "web-push";
import { prisma } from "./prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

// Configure VAPID details if set
if (publicKey && privateKey) {
  webpush.setVapidDetails(
    "mailto:support@kaiwaai.com",
    publicKey,
    privateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

/**
 * Sends a push notification to all registered subscriptions of a user.
 * Deletes any subscriptions that are rejected by the push service (410/404).
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sentCount: number; failedCount: number }> {
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys are not configured. Skipping push notification.");
    return { sentCount: 0, failedCount: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sentCount: 0, failedCount: 0 };
  }

  const payloadString = JSON.stringify(payload);
  let sentCount = 0;
  let failedCount = 0;

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      );
      sentCount++;
    } catch (error) {
      console.error(`Failed to send push notification to sub ${sub.id}:`, error);
      failedCount++;
      // Clean up invalid or expired subscriptions (404/410)
      const pushError = error as { statusCode?: number };
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        }).catch((e) => {
          console.error(`Failed to clean up subscription ${sub.id}:`, e);
        });
      }
    }
  });

  await Promise.all(sendPromises);

  return { sentCount, failedCount };
}
