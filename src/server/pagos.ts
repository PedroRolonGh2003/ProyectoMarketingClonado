import type { ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";

const MONTO_PAGO_DEFENSA = Number(process.env.PAGO_MONTO_DEFENSA || 1);

const ESTADOS_DEFENSA_COMPLETADA = ["completada", "completado"] as const;
const ESTADOS_PAGO_CONFIRMADO = ["completado", "pagado"] as const;

export function esPagoCompletado(
  estado?: string | null,
  fechaPago?: string | Date | null,
): boolean {
  if (fechaPago) return true;
  if (!estado) return false;
  const e = String(estado).toLowerCase().trim();
  return ESTADOS_PAGO_CONFIRMADO.includes(e as (typeof ESTADOS_PAGO_CONFIRMADO)[number]);
}

export function esPagoPendiente(
  estado?: string | null,
  fechaPago?: string | Date | null,
): boolean {
  return !esPagoCompletado(estado, fechaPago);
}

function defensaCompletadaSql(aliasDefensa: string, aliasAsignacion: string) {
  const estados = ESTADOS_DEFENSA_COMPLETADA.map((e) => `'${e}'`).join(", ");
  return `(
    LOWER(TRIM(IFNULL(${aliasAsignacion}.estado, ''))) IN (${estados})
    OR LOWER(TRIM(IFNULL(${aliasDefensa}.estado, ''))) IN (${estados})
  )`;
}

/** Pendiente = el admin aún no confirmó (sin fecha de pago). */
function pagoPendienteSql(aliasPago: string) {
  return `(${aliasPago}.idPago IS NULL OR ${aliasPago}.fechaPago IS NULL)`;
}

/** Solo defensas completadas con pago aún no confirmado por el admin. */
export async function listarPagosPendientesAdmin() {
  const pool = getPool();

  await sincronizarPagosDefensasCompletadas();

  const [rows] = await pool.query(
    `SELECT
       IFNULL(p.idPago, 0) AS idPago,
       d.idDefensa,
       IFNULL(p.monto, ?) AS monto,
       CASE
         WHEN p.fechaPago IS NOT NULL THEN 'completado'
         WHEN LOWER(TRIM(IFNULL(p.estado, ''))) IN ('completado', 'pagado') THEN 'completado'
         ELSE 'pendiente'
       END AS estado,
       p.fechaPago,
       d.fecha,
       pt.titulo,
       e.nombre AS nombreEstudiante,
       e.apellido AS apellidoEstudiante,
       u.nombre AS nombreDelegado,
       u.apellido AS apellidoDelegado
     FROM Defensa d
     INNER JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     INNER JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     LEFT JOIN Pago p ON p.idDefensa = d.idDefensa
     WHERE ${defensaCompletadaSql("d", "ad")}
       AND ${pagoPendienteSql("p")}
     ORDER BY d.fecha DESC`,
    [MONTO_PAGO_DEFENSA],
  );

  return rows;
}

/** @deprecated Usar listarPagosPendientesAdmin */
export async function listarPagosAdmin() {
  return listarPagosPendientesAdmin();
}

/** Listado cuando la tabla Pago no existe. */
async function listarPagosPendientesSinTablaPago() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       0 AS idPago,
       d.idDefensa,
       ? AS monto,
       'pendiente' AS estado,
       NULL AS fechaPago,
       d.fecha,
       pt.titulo,
       e.nombre AS nombreEstudiante,
       e.apellido AS apellidoEstudiante,
       u.nombre AS nombreDelegado,
       u.apellido AS apellidoDelegado
     FROM Defensa d
     INNER JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     INNER JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     WHERE ${defensaCompletadaSql("d", "ad")}
     ORDER BY d.fecha DESC`,
    [MONTO_PAGO_DEFENSA],
  );
  return rows;
}

export async function contarPagosPendientesAdmin(): Promise<number> {
  try {
    const rows = await listarPagosPendientesAdmin();
    return (rows as unknown[]).length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("doesn't exist") ||
      msg.includes("Unknown table") ||
      msg.toLowerCase().includes("pago")
    ) {
      const rows = await listarPagosPendientesSinTablaPago();
      return (rows as unknown[]).length;
    }
    return 0;
  }
}

/** Crea o corrige pagos para defensas completadas. */
export async function sincronizarPagosDefensasCompletadas(): Promise<void> {
  const pool = getPool();

  const [rows] = await pool.query(
    `SELECT DISTINCT d.idDefensa
     FROM Defensa d
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     WHERE ${defensaCompletadaSql("d", "ad")}`,
  );

  for (const row of rows as { idDefensa: number }[]) {
    try {
      await crearPagoPendientePorDefensa(row.idDefensa);
    } catch (err) {
      console.error(
        `[pagos] sync idDefensa=${row.idDefensa}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  try {
    await pool.query(
      `UPDATE Pago p
       INNER JOIN Defensa d ON p.idDefensa = d.idDefensa
       LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
       SET p.estado = 'pendiente', p.fechaPago = NULL
       WHERE ${defensaCompletadaSql("d", "ad")}
         AND p.fechaPago IS NULL
         AND LOWER(TRIM(IFNULL(p.estado, ''))) IN ('completada', 'completado')`,
    );
  } catch {
    /* tabla o columnas distintas */
  }
}

