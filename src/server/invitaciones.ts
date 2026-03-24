import { getPool } from "@/lib/db";
import crypto from "crypto";

export interface InvitacionDB {
  idInvitacion: number;
  token: string;
  usada: number;
  fechaCreacion: string;
}

export async function obtenerInvitacionPorToken(
  token: string,
): Promise<InvitacionDB | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT idInvitacion, token, usada, fechaCreacion FROM Invitacion WHERE token = ?",
    [token],
  );
  const list = rows as InvitacionDB[];
  if (list.length === 0) return null;
  return list[0];
}

export async function marcarInvitacionUsada(
  idInvitacion: number,
): Promise<void> {
  const pool = getPool();
  await pool.query("UPDATE Invitacion SET usada = 1 WHERE idInvitacion = ?", [
    idInvitacion,
  ]);
}

export async function validarInvitacionToken(
  token: string,
): Promise<{ ok: boolean; mensaje?: string; invitacion?: InvitacionDB }> {
  if (!token) {
    return { ok: false, mensaje: "Token de invitación obligatorio" };
  }
  const invitacion = await obtenerInvitacionPorToken(token);
  if (!invitacion) {
    return { ok: false, mensaje: "Token de invitación inválido" };
  }
  if (invitacion.usada === 1) {
    return { ok: false, mensaje: "El token de invitación ya fue usado" };
  }
  return { ok: true, invitacion };
}

export async function crearInvitacion(): Promise<{
  ok: boolean;
  mensaje?: string;
  token?: string;
}> {
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const pool = getPool();
    await pool.query(
      "INSERT INTO Invitacion (token, usada, fechaCreacion) VALUES (?, 0, NOW())",
      [token],
    );
    return { ok: true, token };
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al crear invitación";
    return { ok: false, mensaje };
  }
}
