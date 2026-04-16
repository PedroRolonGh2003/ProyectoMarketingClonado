import { NextResponse } from "next/server";
import { eliminarDefensa, getDefensasDelegado } from "@/server/defensas";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const defensas = await getDefensasDelegado(id);
    return NextResponse.json({ ok: true, defensas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    await eliminarDefensa(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