/** Crea un pago pendiente (idempotente). Si existe pero no está confirmado, lo deja pendiente. */
export async function crearPagoPendientePorDefensa(
  idDefensa: number,
): Promise<number | null> {
  const pool = getPool();

  const [existing] = await pool.query(
    "SELECT idPago, estado, fechaPago FROM Pago WHERE idDefensa = ? LIMIT 1",
    [idDefensa],
  );
  const prev = (existing as { idPago: number; estado: string; fechaPago: Date | null }[])[0];

  if (prev) {
    if (!prev.fechaPago) {
      await pool.query(
        "UPDATE Pago SET estado = 'pendiente', fechaPago = NULL WHERE idPago = ?",
        [prev.idPago],
      );
    }
    return prev.idPago;
  }

  const attempts = [
    `INSERT INTO Pago (idDefensa, monto, estado, fechaPago) VALUES (?, ?, 'pendiente', NULL)`,
    `INSERT INTO Pago (idDefensa, monto, estado) VALUES (?, ?, 'pendiente')`,
  ];

  const forzarPendiente = async (idPago: number) => {
    try {
      await pool.query(
        "UPDATE Pago SET estado = 'pendiente', fechaPago = NULL WHERE idPago = ?",
        [idPago],
      );
    } catch (err) {
      console.error(
        "[pagos] no se pudo forzar pago pendiente:",
        err instanceof Error ? err.message : err,
      );
    }
  };

  let lastError: unknown;
  for (const sql of attempts) {
    try {
      const [result] = await pool.query(sql, [idDefensa, MONTO_PAGO_DEFENSA]);
      const insertId = (result as ResultSetHeader).insertId;
      if (insertId) {
        // Sobrescribe cualquier DEFAULT CURRENT_TIMESTAMP que MySQL haya aplicado.
        await forzarPendiente(insertId);
        return insertId;
      }
      const [found] = await pool.query(
        "SELECT idPago FROM Pago WHERE idDefensa = ? LIMIT 1",
        [idDefensa],
      );
      return (found as { idPago: number }[])[0]?.idPago ?? null;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Duplicate entry")) {
        const [found] = await pool.query(
          "SELECT idPago FROM Pago WHERE idDefensa = ? LIMIT 1",
          [idDefensa],
        );
        return (found as { idPago: number }[])[0]?.idPago ?? null;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo crear el pago. Ejecuta sql/pago-table.sql en MySQL.");
}

export async function confirmarPago(
  idPago: string,
  idDefensa?: number,
): Promise<void> {
  const pool = getPool();
  let id = Number(idPago);

  if (!id || id <= 0) {
    if (!idDefensa) {
      throw new Error("Pago no encontrado");
    }
    const creado = await crearPagoPendientePorDefensa(idDefensa);
    if (!creado) {
      throw new Error("No se pudo registrar el pago");
    }
    id = creado;
  }

  const updates = [
    "UPDATE Pago SET estado = 'completado', fechaPago = NOW() WHERE idPago = ?",
    "UPDATE Pago SET estado = 'pagado', fechaPago = NOW() WHERE idPago = ?",
  ];

  for (const sql of updates) {
    try {
      const [result] = await pool.query(sql, [id]);
      if ((result as ResultSetHeader).affectedRows > 0) return;
    } catch {
      /* siguiente variante */
    }
  }

  throw new Error("Pago no encontrado o ya fue confirmado");
}

export async function marcarPagoCompletado(id: string, idDefensa?: number) {
  return confirmarPago(id, idDefensa);
}

export async function marcarPagoPagado(id: string, idDefensa?: number) {
  return confirmarPago(id, idDefensa);
}
