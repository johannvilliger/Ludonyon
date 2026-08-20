import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Notifications push non configurées (variables VAPID manquantes)"
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function pushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return;
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // abonnement expiré / révoqué côté navigateur : on l'oublie
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    })
  );
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
