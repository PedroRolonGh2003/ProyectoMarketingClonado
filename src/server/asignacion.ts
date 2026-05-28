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

export async function actualizarEstadoAsignacion(
  id: string,
  estado: string,
  _justificacion?: string,
) {
  const pool = getPool();
  const estadoNorm = String(estado ?? "")
    .toLowerCase()
    .trim();
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

  await pool.query(
    "UPDATE AsignacionDelegado SET estado = ? WHERE idAsignacion = ?",
    [estadoNorm, id],
  );
}

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function guardarEvidenciaEnBD(
  file: File,
  tipo: "imagen" | "pdf",
): Promise<string> {
  const maxBytes = tipo === "imagen" ? MAX_IMAGEN_BYTES : MAX_PDF_BYTES;
  const maxMB = tipo === "imagen" ? 5 : 10;

  if (file.size > maxBytes) {
    throw new Error(`El ${tipo} supera el tamaño máximo (${maxMB} MB)`);
  }

  const mime = file.type;
  if (tipo === "imagen" && !mime.startsWith("image/")) {
    throw new Error("El archivo de imagen debe ser una imagen válida");
  }
  if (tipo === "pdf" && mime !== "application/pdf") {
    throw new Error("El archivo PDF debe ser un PDF válido");
  }

  return `${tipo}: ${file.name} (${mime}, ${file.size} bytes)`;
}

export async function completarAsignacion(
  id: string,
  evidencia: {
    imagen?: File | null;
    pdf?: File | null;
    comentarios?: string | null;
  } = {},
) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT idDefensa FROM AsignacionDelegado WHERE idAsignacion = ?",
    [id],
  );
  const list = rows as { idDefensa: number }[];
  if (list.length === 0) throw new Error("Asignación no encontrada");
  const idDefensa = list[0].idDefensa;

  const imagenesInfo: string[] = [];

  if (evidencia.imagen && evidencia.imagen.size > 0) {
    const info = await guardarEvidenciaEnBD(evidencia.imagen, "imagen");
    imagenesInfo.push(info);
  }

  if (evidencia.pdf && evidencia.pdf.size > 0) {
    const info = await guardarEvidenciaEnBD(evidencia.pdf, "pdf");
    imagenesInfo.push(info);
  }

  await pool.query(
    "UPDATE AsignacionDelegado SET estado = 'completada' WHERE idAsignacion = ?",
    [id],
  );
  await pool.query(
    "UPDATE Defensa SET estado = 'completada' WHERE idDefensa = ?",
    [idDefensa],
  );

  const comentarios = evidencia.comentarios?.trim() || null;
  const archivosDesc =
    imagenesInfo.length > 0 ? imagenesInfo.join(" | ") : null;
  const urlImagen = imagenesInfo.length > 0 ? "evidencia-recibida" : null;

  if (archivosDesc || comentarios) {
    await pool.query(
      `INSERT INTO Evidencia (idAsignacion, urlImagen, comentarios, fechaSubida)
       VALUES (?, ?, ?, UTC_TIMESTAMP())`,
      [
        id,
        urlImagen,
        `${archivosDesc ? archivosDesc + " | " : ""}${comentarios || ""}`.trim(),
      ],
    );
  }

  try {
    await crearPagoPendientePorDefensa(idDefensa);
  } catch (err) {
    console.error(
      "[pagos] al completar defensa:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function getEvidenciasDefensa(idDefensa: string | number) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       e.idAsignacion,
       e.urlImagen,
       e.comentarios,
       DATE_FORMAT(e.fechaSubida, '%Y-%m-%dT%H:%i:%sZ') AS fechaSubida,
       ad.idDelegado,
       u.nombre   AS nombreDelegado,
       u.apellido AS apellidoDelegado
     FROM Evidencia e
     JOIN AsignacionDelegado ad ON e.idAsignacion = ad.idAsignacion
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     WHERE ad.idDefensa = ?
     ORDER BY e.fechaSubida DESC`,
    [idDefensa],
  );
  return rows;
}
