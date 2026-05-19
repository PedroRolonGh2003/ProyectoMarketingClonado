import type { ResultSetHeader } from "mysql2";
import { getPool } from "@/lib/db";

const MONTO_PAGO_DEFENSA = Number(process.env.PAGO_MONTO_DEFENSA || 1);

export function esPagoCompletado(estado: string): boolean {
  return estado === "completado" || estado === "pagado";
}

export async function listarPagosAdmin() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       p.idPago, p.monto, p.estado, p.fechaPago,
       d.idDefensa, d.fecha,
       pt.titulo,
       e.nombre AS nombreEstudiante, e.apellido AS apellidoEstudiante,
       u.nombre AS nombreDelegado, u.apellido AS apellidoDelegado
     FROM Pago p
     JOIN Defensa d ON p.idDefensa = d.idDefensa
     JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     ORDER BY
       CASE WHEN p.estado = 'pendiente' THEN 0 ELSE 1 END,
       d.fecha DESC`,
  );
  return rows;
}

/** Crea un pago pendiente al completar una defensa (idempotente por idDefensa). */
export async function crearPagoPendientePorDefensa(
  idDefensa: number,
): Promise<boolean> {
  const pool = getPool();
  const [existing] = await pool.query(
    "SELECT idPago FROM Pago WHERE idDefensa = ? LIMIT 1",
    [idDefensa],
  );
  if ((existing as { idPago: number }[]).length > 0) {
    return false;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO Pago (idDefensa, monto, estado, fechaPago)
       VALUES (?, ?, 'pendiente', NULL)`,
      [idDefensa, MONTO_PAGO_DEFENSA],
    );
    return (result as ResultSetHeader).affectedRows > 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Unknown column")) {
      throw err;
    }
    const [result] = await pool.query(
      "INSERT INTO Pago (idDefensa, monto, estado) VALUES (?, ?, 'pendiente')",
      [idDefensa, MONTO_PAGO_DEFENSA],
    );
    return (result as ResultSetHeader).affectedRows > 0;
  }
}

export async function marcarPagoCompletado(id: string) {
  const pool = getPool();
  const [result] = await pool.query(
    "UPDATE Pago SET estado = 'completado', fechaPago = NOW() WHERE idPago = ? AND estado = 'pendiente'",
    [id],
  );
  const affected = (result as ResultSetHeader).affectedRows;
  if (affected === 0) {
    throw new Error("Pago no encontrado o ya fue completado");
  }
}

/** @deprecated Usar marcarPagoCompletado */
export async function marcarPagoPagado(id: string) {
  return marcarPagoCompletado(id);
}
