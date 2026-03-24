import { getPool } from "@/lib/db";

export async function listarPagosAdmin() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       p.idPago, p.monto, p.estado, p.fechaPago,
       d.idDefensa, d.fecha,
       e.nombre AS nombreEstudiante, e.apellido AS apellidoEstudiante,
       u.nombre AS nombreDelegado, u.apellido AS apellidoDelegado
     FROM Pago p
     JOIN Defensa d ON p.idDefensa = d.idDefensa
     JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
     JOIN Estudiante e ON pt.idEstudiante = e.idEstudiante
     LEFT JOIN AsignacionDelegado ad ON d.idDefensa = ad.idDefensa
     LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
     ORDER BY p.estado ASC, d.fecha DESC`
  );
  return rows;
}

export async function marcarPagoPagado(id: string) {
  const pool = getPool();
  await pool.query(
    "UPDATE Pago SET estado = 'pagado', fechaPago = NOW() WHERE idPago = ?",
    [id]
  );
}
