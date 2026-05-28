import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool } from "@/lib/db";
import { crearPagoPendientePorDefensa } from "@/server/pagos";

export async function actualizarEstadoAsignacion(
  id: string,
  estado: string,
  _justificacion?: string
) {
  const pool = getPool();
  await pool.query("UPDATE AsignacionDelegado SET estado = ? WHERE idAsignacion = ?", [
    estado,
    id,
  ]);
}

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function guardarArchivo(
  file: File,
  idAsignacion: string,
  prefijo: string,
  extForzada?: string,
): Promise<string> {
  const baseDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "evidencias",
    idAsignacion,
  );
  await fs.mkdir(baseDir, { recursive: true });
  const ext = extForzada ?? (path.extname(file.name) || "").toLowerCase();
  const nombre = `${prefijo}-${Date.now()}${ext || ""}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(baseDir, nombre), buf);
  return `/uploads/evidencias/${idAsignacion}/${nombre}`;
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

  let urlImagen: string | null = null;
  if (evidencia.imagen && evidencia.imagen.size > 0) {
    if (evidencia.imagen.size > MAX_IMAGEN_BYTES) {
      throw new Error("La imagen supera el tamaño máximo (5 MB)");
    }
    urlImagen = await guardarArchivo(evidencia.imagen, id, "acta");
  }

  let urlPdf: string | null = null;
  if (evidencia.pdf && evidencia.pdf.size > 0) {
    if (evidencia.pdf.size > MAX_PDF_BYTES) {
      throw new Error("El PDF supera el tamaño máximo (10 MB)");
    }
    urlPdf = await guardarArchivo(evidencia.pdf, id, "informe", ".pdf");
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
  if (urlImagen || urlPdf || comentarios) {
    await pool.query(
      `INSERT INTO Evidencia (idAsignacion, urlImagen, urlPdf, comentarios, fechaSubida)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [id, urlImagen, urlPdf, comentarios],
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
       e.urlPdf,
       e.comentarios,
       e.urlArchivo,
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
