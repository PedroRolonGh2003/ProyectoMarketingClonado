// src\app\api\admin\defensas\route.ts
import { NextResponse } from "next/server";
import { getAdminDefensas } from "@/server/defensas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const defensas = await getAdminDefensas();
    return NextResponse.json(
      { ok: true, defensas },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
