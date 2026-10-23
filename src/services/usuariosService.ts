import api from "./api";
import { authHeaders } from "./util";

export interface EspecialidadAsignada {
  id_PK: number;
  nombre: string;
}

/** Fila del listado (GET /api/usuarios/). Los campos de doctor son null/[] para otros roles. */
export interface UsuarioFila {
  id_PK: number;
  nombre: string;
  correo_electronico: string;
  telefono: string | null;
  rol_id_FK: number | null;
  rol: string | null;
  estado: string | null;
  creado_en: string | null;
  ultimo_acceso: string | null;
  doctor_id: number | null;
  numero_licencia: string | null;
  costo_consulta: number | null;
  especialidades: EspecialidadAsignada[];
}

export interface CambiosUsuario {
  nombre?: string;
  correo_electronico?: string;
  telefono?: string | null;
  rol_id_FK?: number;
  estado?: "activo" | "inactivo";
}

export interface CambiosDoctor {
  numero_licencia?: string | null;
  costo_consulta?: number | null;
  especialidad_ids?: number[];
}

export const listarUsuarios = async (token?: string | null) =>
  (await api.get<UsuarioFila[]>("/api/usuarios/", authHeaders(token))).data;

export const actualizarUsuario = async (id: number, cambios: CambiosUsuario, token?: string | null) =>
  (await api.patch(`/api/usuarios/${id}`, cambios, authHeaders(token))).data;

export const cambiarEstadoUsuario = (id: number, estado: "activo" | "inactivo", token?: string | null) =>
  actualizarUsuario(id, { estado }, token);

export const actualizarDoctor = async (doctorId: number, cambios: CambiosDoctor, token?: string | null) =>
  (await api.put(`/api/doctores/${doctorId}`, cambios, authHeaders(token))).data;

/** Reglas de permiso compartidas por tabla y panel (espejo de las del backend). */
export function permisosSobre(u: UsuarioFila, rolActor?: number, idActor?: number) {
  const esPropio = u.id_PK === idActor;
  // El coordinador no puede tocar administradores ni otros coordinadores.
  const protegido = rolActor === 5 && (u.rol_id_FK === 1 || u.rol_id_FK === 5) && !esPropio;
  return {
    esPropio,
    protegido,
    puedeEditar: !protegido,
    puedeCambiarEstado: !protegido && !esPropio,
  };
}
