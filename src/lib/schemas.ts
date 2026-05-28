import { z } from "zod";
import { esFechaHoraPasada } from "./defensa-form";

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
  codigo: z
    .string()
    .length(6, "El código debe tener exactamente 6 dígitos")
    .regex(/^\d+$/, "Solo dígitos permitidos"),
  nuevaPassword: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Signup Schema
export const signupSchema = z
  .object({
    nombre: z.string().min(2, "Nombre demasiado corto"),
    apellido: z.string().min(2, "Apellido demasiado corto"),
    correo: z.string().email("Email inválido"),
    telefono: z.string().optional(),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
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

// Defensa Editar Schema — el modal del admin usa un solo input datetime-local
// para fecha+hora, así que validamos un campo combinado en vez de separados.
export const defensaEditarSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "El título debe tener al menos 5 caracteres")
    .max(200, "El título es demasiado largo")
    .regex(/[A-Za-zÀ-ÿñÑ]/, "El título debe contener al menos una letra"),
  nombreEstudiante: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre es demasiado largo")
    .regex(/^[A-Za-zÀ-ÿñÑ\s'-]+$/, "El nombre solo puede contener letras"),
  apellidoEstudiante: z
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido es demasiado largo")
    .regex(/^[A-Za-zÀ-ÿñÑ\s'-]+$/, "El apellido solo puede contener letras"),
  fecha: z
    .string()
    .min(1, "La fecha es obligatoria")
    .refine((val) => !Number.isNaN(Date.parse(val)), "Fecha inválida"),
  lugar: z
    .string()
    .trim()
    .min(2, "El lugar es obligatorio")
    .max(100, "El lugar es demasiado largo")
    .regex(/[A-Za-zÀ-ÿñÑ]/, "El lugar debe contener al menos una letra"),
});

// Evidencia Schema
export const evidenciaSchema = z.object({
  tieneImagen: z
    .boolean()
    .refine((val) => val === true, "La imagen del acta es obligatoria"),
  tienePdf: z
    .boolean()
    .refine((val) => val === true, "El archivo PDF es obligatorio"),
  comentarios: z.string().optional(),
});

// Delegado (común para crear/editar) — la password se valida por separado
// porque al editar es opcional.
export const delegadoBaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre es demasiado largo")
    .regex(/^[A-Za-zÀ-ÿñÑ\s'-]+$/, "El nombre solo puede contener letras"),
  apellido: z
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido es demasiado largo")
    .regex(/^[A-Za-zÀ-ÿñÑ\s'-]+$/, "El apellido solo puede contener letras"),
  correo: z.string().trim().email("Correo electrónico inválido"),
  telefono: z
    .string()
    .trim()
    .min(7, "El teléfono debe tener al menos 7 dígitos")
    .max(15, "El teléfono es demasiado largo")
    .regex(/^[+0-9\s-]+$/, "Solo dígitos, espacios, + o -"),
});

export const delegadoNuevoSchema = delegadoBaseSchema.extend({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const delegadoEditarSchema = delegadoBaseSchema.extend({
  password: z
    .string()
    .refine((v) => v === "" || v.length >= 8, {
      message: "La contraseña debe tener al menos 8 caracteres",
    })
    .optional(),
});

// Change Password Schema
export const changePasswordSchema = z
  .object({
    actual: z.string().min(1, "Contraseña actual requerida"),
    nueva: z.string().min(6, "Mínimo 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((data) => data.nueva === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
