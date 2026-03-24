import { getPool } from "@/lib/db";

export async function cambiarPassword(id: string, actual: string, nueva: string) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT idUsuario FROM Usuario WHERE idUsuario = ? AND hashContrasena = ?",
    [id, actual]
  );
  const list = rows as { idUsuario: number }[];
  if (list.length === 0) {
    return { ok: false as const, mensaje: "Contraseña actual incorrecta" };
  }
  await pool.query("UPDATE Usuario SET hashContrasena = ? WHERE idUsuario = ?", [nueva, id]);
  return { ok: true as const };
}
