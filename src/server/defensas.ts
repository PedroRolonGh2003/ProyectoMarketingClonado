import type { ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";

export async function getDefensasDelegado(idDelegado: string) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       d.idDefensa,
       d.fecha,
       d.lugar,
       d.estado,
       pt.titulo,
       e.nombre   AS nombreEstudiante,
       e.apellido AS apellidoEstudiante,
       ad.estado  AS estadoAsignacion,
       ad.idAsignacion
     FROM AsignacionDelegado ad
     JOIN Defensa        d  ON ad.idDefensa   = d.idDefensa
     JOIN PerfilTesis    pt ON d.idPerfil      = pt.idPerfil
     JOIN Estudiante     e  ON pt.idEstudiante = e.idEstudiante
     WHERE ad.idDelegado = ?
     ORDER BY d.fecha DESC`,
    [idDelegado],
  );
  return rows;
}

export async function getDefensasLista() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       d.idDefensa,
       d.fecha,
       d.lugar,
       d.estado,
       pt.titulo,
       e.nombre   AS nombreEstudiante,
       e.apellido AS apellidoEstudiante
     FROM Defensa     d
     JOIN PerfilTesis pt ON d.idPerfil      = pt.idPerfil
     JOIN Estudiante  e  ON pt.idEstudiante = e.idEstudiante
     ORDER BY d.fecha DESC`,
  );
  return rows;
}

export async function getAdminDefensas() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       d.idDefensa, d.fecha, d.lugar, d.estado,
       pt.titulo,
       e.nombre AS nombreEstudiante, e.apellido AS apellidoEstudiante,
       ad.idAsignacion, ad.estado AS estadoAsignacion,
       u.nombre AS nombreDelegado, u.apellido AS apellidoDelegado,
       u.idUsuario AS idDelegado
     FROM Defensa d
     JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     ORDER BY d.fecha DESC`,
  );
  return rows;
}

export async function crearDefensa(body: {
  estudianteNombre: string;
  estudianteApellido: string;
  titulo: string;
  fecha: string | null;
  lugar: string;
}) {
  const { estudianteNombre, estudianteApellido, titulo, fecha, lugar } = body;
  const pool = getPool();
  const [estResult] = await pool.query(
    "INSERT INTO Estudiante (nombre, apellido) VALUES (?, ?)",
    [estudianteNombre, estudianteApellido],
  );
  const idEstudiante = (estResult as ResultSetHeader).insertId;

  const [perfResult] = await pool.query(
    "INSERT INTO PerfilTesis (idEstudiante, titulo) VALUES (?, ?)",
    [idEstudiante, titulo],
  );
  const idPerfil = (perfResult as ResultSetHeader).insertId;

  await pool.query(
    "INSERT INTO Defensa (idPerfil, fecha, lugar, estado) VALUES (?, ?, ?, 'pendiente')",
    [idPerfil, fecha, lugar],
  );
}

export async function actualizarDefensa(
  id: string,
  body: {
    titulo: string;
    nombreEstudiante: string;
    apellidoEstudiante: string;
    fecha: string;
    lugar: string;
    estado: string;
  },
) {
  const pool = getPool();
  await pool.query(
    `UPDATE Defensa d
     JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     SET d.fecha = ?, d.lugar = ?, d.estado = ?, pt.titulo = ?,
         e.nombre = ?, e.apellido = ?
     WHERE d.idDefensa = ?`,
    [
      body.fecha,
      body.lugar,
      body.estado,
      body.titulo,
      body.nombreEstudiante,
      body.apellidoEstudiante,
      id,
    ],
  );
}

export async function eliminarDefensa(id: string) {
  const pool = getPool();
  await pool.query("DELETE FROM Defensa WHERE idDefensa = ?", [id]);
}

export async function asignarDelegado(idDefensa: string, idDelegado: number) {
  const pool = getPool();
  const [existing] = await pool.query(
    "SELECT idAsignacion FROM AsignacionDelegado WHERE idDefensa = ?",
    [idDefensa],
  );
  const rows = existing as { idAsignacion: number }[];
  if (rows.length > 0) {
    await pool.query(
      "UPDATE AsignacionDelegado SET idDelegado = ?, estado = 'pendiente' WHERE idDefensa = ?",
      [idDelegado, idDefensa],
    );
  } else {
    await pool.query(
      "INSERT INTO AsignacionDelegado (idDefensa, idDelegado, estado) VALUES (?, ?, 'pendiente')",
      [idDefensa, idDelegado],
    );
  }
}
