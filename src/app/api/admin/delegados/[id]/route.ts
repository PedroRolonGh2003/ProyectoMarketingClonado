import { NextResponse } from "next/server";
import { editarDelegado, eliminarDelegado } from "@/server/admin";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    await editarDelegado(id, body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    await eliminarDelegado(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
