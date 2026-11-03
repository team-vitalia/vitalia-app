import api from "./api";
import { authHeaders } from "./util";

export interface Especialidad {
  id_PK: number;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
  esta_activo: boolean;
}

export interface NuevaEspecialidad {
  nombre: string;
  descripcion?: string | null;
  codigo?: string | null;
}

export const listarEspecialidades = async (token?: string | null) =>
  (await api.get<Especialidad[]>("/api/especialidades/", authHeaders(token))).data;

export const crearEspecialidad = async (datos: NuevaEspecialidad, token?: string | null) =>
  (await api.post<Especialidad>("/api/especialidades/", datos, authHeaders(token))).data;
