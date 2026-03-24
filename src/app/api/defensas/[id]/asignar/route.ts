import { NextResponse } from "next/server";
import { asignarDelegado } from "@/server/defensas";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function POST(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const idDelegado = Number(body.idDelegado);
    await asignarDelegado(id, idDelegado);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
