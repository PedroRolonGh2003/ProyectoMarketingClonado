import webpush from "web-push";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta variable de entorno ${name}. Configura VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.`,
    );
  }
  return value;
}

let isVapidConfigured = false;
let VAPID_PUBLIC_KEY = "";
let VAPID_PRIVATE_KEY = "";

function ensureVapidConfigured() {
  if (isVapidConfigured) {
    return;
  }
  VAPID_PUBLIC_KEY = requiredEnv("VAPID_PUBLIC_KEY");
  VAPID_PRIVATE_KEY = requiredEnv("VAPID_PRIVATE_KEY");
  webpush.setVapidDetails(
    "mailto:admin@colmarketing.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  isVapidConfigured = true;
}

export function getVapidPublicKey() {
  ensureVapidConfigured();
  return VAPID_PUBLIC_KEY;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: object,
) {
  ensureVapidConfigured();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

type PushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};
