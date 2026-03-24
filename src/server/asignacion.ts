import { getPool } from "@/lib/db";

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

export async function completarAsignacion(id: string, comentarios?: string) {
  const pool = getPool();
  await pool.query(
    "UPDATE AsignacionDelegado SET estado = 'completada' WHERE idAsignacion = ?",
    [id]
  );
  const [rows] = await pool.query(
    "SELECT idDefensa FROM AsignacionDelegado WHERE idAsignacion = ?",
    [id]
  );
  const list = rows as { idDefensa: number }[];
  if (list.length > 0) {
    await pool.query("UPDATE Defensa SET estado = 'completada' WHERE idDefensa = ?", [
      list[0].idDefensa,
    ]);
    if (comentarios) {
      await pool.query("INSERT INTO Evidencia (idAsignacion, urlArchivo) VALUES (?, ?)", [
        id,
        comentarios,
      ]);
    }
  }
}
