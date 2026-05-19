import { NextResponse } from "next/server";
import {
  contarPagosPendientesAdmin,
  listarPagosPendientesAdmin,
} from "@/server/pagos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pagos = (await listarPagosPendientesAdmin()) as unknown[];
    return NextResponse.json({
      ok: true,
      pagos,
      pendientes: pagos.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
