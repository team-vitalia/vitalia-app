import api from "./api";

export interface DatosRegistroPaciente {
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  curp: string;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  correo_electronico: string;
  password: string;
  telefono?: string | null;
}

export interface RespuestaRegistro {
  mensaje: string;
  usuario: {
    id_PK: number;
    nombre: string;
    apellido_paterno: string | null;
    apellido_materno: string | null;
    correo_electronico: string;
  };
}

export interface DatosRegistroGratuito {
  nombre_doctor: string;
  nombre_clinica?: string;
  correo: string;
  password: string;
}

export interface RespuestaRegistroGratuito {
  status: string;
  access_token: string;
  token_type: string;
  clinica_id: number;
  nombre_clinica: string;
  nombre_plan: string;
  mensaje: string;
  usuario_id: number;
}

export const registrarPaciente = async (datos: DatosRegistroPaciente) =>
  (await api.post<RespuestaRegistro>("/api/auth/registro", datos)).data;

export const registrarGratuito = async (datos: DatosRegistroGratuito) =>
  (await api.post<RespuestaRegistroGratuito>("/api/suscripciones/registro-gratuito", datos)).data;
