// src/app/api/admin/defensas/[idDefensa]/recordatorio/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { obtenerSuscripcionesUsuario } from "@/server/push";
import { sendPushNotification } from "@/lib/webpush";

export const runtime = "nodejs";

interface DefensaDelegadoRow extends RowDataPacket {
  idUsuario: number | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { idDefensa: string } },
) {
  try {
    const idDefensa = params.idDefensa;

    if (!idDefensa) {
      return NextResponse.json(
        { ok: false, mensaje: "idDefensa es requerido" },
        { status: 400 },
      );
    }

    const pool = getPool();

    const [rows] = await pool.query<DefensaDelegadoRow[]>(
      `SELECT u.idUsuario
       FROM Defensa d
       LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
       LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
       WHERE d.idDefensa = ?`,
      [idDefensa],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, mensaje: "Defensa no encontrada" },
        { status: 404 },
      );
    }

    const idDelegado = rows[0]?.idUsuario;

    if (!idDelegado) {
      return NextResponse.json(
        { ok: false, mensaje: "La defensa no tiene delegado asignado" },
        { status: 400 },
      );
    }

    const subs = await obtenerSuscripcionesUsuario(idDelegado);

    if (subs.length === 0) {
      return NextResponse.json({
        ok: true,
        mensaje: "Recordatorio enviado (sin suscripciones activas)",
      });
    }

    const payload = {
      title: "Recordatorio de defensa",
      body: "Tienes una defensa asignada próximamente. Revisa los detalles en la app.",
      url: "/delegado/pendientes",
    };

    const results = await Promise.allSettled(
      subs.map((sub) => sendPushNotification(sub, payload)),
    );

    const enviados = results.filter((r) => r.status === "fulfilled").length;

    if (enviados > 0) {
      return NextResponse.json({
        ok: true,
        mensaje: "Recordatorio enviado",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        mensaje: "No se pudo enviar el recordatorio",
      },
      { status: 500 },
    );
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al enviar recordatorio";

    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
