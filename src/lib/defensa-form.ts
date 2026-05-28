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
  const fechaTrim = fecha.trim();
  const horaNorm = hora.trim().slice(0, 5);
  // Validar formato sin Date() para evitar conversiones de timezone.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTrim)) return null;
  if (!/^\d{2}:\d{2}$/.test(horaNorm)) return null;
  return `${fechaTrim} ${horaNorm}:00`;
}

/** Extrae "YYYY-MM-DDTHH:MM" del ISO/MySQL DATETIME, sin conversión de timezone.
 *  Tratamos la fecha como wall-clock literal: lo que está en la cadena es lo
 *  que el usuario ve y edita. */
export function isoALocalNaive(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!m) return "";
  return `${m[1]}T${m[2]}`;
}

/** Inversa de isoALocalNaive: empaqueta el valor del <input datetime-local>
 *  como ISO terminado en Z (sin convertir zona horaria). */
export function localNaiveAISO(local: string | null | undefined): string {
  if (!local) return "";
  const m = String(local).match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/,
  );
  if (!m) return "";
  return `${m[1]}T${m[2]}:${m[3] ?? "00"}.000Z`;
}

const FECHA_HORA_LOCAL_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/;

export function esFechaHoraPasada(fechaHora: string): boolean {
  const m = String(fechaHora).trim().match(FECHA_HORA_LOCAL_REGEX);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");
  const fecha = new Date(year, month, day, hour, minute, second);
  return fecha.getTime() < Date.now();
}

export function validarFechaHoraDefensa(fechaHora: string): string | null {
  const value = String(fechaHora ?? "").trim();
  if (!value) return "Fecha u hora inválida";
  if (!FECHA_HORA_LOCAL_REGEX.test(value)) {
    return "Fecha u hora inválida";
  }
  if (esFechaHoraPasada(value)) {
    return "La fecha y hora de la defensa no pueden ser anteriores a la fecha y hora actual.";
  }
  return null;
}

/** Acepta ISO con Z, datetime-local o ya-MySQL; devuelve "YYYY-MM-DD HH:MM:SS". */
export function normalizarFechaMySQL(
  fecha: string | null | undefined,
): string | null {
  if (!fecha) return null;
  const s = String(fecha).trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1]} ${m[2]}:${m[3] ?? "00"}`;
}
