// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { loginUsuario } from "@/server/auth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { correo, password } = body;
    const result = await loginUsuario(String(correo ?? ""), String(password ?? ""));
    if (result.ok === false) {
      const status = result.mensaje.includes("requeridos") ? 400 : 401;
      return NextResponse.json(result, { status });
    }

    const token = createSessionToken(result.usuario.id);
    const response = NextResponse.json(result);
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
