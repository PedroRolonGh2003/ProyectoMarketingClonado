import type { ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";

const MONTO_PAGO_DEFENSA = Number(process.env.PAGO_MONTO_DEFENSA || 1);

export function esPagoCompletado(estado?: string | null): boolean {
  if (!estado) return false;
  const e = String(estado).toLowerCase();
  return e === "completado" || e === "pagado";
}

export function esPagoPendiente(estado?: string | null): boolean {
  return !esPagoCompletado(estado);
}

/** Defensas con asignación completada → pagos pendientes o completados. */
async function listarPagosDesdeDefensasCompletadas() {
  const pool = getPool();

  const [rows] = await pool.query(
    `SELECT
       IFNULL(p.idPago, 0) AS idPago,
       d.idDefensa,
       IFNULL(p.monto, ?) AS monto,
       IFNULL(p.estado, 'pendiente') AS estado,
       p.fechaPago,
       d.fecha,
       pt.titulo,
       e.nombre AS nombreEstudiante,
       e.apellido AS apellidoEstudiante,
       u.nombre AS nombreDelegado,
       u.apellido AS apellidoDelegado
     FROM AsignacionDelegado ad
     INNER JOIN Defensa d ON ad.idDefensa = d.idDefensa
     INNER JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     INNER JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     LEFT JOIN Pago p ON p.idDefensa = d.idDefensa
     WHERE ad.estado IN ('completada', 'completado')
        OR d.estado IN ('completada', 'completado')
     ORDER BY
       CASE WHEN IFNULL(p.estado, 'pendiente') = 'pendiente' THEN 0 ELSE 1 END,
       d.fecha DESC`,
    [MONTO_PAGO_DEFENSA],
  );

  return rows;
}

export async function listarPagosAdmin() {
  try {
    await sincronizarPagosDefensasCompletadas();
    return await listarPagosDesdeDefensasCompletadas();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("doesn't exist") ||
      msg.includes("Unknown table") ||
      msg.toLowerCase().includes("pago")
    ) {
      return listarPagosSinTablaPago();
    }
    throw err;
  }
}

/** Listado cuando la tabla Pago aún no existe (solo defensas completadas). */
async function listarPagosSinTablaPago() {
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
     FROM AsignacionDelegado ad
     INNER JOIN Defensa d ON ad.idDefensa = d.idDefensa
     INNER JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     INNER JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     WHERE ad.estado IN ('completada', 'completado')
        OR d.estado IN ('completada', 'completado')
     ORDER BY d.fecha DESC`,
    [MONTO_PAGO_DEFENSA],
  );
  return rows;
}

/** Crea filas Pago faltantes para defensas ya completadas. */
export async function sincronizarPagosDefensasCompletadas(): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DISTINCT d.idDefensa
     FROM AsignacionDelegado ad
     INNER JOIN Defensa d ON ad.idDefensa = d.idDefensa
     WHERE ad.estado IN ('completada', 'completado')
        OR d.estado IN ('completada', 'completado')`,
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
}

/** Crea un pago pendiente (idempotente por idDefensa). */
export async function crearPagoPendientePorDefensa(
  idDefensa: number,
): Promise<number | null> {
  const pool = getPool();

  const [existing] = await pool.query(
    "SELECT idPago, estado FROM Pago WHERE idDefensa = ? LIMIT 1",
    [idDefensa],
  );
  const prev = (existing as { idPago: number; estado: string }[])[0];
  if (prev) {
    return prev.idPago;
  }

  const attempts = [
    `INSERT INTO Pago (idDefensa, monto, estado, fechaPago) VALUES (?, ?, 'pendiente', NULL)`,
    `INSERT INTO Pago (idDefensa, monto, estado) VALUES (?, ?, 'pendiente')`,
    `INSERT INTO Pago (idDefensa, monto, estado, fechaPago) VALUES (?, ?, 'Pendiente', NULL)`,
  ];

  let lastError: unknown;
  for (const sql of attempts) {
    try {
      const [result] = await pool.query(sql, [idDefensa, MONTO_PAGO_DEFENSA]);
      if ((result as ResultSetHeader).insertId) {
        return (result as ResultSetHeader).insertId;
      }
      const [found] = await pool.query(
        "SELECT idPago FROM Pago WHERE idDefensa = ? LIMIT 1",
        [idDefensa],
      );
      const id = (found as { idPago: number }[])[0]?.idPago;
      return id ?? null;
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
    : new Error("No se pudo crear el pago. Verifica que la tabla Pago exista.");
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
      const affected = (result as ResultSetHeader).affectedRows;
      if (affected > 0) return;
    } catch {
      /* siguiente variante */
    }
  }

  throw new Error("Pago no encontrado o ya fue confirmado");
}

/** @deprecated */
export async function marcarPagoCompletado(id: string) {
  return confirmarPago(id);
}

/** @deprecated */
export async function marcarPagoPagado(id: string) {
  return confirmarPago(id);
}
