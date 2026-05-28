import { NextResponse } from "next/server";
import { tieneSuscripcionesPushActivas } from "@/server/push";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const usuarioId = Number(url.searchParams.get("usuarioId") ?? "0");
  if (!usuarioId) {
    return NextResponse.json(
      { ok: false, mensaje: "usuarioId es requerido" },
      { status: 400 },
    );
  }

  try {
    const activo = await tieneSuscripcionesPushActivas(usuarioId);
    return NextResponse.json({ ok: true, activo });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al consultar el estado de notificaciones";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
