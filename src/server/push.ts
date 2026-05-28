// src\server\push.ts
import { getPool } from "@/lib/db";
import { sendPushNotification } from "@/lib/webpush";
import type { PushSubscriptionBody } from "@/types/push";

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function guardarSuscripcionPush(
  usuarioId: number,
  subscription: PushSubscriptionBody,
) {
  const pool = getPool();

  const [rows] = await pool.query(
    "SELECT endpoint FROM SuscripcionPush WHERE endpoint = ?",
    [subscription.endpoint],
  );

  const existing = rows as { endpoint: string }[];

  if (existing.length > 0) {
    await pool.query(
      `UPDATE SuscripcionPush
       SET idUsuario = ?, p256dh = ?, auth = ?, fechaRegistro = NOW()
       WHERE endpoint = ?`,
      [
        usuarioId,
        subscription.keys.p256dh,
        subscription.keys.auth,
        subscription.endpoint,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO SuscripcionPush (idUsuario, endpoint, p256dh, auth, fechaRegistro)
       VALUES (?, ?, ?, ?, NOW())`,
      [
        usuarioId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
      ],
    );
  }
}

export async function obtenerSuscripcionesUsuario(
  usuarioId: number,
): Promise<PushSubscriptionBody[]> {
  const pool = getPool();

  const [rows] = await pool.query(
    "SELECT endpoint, p256dh, auth FROM SuscripcionPush WHERE idUsuario = ?",
    [usuarioId],
  );

  const subscriptions = rows as PushRow[];

  return subscriptions.map((row) => ({
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  }));
}

export async function eliminarSuscripcionesUsuario(usuarioId: number) {
  const pool = getPool();
  await pool.query("DELETE FROM SuscripcionPush WHERE idUsuario = ?", [
    usuarioId,
  ]);
}

export async function tieneSuscripcionesPushActivas(
  usuarioId: number,
): Promise<boolean> {
  const subs = await obtenerSuscripcionesUsuario(usuarioId);
  return subs.length > 0;
}

export async function eliminarSuscripcionPorEndpoint(
  endpoint: string,
): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM SuscripcionPush WHERE endpoint = ?", [
    endpoint,
  ]);
}

function pushErrorStatusCode(reason: unknown): number {
  if (reason && typeof reason === "object" && "statusCode" in reason) {
    return Number((reason as { statusCode: number }).statusCode) || 0;
  }
  return 0;
}

function pushErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
};

export async function enviarPushAUsuario(
  usuarioId: number,
  payload: PushPayload,
): Promise<{
  enviados: number;
  fallidos: number;
  sinSuscripciones: boolean;
  errores: string[];
}> {
  const subs = await obtenerSuscripcionesUsuario(usuarioId);

  if (subs.length === 0) {
    return { enviados: 0, fallidos: 0, sinSuscripciones: true, errores: [] };
  }

  const fullPayload: PushPayload = {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/delegado/pendientes",
    icon: payload.icon ?? "/LogoColMarketing.jpg",
    badge: payload.badge ?? "/LogoColMarketing.jpg",
  };

  const results = await Promise.allSettled(
    subs.map((sub) => sendPushNotification(sub, fullPayload)),
  );

  let enviados = 0;
  const errores: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      enviados++;
      continue;
    }

    const reason = result.reason;
    const statusCode = pushErrorStatusCode(reason);
    errores.push(pushErrorMessage(reason));

    if (statusCode === 404 || statusCode === 410) {
      await eliminarSuscripcionPorEndpoint(subs[i].endpoint);
    }
  }

  return {
    enviados,
    fallidos: subs.length - enviados,
    sinSuscripciones: false,
    errores,
  };
}
