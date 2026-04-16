import { NextResponse } from "next/server";
import { crearDefensa, getDefensasLista } from "@/server/defensas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const defensas = await getDefensasLista();
    return NextResponse.json({ ok: true, defensas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await crearDefensa(body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
