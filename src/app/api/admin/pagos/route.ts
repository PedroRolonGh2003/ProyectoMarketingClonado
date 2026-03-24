import { NextResponse } from "next/server";
import { listarPagosAdmin } from "@/server/pagos";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pagos = await listarPagosAdmin();
    return NextResponse.json({ ok: true, pagos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
