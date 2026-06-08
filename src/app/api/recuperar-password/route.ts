import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { SmtpEmailError, enviarCorreoRecuperacion } from "@/lib/email";

export const runtime = "nodejs";

const MENSAJE_GENERICO_OK =
  "Si el correo está registrado, enviaremos un código de recuperación.";

export async function POST(request: Request) {
  const { correo } = await request.json();
  if (!correo) {
    return NextResponse.json({ ok: false, mensaje: "Correo requerido" }, { status: 400 });
  }

  const pool = getPool();

  try {
    const [rows] = await pool.query(
      "SELECT idUsuario, nombre FROM Usuario WHERE correo = ? AND activo = 1",
      [correo.trim().toLowerCase()],
    );
    const list = rows as { idUsuario: number; nombre: string }[];

    if (list.length === 0) {
      return NextResponse.json({ ok: true, mensaje: MENSAJE_GENERICO_OK });
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

    await enviarCorreoRecuperacion({
      to: correo.trim(),
      codigo,
      nombre: usuario.nombre,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SmtpEmailError) {
      console.error("[recuperar-password] fallo SMTP:", err.message);
      return NextResponse.json({ ok: false, mensaje: err.message }, { status: 503 });
    }

    console.error("[recuperar-password]", err);
    return NextResponse.json(
      { ok: false, mensaje: "Error interno al procesar la solicitud." },
      { status: 500 },
    );
  }
}
