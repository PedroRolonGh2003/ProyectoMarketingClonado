import { NextResponse } from "next/server";
import {
  validarInvitacionToken,
  marcarInvitacionUsada,
} from "@/server/invitaciones";
import { obtenerUsuarioPorCorreo, crearDelegado } from "@/server/usuario";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const nombre = String(body.nombre ?? "").trim();
    const apellido = String(body.apellido ?? "").trim();
    const correo = String(body.correo ?? "")
      .trim()
      .toLowerCase();
    const telefono = body.telefono ? String(body.telefono).trim() : "";
    const password = String(body.password ?? "");
    const passwordConfirm = String(body.passwordConfirm ?? "");

    if (
      !token ||
      !nombre ||
      !apellido ||
      !correo ||
      !password ||
      !passwordConfirm
    ) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Todos los campos obligatorios deben ser completados",
        },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return NextResponse.json(
        { ok: false, mensaje: "Correo inválido" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "La contraseña debe tener al menos 8 caracteres",
        },
        { status: 400 },
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { ok: false, mensaje: "La confirmación de contraseña no coincide" },
        { status: 400 },
      );
    }

    const invitacionStatus = await validarInvitacionToken(token);
    if (!invitacionStatus.ok || !invitacionStatus.invitacion) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: invitacionStatus.mensaje || "Token de invitación inválido",
        },
        { status: 400 },
      );
    }

    const exists = await obtenerUsuarioPorCorreo(correo);
    if (exists) {
      return NextResponse.json(
        { ok: false, mensaje: "El correo ya está en uso" },
        { status: 409 },
      );
    }

    const hashContrasena = await hashPassword(password);

    await crearDelegado(
      nombre,
      apellido,
      correo,
      telefono || null,
      hashContrasena,
    );
    await marcarInvitacionUsada(invitacionStatus.invitacion.idInvitacion);

    return NextResponse.json({
      ok: true,
      mensaje: "Registro exitoso. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}
