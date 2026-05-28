import type { ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";
import { normalizarFechaMySQL } from "@/lib/defensa-form";

type RecordatorioDefensaInfo = {
  idDelegado: number | null;
  estadoDefensa: string | null;
  estadoAsignacion: string | null;
  tieneEvidencia: boolean;
};

const estadoEsCompletado = (estado: string | null | undefined) => {
  return ["completada", "completado"].includes(
    String(estado ?? "")
      .toLowerCase()
      .trim(),
  );
};

const estadoEsCancelado = (estado: string | null | undefined) => {
  return ["cancelada", "cancelado"].includes(
    String(estado ?? "")
      .toLowerCase()
      .trim(),
  );
};

export async function getDefensaParaRecordatorio(
  idDefensa: string | number,
): Promise<RecordatorioDefensaInfo | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       d.idDefensa,
       d.estado AS estadoDefensa,
       MAX(ad.estado) AS estadoAsignacion,
       MAX(u.idUsuario) AS idDelegado,
       COUNT(e.idEvidencia) AS cantidadEvidencias
     FROM Defensa d
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     LEFT JOIN Evidencia e ON ad.idAsignacion = e.idAsignacion
     WHERE d.idDefensa = ?
     GROUP BY d.idDefensa, d.estado
     LIMIT 1`,
    [idDefensa],
  );

  const list = rows as Array<{
    estadoDefensa: string | null;
    estadoAsignacion: string | null;
    idDelegado: number | null;
    cantidadEvidencias: number | null;
  }>;
  const row = list[0] ?? null;
  if (!row) {
    return null;
  }

  return {
    idDelegado: row.idDelegado,
    estadoDefensa: row.estadoDefensa,
    estadoAsignacion: row.estadoAsignacion,
    tieneEvidencia: Number(row.cantidadEvidencias ?? 0) > 0,
  };
}

export function defensaYaEstaCompletada(info: RecordatorioDefensaInfo) {
  return (
    estadoEsCompletado(info.estadoDefensa) ||
    estadoEsCompletado(info.estadoAsignacion) ||
    info.tieneEvidencia
  );
}

export function defensaEstaCancelada(info: RecordatorioDefensaInfo) {
  return (
    estadoEsCancelado(info.estadoDefensa) ||
    estadoEsCancelado(info.estadoAsignacion)
  );
}

export async function getDefensasParaRecordatorio24h() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       d.idDefensa,
       d.fecha,
       d.estado AS estadoDefensa,
       MAX(ad.estado) AS estadoAsignacion,
       MAX(u.idUsuario) AS idDelegado,
       COUNT(e.idEvidencia) AS cantidadEvidencias
     FROM Defensa d
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     LEFT JOIN Evidencia e ON ad.idAsignacion = e.idAsignacion
     WHERE d.fecha BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR)
       AND DATE_ADD(DATE_ADD(NOW(), INTERVAL 24 HOUR), INTERVAL 30 MINUTE)
     GROUP BY d.idDefensa, d.fecha, d.estado
     ORDER BY d.fecha ASC`,
  );

  const list = rows as Array<{
    idDefensa: number;
    fecha: string;
    estadoDefensa: string | null;
    estadoAsignacion: string | null;
    idDelegado: number | null;
    cantidadEvidencias: number | null;
  }>;

  return list.map((r) => ({
    idDefensa: r.idDefensa,
    fecha: r.fecha,
    estadoDefensa: r.estadoDefensa,
    estadoAsignacion: r.estadoAsignacion,
    idDelegado: r.idDelegado,
    tieneEvidencia: Number(r.cantidadEvidencias ?? 0) > 0,
  }));
}

async function ensureNotificacionTableExists() {
  const pool = getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS NotificacionEnviada (
      id INT AUTO_INCREMENT PRIMARY KEY,
      idDefensa INT NOT NULL,
      idDelegado INT NOT NULL,
      tipo VARCHAR(64) NOT NULL,
      fechaEnvio DATETIME NOT NULL,
      UNIQUE KEY ux_notif_defensa_delegado_tipo (idDefensa, idDelegado, tipo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  );
}

export async function yaSeEnvioRecordatorio24h(
  idDefensa: number,
  idDelegado: number,
): Promise<boolean> {
  const pool = getPool();
  try {
    await ensureNotificacionTableExists();
    const [rows] = await pool.query(
      "SELECT id FROM NotificacionEnviada WHERE idDefensa = ? AND idDelegado = ? AND tipo = ? LIMIT 1",
      [idDefensa, idDelegado, "recordatorio_24h"],
    );
    const list = rows as Array<{ id: number }>;
    return list.length > 0;
  } catch (err) {
    console.error("[notificacion] error checking sent status:", err);
    return false;
  }
}

export async function registrarRecordatorioEnviado(
  idDefensa: number,
  idDelegado: number,
) {
  const pool = getPool();
  try {
    await ensureNotificacionTableExists();
    await pool.query(
      `INSERT INTO NotificacionEnviada (idDefensa, idDelegado, tipo, fechaEnvio)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE fechaEnvio = VALUES(fechaEnvio)`,
      [idDefensa, idDelegado, "recordatorio_24h"],
    );
  } catch (err) {
    console.error("[notificacion] error registering sent notification:", err);
  }
}

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
       ad.idAsignacion,
       p.estado   AS estadoPago
     FROM AsignacionDelegado ad
     JOIN Defensa        d  ON ad.idDefensa   = d.idDefensa
     JOIN PerfilTesis    pt ON d.idPerfil      = pt.idPerfil
     JOIN Estudiante     e  ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN Pago      p  ON p.idDefensa     = d.idDefensa
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

export async function getAdminDefensaPorId(idDefensa: string | number) {
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
     WHERE d.idDefensa = ?
     LIMIT 1`,
    [idDefensa],
  );
  const list = rows as Record<string, unknown>[];
  return list[0] ?? null;
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
  const estadoNorm = String(body.estado ?? "")
    .toLowerCase()
    .trim();
  const fechaSql = normalizarFechaMySQL(body.fecha);

  await pool.query(
    `UPDATE Defensa d
     JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     SET d.fecha = ?, d.lugar = ?, d.estado = ?, pt.titulo = ?,
         e.nombre = ?, e.apellido = ?
     WHERE d.idDefensa = ?`,
    [
      fechaSql,
      body.lugar,
      body.estado,
      body.titulo,
      body.nombreEstudiante,
      body.apellidoEstudiante,
      id,
    ],
  );

  if (estadoNorm === "completada" || estadoNorm === "completado") {
    await pool.query(
      `UPDATE AsignacionDelegado SET estado = 'completada' WHERE idDefensa = ?`,
      [id],
    );
    try {
      const { crearPagoPendientePorDefensa } = await import("@/server/pagos");
      await crearPagoPendientePorDefensa(Number(id));
    } catch (err) {
      console.error(
        "[pagos] al marcar defensa completada:",
        err instanceof Error ? err.message : err,
      );
    }
  } else if (estadoNorm === "cancelada") {
    await pool.query(
      `UPDATE AsignacionDelegado SET estado = 'cancelada' WHERE idDefensa = ?`,
      [id],
    );
  }
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

    await conn.query("DELETE FROM AsignacionDelegado WHERE idDefensa = ?", [
      id,
    ]);

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
