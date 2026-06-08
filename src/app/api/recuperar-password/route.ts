import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  ERROR_ENVIO_RECUPERACION,
  enviarCorreoRecuperacion,
} from "@/lib/email";

export const runtime = "nodejs";

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

    await enviarCorreoRecuperacion({
      to: correo.trim(),
      codigo,
      nombre: usuario.nombre,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === ERROR_ENVIO_RECUPERACION) {
      console.error("[recuperar-password] fallo SMTP:", err);
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "No se pudo enviar el correo de recuperación. Revisa la configuración del correo SMTP.",
        },
        { status: 503 },
      );
    }

    console.error("[recuperar-password]", err);
    return NextResponse.json(
      { ok: false, mensaje: "Error interno al procesar la solicitud." },
      { status: 500 },
    );
  }
}
