import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { idDefensa: string } };

type EvidenciaRow = {
  idEvidencia: number | null;
  urlArchivo: string | null;
  fechaSubida: string | Date | null;
  idAsignacion: number | null;
  idDelegado: number | null;
  nombreDelegado: string | null;
  apellidoDelegado: string | null;
};

type DefensaRow = {
  idDefensa: number;
  fecha: string | Date | null;
  lugar: string | null;
  titulo: string;
  nombreEstudiante: string;
  apellidoEstudiante: string;
};

function safeParseEvidencia(raw: string | null) {
  if (!raw) return null;
  const text = String(raw);
  try {
    const obj = JSON.parse(text) as unknown;
    if (!obj || typeof obj !== "object") return null;
    return obj as {
      comentarios?: string | null;
      imagenUrl?: string | null;
      pdfUrl?: string | null;
      imagenNombre?: string | null;
      pdfNombre?: string | null;
    };
  } catch {
    return { comentarios: text };
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const idDefensa = Number(ctx.params.idDefensa);
    if (!Number.isFinite(idDefensa)) {
      return NextResponse.json(
        { ok: false, mensaje: "idDefensa inválido" },
        { status: 400 },
      );
    }

    const pool = getPool();

    const [defRows] = await pool.query(
      `SELECT d.idDefensa, d.fecha, d.lugar,
              pt.titulo,
              est.nombre AS nombreEstudiante,
              est.apellido AS apellidoEstudiante
       FROM Defensa d
       JOIN PerfilTesis pt ON d.idPerfil = pt.idPerfil
       JOIN Estudiante est ON pt.idEstudiante = est.idEstudiante
       WHERE d.idDefensa = ?
       LIMIT 1`,
      [idDefensa],
    );
    const defRow = (defRows as DefensaRow[])[0] ?? null;

    const [rows] = await pool.query(
      `SELECT e.idEvidencia, e.urlArchivo, e.fechaSubida,
              ad.idAsignacion, ad.idDelegado,
              u.nombre AS nombreDelegado, u.apellido AS apellidoDelegado
       FROM AsignacionDelegado ad
       LEFT JOIN Evidencia e ON e.idAsignacion = ad.idAsignacion
       LEFT JOIN Usuario u ON ad.idDelegado = u.idUsuario
       WHERE ad.idDefensa = ?
       ORDER BY e.idEvidencia DESC`,
      [idDefensa],
    );

    const list = rows as EvidenciaRow[];
    const evidencias = list
      .map((r) => {
        const parsed = safeParseEvidencia(r.urlArchivo);
        if (!parsed) return null;
        return {
          idAsignacion: r.idAsignacion ?? null,
          urlImagen: parsed.imagenUrl ?? null,
          urlPdf: parsed.pdfUrl ?? null,
          comentarios: parsed.comentarios ?? null,
          urlArchivo: r.urlArchivo,
          fechaSubida: r.fechaSubida ?? null,
          idDelegado: r.idDelegado ?? null,
          nombreDelegado: r.nombreDelegado ?? null,
          apellidoDelegado: r.apellidoDelegado ?? null,
        };
      })
      .filter(Boolean);

    let defensa = null;
    if (defRow) {
      const primerDelegado = evidencias[0];
      defensa = {
        idDefensa: defRow.idDefensa,
        titulo: defRow.titulo,
        fecha: defRow.fecha,
        lugar: defRow.lugar,
        nombreEstudiante: defRow.nombreEstudiante,
        apellidoEstudiante: defRow.apellidoEstudiante,
        nombreDelegado: primerDelegado?.nombreDelegado ?? null,
        apellidoDelegado: primerDelegado?.apellidoDelegado ?? null,
      };
    }

    return NextResponse.json({ ok: true, defensa, evidencias });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
