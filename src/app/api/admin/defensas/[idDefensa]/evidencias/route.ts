import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { idDefensa: string } };

type EvidenciaRow = {
  urlArchivo: string | null;
  idAsignacion?: number | null;
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
    // Compatibilidad: si antes se guardaba texto plano, lo tratamos como comentario.
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
    const [rows] = await pool.query(
      `SELECT e.urlArchivo, ad.idAsignacion
       FROM AsignacionDelegado ad
       LEFT JOIN Evidencia e ON e.idAsignacion = ad.idAsignacion
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
          ...parsed,
          idAsignacion: r.idAsignacion ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, evidencias });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
