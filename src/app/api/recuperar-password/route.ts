import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  EmailConfigError,
  EmailDeliveryError,
  enviarCodigoRecuperacion,
} from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { correo } = await request.json();
  if (!correo) {
    return NextResponse.json({ ok: false, mensaje: "Correo requerido" }, { status: 400 });
  }

  const pool = getPool();
  const correoNorm = String(correo).trim();

  try {
    const [rows] = await pool.query(
      "SELECT idUsuario, nombre FROM Usuario WHERE correo = ? AND activo = 1",
      [correoNorm],
    );
    const list = rows as { idUsuario: number; nombre: string }[];

    // Siempre respondemos ok para no revelar si el correo existe
    if (list.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const usuario = list[0];
    const codigo  = Math.floor(100000 + Math.random() * 900000).toString();
    const expira  = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO ResetPassword (idUsuario, token, expira, usado)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE token = ?, expira = ?, usado = 0`,
      [usuario.idUsuario, codigo, expira, codigo, expira],
    );

    await enviarCodigoRecuperacion(correoNorm, usuario.nombre, codigo);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmailConfigError || err instanceof EmailDeliveryError) {
      return NextResponse.json({ ok: false, mensaje: err.message }, { status: 503 });
    }
    console.error("[recuperar-password]", err);
    return NextResponse.json(
      { ok: false, mensaje: "Error al enviar el código. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }
}
