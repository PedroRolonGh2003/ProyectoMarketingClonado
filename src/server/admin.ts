import { getPool } from "@/lib/db";

export async function listarDelegados() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT idUsuario, nombre, apellido, correo, telefono, activo FROM Usuario WHERE rol = 1"
  );
  return rows;
}

export async function listarDelegadosDetalle() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       u.idUsuario, u.nombre, u.apellido, u.correo, u.telefono, u.activo,
       COUNT(ad.idAsignacion) AS defensasAsignadas
     FROM Usuario u
     LEFT JOIN AsignacionDelegado ad ON u.idUsuario = ad.idDelegado
     WHERE u.rol = 1
     GROUP BY u.idUsuario
     ORDER BY u.nombre ASC`
  );
  return rows;
}

export async function crearDelegado(body: {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  password: string;
}) {
  const pool = getPool();
  await pool.query(
    "INSERT INTO Usuario (rol, nombre, apellido, correo, telefono, hashContrasena) VALUES (1, ?, ?, ?, ?, ?)",
    [body.nombre, body.apellido, body.correo, body.telefono || null, body.password]
  );
}

export async function editarDelegado(
  id: string,
  body: {
    nombre: string;
    apellido: string;
    correo: string;
    telefono: string | null;
    password?: string;
  }
) {
  const pool = getPool();
  if (body.password) {
    await pool.query(
      "UPDATE Usuario SET nombre=?, apellido=?, correo=?, telefono=?, hashContrasena=? WHERE idUsuario=?",
      [body.nombre, body.apellido, body.correo, body.telefono || null, body.password, id]
    );
  } else {
    await pool.query(
      "UPDATE Usuario SET nombre=?, apellido=?, correo=?, telefono=? WHERE idUsuario=?",
      [body.nombre, body.apellido, body.correo, body.telefono || null, id]
    );
  }
}

export async function eliminarDelegado(id: string) {
  const pool = getPool();
  await pool.query("UPDATE Usuario SET activo = 0 WHERE idUsuario = ?", [id]);
}

export async function setUsuarioActivo(id: string, activo: boolean) {
  const pool = getPool();
  await pool.query("UPDATE Usuario SET activo = ? WHERE idUsuario = ?", [activo ? 1 : 0, id]);
}
