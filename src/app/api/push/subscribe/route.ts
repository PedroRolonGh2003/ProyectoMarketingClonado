// src\app\api\push\subscribe\route.ts
import { NextResponse } from "next/server";
import { guardarSuscripcionPush } from "@/server/push";
import type { PushSubscriptionRequest } from "@/types/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PushSubscriptionRequest;
    const usuarioId = Number(body.usuarioId);
    const subscription = body.subscription;

    if (
      !usuarioId ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { ok: false, mensaje: "Datos de suscripción inválidos" },
        { status: 400 },
      );
    }

    await guardarSuscripcionPush(usuarioId, subscription);
    return NextResponse.json({ ok: true, mensaje: "Suscripción guardada" });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al guardar la suscripción";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
