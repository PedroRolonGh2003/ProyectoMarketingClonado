import { NextResponse } from "next/server";
import { confirmarPago } from "@/server/pagos";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    let idDefensa: number | undefined;
    try {
      const body = await request.json();
      if (body?.idDefensa != null) {
        idDefensa = Number(body.idDefensa);
      }
    } catch {
      /* body vacío */
    }

    await confirmarPago(id, idDefensa);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
