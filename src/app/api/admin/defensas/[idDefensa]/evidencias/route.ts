import { NextResponse } from "next/server";
import { getEvidenciasDefensa } from "@/server/asignacion";
import { getAdminDefensaPorId } from "@/server/defensas";

export const runtime = "nodejs";

type Ctx = { params: { idDefensa: string } };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const [defensa, evidencias] = await Promise.all([
      getAdminDefensaPorId(params.idDefensa),
      getEvidenciasDefensa(params.idDefensa),
    ]);
    return NextResponse.json({ ok: true, defensa, evidencias });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
