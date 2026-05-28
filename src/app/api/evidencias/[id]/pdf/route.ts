import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function GET(_: Request, context: Ctx) {
  try {
    const { id } = context.params;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT pdfArchivo, pdfMime, pdfNombre FROM Evidencia WHERE idEvidencia = ?`,
      [id],
    );
    const list = rows as Array<{
      pdfArchivo: Buffer | null;
      pdfMime: string | null;
      pdfNombre: string | null;
    }>;

    if (list.length === 0 || !list[0].pdfArchivo) {
      return NextResponse.json(
        { ok: false, mensaje: "PDF no encontrado" },
        { status: 404 },
      );
    }

    const { pdfArchivo, pdfMime, pdfNombre } = list[0];
    const filename = pdfNombre || "documento.pdf";

    return new Response(new Uint8Array(pdfArchivo), {
      headers: {
        "Content-Type": pdfMime || "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    console.error("[api] GET /evidencias/[id]/pdf:", message);
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
