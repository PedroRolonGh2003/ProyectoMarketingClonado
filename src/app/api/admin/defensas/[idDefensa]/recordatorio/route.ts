// src/app/api/admin/defensas/[idDefensa]/recordatorio/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { enviarPushAUsuario } from "@/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DefensaDelegadoRow extends RowDataPacket {
  idUsuario: number | null;
}

async function resolveIdDefensa(
  params: { idDefensa: string } | Promise<{ idDefensa: string }>,
  request: NextRequest,
): Promise<string> {
  const resolved = await Promise.resolve(params);
  if (resolved?.idDefensa && resolved.idDefensa !== "undefined") {
    return resolved.idDefensa;
  }

  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const defensasIndex = segments.indexOf("defensas");
  if (defensasIndex >= 0 && segments[defensasIndex + 1]) {
    return segments[defensasIndex + 1];
  }

  return "";
}

export async function POST(
  request: NextRequest,
  context: { params: { idDefensa: string } | Promise<{ idDefensa: string }> },
) {
  try {
    const idDefensa = await resolveIdDefensa(context.params, request);

    if (!idDefensa) {
      return NextResponse.json(
        { ok: false, mensaje: "idDefensa es requerido" },
        { status: 400 },
      );
    }

    let idDelegadoBody = 0;
    try {
      const body = await request.json();
      idDelegadoBody = Number(body?.idDelegado ?? 0);
    } catch {
      // body opcional
    }

    const pool = getPool();

    const [rows] = await pool.query<DefensaDelegadoRow[]>(
      `SELECT u.idUsuario
       FROM Defensa d
       LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
       LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario AND u.activo = 1
       WHERE d.idDefensa = ?
       LIMIT 1`,
      [idDefensa],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, mensaje: "Defensa no encontrada" },
        { status: 404 },
      );
    }

    const idDelegado = Number(rows[0]?.idUsuario || idDelegadoBody);

    if (!idDelegado) {
      return NextResponse.json(
        { ok: false, mensaje: "La defensa no tiene delegado asignado" },
        { status: 400 },
      );
    }

    const resultado = await enviarPushAUsuario(idDelegado, {
      title: "Recordatorio de defensa",
      body: "Tienes una defensa asignada próximamente. Revisa los detalles en la app.",
      url: "/delegado/pendientes",
    });

    if (resultado.sinSuscripciones) {
      return NextResponse.json(
        {
          ok: false,
          mensaje:
            "El delegado no tiene notificaciones activadas. Debe entrar como delegado y pulsar «Activar notificaciones».",
        },
        { status: 400 },
      );
    }

    if (resultado.enviados > 0) {
      return NextResponse.json({
        ok: true,
        mensaje: "Recordatorio enviado",
        enviados: resultado.enviados,
        fallidos: resultado.fallidos,
      });
    }

    const detalle = resultado.errores[0] ?? "";
    const mensaje = detalle.includes("VAPID")
      ? "Error de configuración VAPID en el servidor. Revisa las variables en Vercel."
      : "No se pudo enviar el recordatorio. El delegado debe volver a activar notificaciones en su cuenta.";

    return NextResponse.json(
      { ok: false, mensaje, detalle },
      { status: 500 },
    );
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al enviar recordatorio";

    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
