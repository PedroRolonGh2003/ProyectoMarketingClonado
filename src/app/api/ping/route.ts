import { NextResponse } from "next/server";
import { pingDb } from "@/server/ping";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pingDb();
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
