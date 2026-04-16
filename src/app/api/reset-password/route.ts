import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { correo, codigo, nuevaPassword } = await request.json();

  if (!correo || !codigo || !nuevaPassword) {
    return NextResponse.json({ ok: false, mensaje: "Datos incompletos" }, { status: 400 });
  }

  const pool = getPool();

  try {
    const [rows] = await pool.query(
      `SELECT rp.idUsuario, rp.expira, rp.usado
       FROM ResetPassword rp
       JOIN Usuario u ON u.idUsuario = rp.idUsuario
       WHERE u.correo = ? AND rp.token = ?`,
      [correo.trim().toLowerCase(), codigo],
    );
    const list = rows as { idUsuario: number; expira: Date; usado: number }[];

    if (list.length === 0) {
      return NextResponse.json({ ok: false, mensaje: "Código incorrecto" }, { status: 400 });
    }

    const reset = list[0];

    if (reset.usado) {
      return NextResponse.json({ ok: false, mensaje: "Este código ya fue usado" }, { status: 400 });
    }

    if (new Date() > new Date(reset.expira)) {
      return NextResponse.json({ ok: false, mensaje: "El código ha expirado" }, { status: 400 });
    }

    const nuevoHash = await hashPassword(nuevaPassword);

    await pool.query(
      "UPDATE Usuario SET hashContrasena = ? WHERE idUsuario = ?",
      [nuevoHash, reset.idUsuario],
    );

    await pool.query(
      "UPDATE ResetPassword SET usado = 1 WHERE idUsuario = ?",
      [reset.idUsuario],
    );

    return NextResponse.json({ ok: true, mensaje: "Contraseña actualizada correctamente" });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
