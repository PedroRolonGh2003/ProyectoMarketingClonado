import { NextResponse } from "next/server";
import { crearDefensa, getDefensasLista } from "@/server/defensas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const defensas = await getDefensasLista();
    return NextResponse.json({ ok: true, defensas });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const estudianteNombre = String(body.estudianteNombre ?? "").trim();
    const estudianteApellido = String(body.estudianteApellido ?? "").trim();
    const titulo = String(body.titulo ?? "").trim();
    const lugar = String(body.lugar ?? "").trim();

    if (!estudianteNombre || !estudianteApellido || !titulo || !lugar) {
      return NextResponse.json(
        { ok: false, mensaje: "Faltan campos obligatorios" },
        { status: 400 },
      );
    }

    await crearDefensa({
      estudianteNombre,
      estudianteApellido,
      titulo,
      lugar,
      fecha: body.fecha ?? null,
      direccion: body.direccion ? String(body.direccion).trim() : null,
      observaciones: body.observaciones
        ? String(body.observaciones).trim()
        : null,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ ok: false, mensaje: message }, { status: 500 });
  }
}
