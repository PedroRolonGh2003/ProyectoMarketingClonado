import { getPool } from "@/lib/db";

export async function obtenerUsuarioPorCorreo(correo: string) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT idUsuario, correo FROM Usuario WHERE correo = ?",
    [correo],
  );
  const list = rows as { idUsuario: number; correo: string }[];
  return list.length > 0 ? list[0] : null;
}

export async function crearDelegado(
  nombre: string,
  apellido: string,
  correo: string,
  telefono: string | null,
  hashContrasena: string,
) {
  const pool = getPool();
  const [result] = await pool.query(
    "INSERT INTO Usuario (rol, nombre, apellido, correo, telefono, hashContrasena, activo, fechaCreacion) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
    [1, nombre, apellido, correo, telefono || "", hashContrasena, 1],
  );
  return result;
}

export async function cambiarPassword(
  id: string,
  actual: string,
  nueva: string,
) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT hashContrasena FROM Usuario WHERE idUsuario = ?",
    [id],
  );
  const list = rows as { hashContrasena: string }[];
  if (list.length === 0) {
    return { ok: false as const, mensaje: "Usuario no encontrado" };
  }
  const { comparePassword, hashPassword } = await import("@/lib/password");
  const hashGuardado = String(list[0].hashContrasena ?? "");
  // Soporta contraseñas bcrypt (empiezan con $2) y texto plano (legado),
  // igual que loginUsuario, para no romper cuentas antiguas.
  const esBcrypt = hashGuardado.startsWith("$2");
  const coincide = esBcrypt
    ? await comparePassword(actual, hashGuardado)
    : actual === hashGuardado;
  if (!coincide) {
    return { ok: false as const, mensaje: "Contraseña actual incorrecta" };
  }
  const nuevoHash = await hashPassword(nueva);
  await pool.query(
    "UPDATE Usuario SET hashContrasena = ? WHERE idUsuario = ?",
    [nuevoHash, id],
  );
  return { ok: true as const };
}
