import { NextResponse } from "next/server";
import {
  actualizarEstadoAsignacion,
  ValidationError,
} from "@/server/asignacion";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { estado, justificacion } = body;
    await actualizarEstadoAsignacion(id, estado, justificacion);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = err instanceof ValidationError ? 400 : 500;
    return NextResponse.json({ ok: false, mensaje: message }, { status });
  }
}
