import { NextResponse } from "next/server";
import { crearInvitacion } from "@/server/invitaciones";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const resultado = await crearInvitacion();
    if (!resultado.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: resultado.mensaje || "Error al crear invitación",
        },
        { status: 500 },
      );
    }
    const link = `${request.headers.get("origin") || "http://localhost:3000"}/signup?token=${resultado.token}`;
    return NextResponse.json({ ok: true, token: resultado.token, link });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
