import { NextResponse } from "next/server";
import {
  buildFechaHoraISO,
  parseEstudianteDesdeBody,
  validarFechaHoraDefensa,
} from "@/lib/defensa-form";
import {
  BusinessError,
  crearDefensa,
  getDefensasLista,
} from "@/server/defensas";

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
    const body = (await request.json()) as Record<string, unknown>;
    const { nombre: estudianteNombre, apellido: estudianteApellido } =
      parseEstudianteDesdeBody(body);
    const titulo = String(body.titulo ?? "").trim();
    const lugar = String(body.lugar ?? "").trim();
    const fechaStr = String(body.fecha ?? "").trim();
    const horaStr = String(body.hora ?? "").trim();

    const faltantes: string[] = [];
    if (!estudianteNombre) faltantes.push("nombre del estudiante");
    if (!titulo) faltantes.push("título");
    if (!lugar) faltantes.push("lugar");

    if (faltantes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: `Faltan campos obligatorios: ${faltantes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const fecha = fechaStr.includes(" ")
      ? fechaStr
      : (buildFechaHoraISO(fechaStr, horaStr) ??
        (body.fecha ? String(body.fecha).trim() : null));

    if (!fecha) {
      return NextResponse.json(
        { ok: false, mensaje: "Fecha u hora inválida" },
        { status: 400 },
      );
    }

    const fechaError = validarFechaHoraDefensa(fecha);
    if (fechaError) {
      return NextResponse.json(
        { ok: false, mensaje: fechaError },
        { status: 400 },
      );
    }

    await crearDefensa({
      estudianteNombre,
      estudianteApellido,
      titulo,
      lugar,
      fecha,
      direccion: body.direccion ? String(body.direccion).trim() : null,
      observaciones: body.observaciones
        ? String(body.observaciones).trim()
        : null,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    const status = err instanceof BusinessError ? 400 : 500;
    return NextResponse.json({ ok: false, mensaje: message }, { status });
  }
}
