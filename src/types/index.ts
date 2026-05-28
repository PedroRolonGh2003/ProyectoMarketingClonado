export interface UsuarioSesion {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: number;
  rolNombre: string;
}

export interface Defensa {
  idDefensa: number;
  idAsignacion?: number;
  fecha: string;
  lugar: string;
  estado: string;
  estadoAsignacion?: string;
  estadoPago?: string;
  titulo: string;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  nombreDelegado?: string;
  apellidoDelegado?: string;
  motivoRechazo?: string | null;
}

export interface Delegado {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  activo: number;
  defensasAsignadas?: number;
}

export interface Pago {
  idPago: number;
  idDefensa: number;
  monto: number;
  estado: string;
  fechaPago: string | null;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  nombreDelegado?: string;
  apellidoDelegado?: string;
  fecha: string;
}
