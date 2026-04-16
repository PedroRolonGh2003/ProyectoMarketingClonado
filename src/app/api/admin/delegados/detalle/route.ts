import { NextResponse } from "next/server";
import { listarDelegadosDetalle } from "@/server/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const delegados = await listarDelegadosDetalle();
    return NextResponse.json({ ok: true, delegados });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
