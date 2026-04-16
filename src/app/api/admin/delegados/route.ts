import { NextResponse } from "next/server";
import { crearDelegado, listarDelegados } from "@/server/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const delegados = await listarDelegados();
    return NextResponse.json({ ok: true, delegados });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await crearDelegado(body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
