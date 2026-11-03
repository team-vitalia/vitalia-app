import api from "./api";

/** Datos del registro PÚBLICO de pacientes (POST /api/auth/registro). No lleva rol: lo fija el servidor. */
export interface DatosRegistroPaciente {
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  curp: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  genero: string; // Femenino | Masculino | Otro
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

/** Crea una cuenta de paciente sin necesidad de iniciar sesión. */
export const registrarPaciente = async (datos: DatosRegistroPaciente) =>
  (await api.post<RespuestaRegistro>("/api/auth/registro", datos)).data;