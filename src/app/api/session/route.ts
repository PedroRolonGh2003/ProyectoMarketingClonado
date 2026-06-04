import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { obtenerUsuarioSesionPorId } from "@/server/auth";
import { isUsuarioSesionValido } from "@/lib/usuario-sesion";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const usuario = await obtenerUsuarioSesionPorId(session.userId);
    if (!usuario || !isUsuarioSesionValido(usuario)) {
      const res = NextResponse.json({ ok: false }, { status: 401 });
      res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
      return res;
    }

    return NextResponse.json({ ok: true, usuario });
  } catch {
    const res = NextResponse.json({ ok: false }, { status: 500 });
    res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }
}
