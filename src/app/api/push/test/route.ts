// src/app/api/push/test/route.ts
import { NextResponse } from "next/server";
import { obtenerSuscripcionesUsuario } from "@/server/push";
import { sendPushNotification } from "@/lib/webpush";
import type { PushTestRequest } from "@/types/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PushTestRequest;
    const usuarioId = Number(body.idUsuario);

    if (!usuarioId) {
      return NextResponse.json(
        { ok: false, mensaje: "idUsuario es requerido" },
        { status: 400 },
      );
    }

    const subs = await obtenerSuscripcionesUsuario(usuarioId);

    if (subs.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "No se encontraron suscripciones para ese usuario",
        },
        { status: 404 },
      );
    }

    const payload = {
      title: body.title || "Recordatorio de defensa",
      body:
        body.body || "Tienes defensas pendientes. Abre la app para revisarlas.",
      url: body.url || "/delegado/pendientes",
      icon: "/LogoColMarketing.jpg",
      badge: "/LogoColMarketing.jpg",
    };

    const results = await Promise.allSettled(
      subs.map((sub) => sendPushNotification(sub, payload)),
    );

    // Debug: ver qué pasó con cada envío
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`❌ Push falló en suscripción ${index}:`, result.reason);
      } else {
        console.log(`✅ Push enviado correctamente a suscripción ${index}`);
      }
    });

    const enviados = results.filter((r) => r.status === "fulfilled").length;
    const fallidos = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ ok: true, enviados, fallidos });
  } catch (error) {
    console.error("PUSH TEST ERROR:", error);

    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al enviar la notificación";

    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
