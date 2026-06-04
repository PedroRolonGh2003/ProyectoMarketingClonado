import type { UsuarioSesion } from "@/types";

export function isUsuarioSesionValido(value: unknown): value is UsuarioSesion {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === "number" &&
    Number.isInteger(u.id) &&
    u.id > 0 &&
    typeof u.nombre === "string" &&
    u.nombre.length > 0 &&
    typeof u.apellido === "string" &&
    typeof u.correo === "string" &&
    u.correo.length > 0 &&
    typeof u.telefono === "string" &&
    (u.rol === 0 || u.rol === 1) &&
    typeof u.rolNombre === "string" &&
    (u.rolNombre === "Admin" || u.rolNombre === "Delegado")
  );
}
