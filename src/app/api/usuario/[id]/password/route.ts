import { NextResponse } from "next/server";
import { cambiarPassword } from "@/server/usuario";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { actual, nueva } = body;
    const result = await cambiarPassword(id, actual, nueva);
    if (!result.ok) {
      return NextResponse.json(result, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
