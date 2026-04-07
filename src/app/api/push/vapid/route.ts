import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/webpush";

export const runtime = "nodejs";

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ ok: true, publicKey });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la clave VAPID";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
