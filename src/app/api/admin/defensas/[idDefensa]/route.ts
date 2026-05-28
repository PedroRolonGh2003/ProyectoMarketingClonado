import { NextRequest, NextResponse } from "next/server";
import { actualizarDefensa, BusinessError } from "@/server/defensas";

export const runtime = "nodejs";

type Ctx = { params: { idDefensa: string } };

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const body = await request.json();
    await actualizarDefensa(params.idDefensa, body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = err instanceof BusinessError ? 400 : 500;
    return NextResponse.json({ ok: false, mensaje: message }, { status });
  }
}
