import { NextResponse } from "next/server";
import { subirArchivo } from "@/lib/cloudinary";
import { completarAsignacion, type EvidenciaPayload } from "@/server/asignacion";

type Ctx = { params: { id: string } };

export const runtime = "nodejs";

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = context.params;
    const contentType = request.headers.get("content-type") || "";

    let evidencia: EvidenciaPayload | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const comentarios = String(form.get("comentarios") ?? "").trim();
      const imagen = form.get("imagen");
      const pdf = form.get("pdf");

      let imagenUrl: string | null = null;
      let pdfUrl: string | null = null;
      let imagenNombre: string | null = null;
      let pdfNombre: string | null = null;

      if (imagen instanceof File && imagen.size > 0) {
        imagenNombre = imagen.name || "evidencia.jpg";
        const buffer = Buffer.from(await imagen.arrayBuffer());
        imagenUrl = await subirArchivo(buffer, {
          folder: `evidencias/asignacion-${id}`,
          public_id: `imagen-${Date.now()}`,
          resource_type: "image",
          overwrite: true,
        });
      }

      if (pdf instanceof File && pdf.size > 0) {
        pdfNombre = pdf.name || "evidencia.pdf";
        const buffer = Buffer.from(await pdf.arrayBuffer());
        pdfUrl = await subirArchivo(buffer, {
          folder: `evidencias/asignacion-${id}`,
          public_id: `pdf-${Date.now()}`,
          resource_type: "raw",
          format: "pdf",
          overwrite: true,
        });
      }

      evidencia = { comentarios, imagenUrl, pdfUrl, imagenNombre, pdfNombre };
    } else {
      // Compatibilidad con el cliente antiguo (solo comentarios).
      const body = await request.json();
      const comentarios = String(body?.comentarios ?? "").trim();
      evidencia = { comentarios };
    }

    await completarAsignacion(id, evidencia);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
