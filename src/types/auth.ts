export interface SignupPayload {
  token: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  password: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  mensaje?: string;
  data?: T;
}
