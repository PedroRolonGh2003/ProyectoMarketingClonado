import { NextResponse } from "next/server";
import { validarInvitacionToken } from "@/server/invitaciones";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") ?? "");
    const resultado = await validarInvitacionToken(token);
    if (!resultado.ok) {
      return NextResponse.json(
        { ok: false, mensaje: resultado.mensaje || "Token inválido" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, mensaje: "Token válido" });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error de validación";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
