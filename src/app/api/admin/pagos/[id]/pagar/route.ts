import { NextResponse } from "next/server";
import { marcarPagoPagado } from "@/server/pagos";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    await marcarPagoPagado(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
