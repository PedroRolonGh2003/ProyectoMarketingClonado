import { NextResponse } from "next/server";
import { completarAsignacion } from "@/server/asignacion";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const imagen = form.get("imagen");
      const pdf = form.get("pdf");
      const comentarios = form.get("comentarios");
      await completarAsignacion(id, {
        imagen: imagen instanceof File ? imagen : null,
        pdf: pdf instanceof File ? pdf : null,
        comentarios: typeof comentarios === "string" ? comentarios : null,
      });
    } else {
      const body = await request.json().catch(() => ({}));
      await completarAsignacion(id, { comentarios: body?.comentarios ?? null });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
