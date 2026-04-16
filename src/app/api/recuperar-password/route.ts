import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { enviarCodigoRecuperacion } from "@/lib/email";

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

    await enviarCodigoRecuperacion(correo.trim(), usuario.nombre, codigo);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
