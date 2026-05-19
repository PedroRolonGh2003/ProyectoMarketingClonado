/** Parsea nombre completo del estudiante para guardar en BD (nombre + apellido). */
export function parseNombreEstudiante(completo: string): {
  nombre: string;
  apellido: string;
} {
  const texto = completo.trim().replace(/\s+/g, " ");
  if (!texto) return { nombre: "", apellido: "" };
  const partes = texto.split(" ");
  if (partes.length === 1) {
    return { nombre: partes[0], apellido: partes[0] };
  }
  return { nombre: partes[0], apellido: partes.slice(1).join(" ") };
}

export function parseEstudianteDesdeBody(body: Record<string, unknown>): {
  nombre: string;
  apellido: string;
} {
  let nombre = String(body.estudianteNombre ?? "").trim();
  let apellido = String(body.estudianteApellido ?? "").trim();
  const nombreCompleto = String(
    body.nombreEstudiante ?? body.nombreCompleto ?? "",
  ).trim();

  if (!nombre && nombreCompleto) {
    return parseNombreEstudiante(nombreCompleto);
  }

  if (nombre && !apellido) {
    return parseNombreEstudiante(nombre);
  }

  return { nombre, apellido };
}

export function buildFechaHoraISO(fecha: string, hora: string): string | null {
  if (!fecha?.trim() || !hora?.trim()) return null;
  const horaNorm = hora.trim().slice(0, 5);
  const d = new Date(`${fecha.trim()}T${horaNorm}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}
