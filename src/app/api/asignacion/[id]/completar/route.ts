import { NextResponse } from "next/server";
import { completarAsignacion } from "@/server/asignacion";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { comentarios } = body;
    await completarAsignacion(id, comentarios);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
