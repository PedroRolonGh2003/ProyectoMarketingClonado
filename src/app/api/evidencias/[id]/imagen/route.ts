import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function GET(_: Request, context: Ctx) {
  try {
    const { id } = context.params;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT imagenArchivo, imagenMime FROM Evidencia WHERE idEvidencia = ?`,
      [id],
    );
    const list = rows as Array<{
      imagenArchivo: Buffer | null;
      imagenMime: string | null;
    }>;

    if (list.length === 0 || !list[0].imagenArchivo) {
      return NextResponse.json(
        { ok: false, mensaje: "Imagen no encontrada" },
        { status: 404 },
      );
    }

    const { imagenArchivo, imagenMime } = list[0];
    return new Response(new Uint8Array(imagenArchivo), {
      headers: {
        "Content-Type": imagenMime || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    console.error("[api] GET /evidencias/[id]/imagen:", message);
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
