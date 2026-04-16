import { z } from "zod";

// Login Schema
export const loginSchema = z.object({
  correo: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// Recuperar Password Schema
export const recuperarSchema = z.object({
  correo: z.string().email("Correo electrónico inválido"),
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  codigo: z.string().length(6, "El código debe tener exactamente 6 dígitos").regex(/^\d+$/, "Solo dígitos permitidos"),
  nuevaPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Signup Schema
export const signupSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  apellido: z.string().min(2, "Apellido demasiado corto"),
  correo: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirm"],
});

// Defensa Schema
export const defensaSchema = z.object({
  estudianteNombre: z.string().min(3, "Nombre muy corto"),
  estudianteApellido: z.string().min(3, "Apellido muy corto"),
  titulo: z.string().min(5, "Título demasiado corto"),
  fecha: z.string().refine((val) => !isNaN(Date.parse(val)), "Fecha inválida"),
  hora: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Hora inválida"),
  lugar: z.string().min(2, "Lugar requerido"),
});

// Evidencia Schema
export const evidenciaSchema = z.object({
  tieneImagen: z.boolean().refine(val => val === true, "La imagen del acta es obligatoria"),
  tienePdf: z.boolean().refine(val => val === true, "El archivo PDF es obligatorio"),
  comentarios: z.string().optional(),
});

// Change Password Schema
export const changePasswordSchema = z.object({
  actual: z.string().min(1, "Contraseña actual requerida"),
  nueva: z.string().min(6, "Mínimo 6 caracteres"),
  confirmar: z.string(),
}).refine(data => data.nueva === data.confirmar, {
  message: "Las contraseñas no coinciden",
  path: ["confirmar"],
});
