import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = getPool();

    const [evidencia] = await pool.query("DESCRIBE Evidencia");
    const [asignacion] = await pool.query("DESCRIBE AsignacionDelegado");
    const [defensa] = await pool.query("DESCRIBE Defensa");

    return NextResponse.json({
      Evidencia: evidencia,
      AsignacionDelegado: asignacion,
      Defensa: defensa,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
