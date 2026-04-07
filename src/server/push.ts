// src\server\push.ts
import { getPool } from "@/lib/db";
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
