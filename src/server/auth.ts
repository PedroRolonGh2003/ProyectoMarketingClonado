//src/server/auth.ts
import { getPool } from "@/lib/db";
import { comparePassword } from "@/lib/password";
import type { UsuarioSesion } from "@/types";

export async function loginUsuario(
  correo: string,
  password: string,
): Promise<
  { ok: true; usuario: UsuarioSesion } | { ok: false; mensaje: string }
> {
  const correoNorm = String(correo ?? "").trim();
  const passNorm = String(password ?? "");

  if (!correoNorm || !passNorm) {
    return { ok: false, mensaje: "Correo y contraseña requeridos" };
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT idUsuario, rol, nombre, apellido, correo, telefono, activo, hashContrasena
     FROM Usuario
     WHERE correo = ? AND activo = 1
     LIMIT 1`,
    [correoNorm],
  );

  const list = rows as Record<string, unknown>[];

  if (list.length === 0) {
    return { ok: false, mensaje: "Correo o contraseña incorrectos" };
  }

  const usuario = list[0];
  const hashGuardado = String(usuario.hashContrasena ?? "");

  const coincide = await comparePassword(passNorm, hashGuardado);

  if (!coincide) {
    return { ok: false, mensaje: "Correo o contraseña incorrectos" };
  }

  const rolNombre = Number(usuario.rol) === 0 ? "Admin" : "Delegado";

  return {
    ok: true,
    usuario: {
      id: Number(usuario.idUsuario),
      nombre: String(usuario.nombre),
      apellido: String(usuario.apellido),
      correo: String(usuario.correo),
      telefono: usuario.telefono != null ? String(usuario.telefono) : "",
      rol: Number(usuario.rol),
      rolNombre,
    },
  };
}
