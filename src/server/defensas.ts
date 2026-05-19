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
  direccion?: string | null;
  observaciones?: string | null;
}) {
  const {
    estudianteNombre,
    estudianteApellido,
    titulo,
    fecha,
    lugar,
    direccion = null,
    observaciones = null,
  } = body;
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

  try {
    await pool.query(
      `INSERT INTO Defensa (idPerfil, fecha, lugar, estado, direccion, observaciones)
       VALUES (?, ?, ?, 'pendiente', ?, ?)`,
      [idPerfil, fecha, lugar, direccion, observaciones],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Unknown column")) {
      throw err;
    }
    await pool.query(
      "INSERT INTO Defensa (idPerfil, fecha, lugar, estado) VALUES (?, ?, ?, 'pendiente')",
      [idPerfil, fecha, lugar],
    );
  }
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [asignaciones] = await conn.query(
      "SELECT idAsignacion FROM AsignacionDelegado WHERE idDefensa = ?",
      [id],
    );
    const idsAsignacion = (asignaciones as { idAsignacion: number }[]).map(
      (row) => row.idAsignacion,
    );

    if (idsAsignacion.length > 0) {
      const placeholders = idsAsignacion.map(() => "?").join(", ");
      await conn.query(
        `DELETE FROM Evidencia WHERE idAsignacion IN (${placeholders})`,
        idsAsignacion,
      );
    }

    await conn.query("DELETE FROM AsignacionDelegado WHERE idDefensa = ?", [id]);

    try {
      await conn.query("DELETE FROM Pago WHERE idDefensa = ?", [id]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("doesn't exist")) {
        throw err;
      }
    }

    const [result] = await conn.query(
      "DELETE FROM Defensa WHERE idDefensa = ?",
      [id],
    );
    const affected = (result as ResultSetHeader).affectedRows;
    if (affected === 0) {
      throw new Error("Defensa no encontrada");
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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
