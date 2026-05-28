import { getPool } from "@/lib/db";
import { crearPagoPendientePorDefensa } from "@/server/pagos";

export class ValidationError extends Error {}

const MOTIVO_COLUMN_CANDIDATES = [
  "justificacion",
  "motivoRechazo",
  "motivo_rechazo",
  "motivo",
  "comentario",
  "observaciones",
  "descripcion",
  "descripcion_rechazo",
];

let cachedAsignacionDelegadoReasonField: string | null | undefined;

async function getAsignacionDelegadoReasonField(): Promise<string | null> {
  if (cachedAsignacionDelegadoReasonField !== undefined) {
    return cachedAsignacionDelegadoReasonField;
  }

  const pool = getPool();
  const placeholders = MOTIVO_COLUMN_CANDIDATES.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'AsignacionDelegado'
       AND COLUMN_NAME IN (${placeholders})
     LIMIT 1`,
    MOTIVO_COLUMN_CANDIDATES,
  );
  const list = rows as Array<{ COLUMN_NAME: string }>;
  cachedAsignacionDelegadoReasonField = list[0]?.COLUMN_NAME ?? null;
  return cachedAsignacionDelegadoReasonField;
}

export type EvidenciaPayload = {
  comentarios?: string | null;
  imagenUrl?: string | null;
  pdfUrl?: string | null;
  imagenNombre?: string | null;
  pdfNombre?: string | null;
};

export async function actualizarEstadoAsignacion(
  id: string,
  estado: string,
  _justificacion?: string,
) {
  const pool = getPool();
  const estadoNorm = String(estado ?? "").toLowerCase().trim();
  const justificacion = String(_justificacion ?? "").trim();

  if (estadoNorm === "rechazada") {
    if (!justificacion) {
      throw new ValidationError(
        "Debe ingresar un justificativo para rechazar la convocatoria.",
      );
    }

    const motivoCol = await getAsignacionDelegadoReasonField();
    if (motivoCol) {
      await pool.query(
        `UPDATE AsignacionDelegado SET estado = ?, ${motivoCol} = ? WHERE idAsignacion = ?`,
        [estadoNorm, justificacion, id],
      );
      return;
    }

    throw new ValidationError(
      "No se encontró columna para guardar el motivo de rechazo en AsignacionDelegado. Agrega un campo como 'justificacion' o 'motivoRechazo' en la tabla para habilitar esta funcionalidad.",
    );
  }

  await pool.query("UPDATE AsignacionDelegado SET estado = ? WHERE idAsignacion = ?", [
    estadoNorm,
    id,
  ]);
}

export async function completarAsignacion(
  id: string,
  evidencia?: EvidenciaPayload | null,
) {
  const pool = getPool();

  await pool.query(
    "UPDATE AsignacionDelegado SET estado = 'completada' WHERE idAsignacion = ?",
    [id],
  );

  const [rows] = await pool.query(
    "SELECT idDefensa FROM AsignacionDelegado WHERE idAsignacion = ?",
    [id],
  );

  const list = rows as { idDefensa: number }[];

  if (list.length > 0) {
    const idDefensa = list[0].idDefensa;
    await pool.query("UPDATE Defensa SET estado = 'completada' WHERE idDefensa = ?", [
      idDefensa,
    ]);

    try {
      await crearPagoPendientePorDefensa(idDefensa);
    } catch (err) {
      console.error(
        "[pagos] al completar defensa:",
        err instanceof Error ? err.message : err,
      );
    }

    const comentarios = evidencia?.comentarios?.trim() || "";
    const imagenUrl = evidencia?.imagenUrl || null;
    const pdfUrl = evidencia?.pdfUrl || null;
    const imagenNombre = evidencia?.imagenNombre || null;
    const pdfNombre = evidencia?.pdfNombre || null;

    if (comentarios || imagenUrl || pdfUrl) {
      const payload = JSON.stringify({
        comentarios: comentarios || null,
        imagenUrl,
        pdfUrl,
        imagenNombre,
        pdfNombre,
      });

      await pool.query("INSERT INTO Evidencia (idAsignacion, urlArchivo) VALUES (?, ?)", [
        id,
        payload,
      ]);
    }
  }
}
