import { NextResponse } from "next/server";
import { setUsuarioActivo } from "@/server/admin";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { activo } = body;
    await setUsuarioActivo(id, Boolean(activo));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
