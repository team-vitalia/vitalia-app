import api from "./api";

/* ============================================================
   Flujo clínico: consulta → expediente → receta, lista de espera
   y transferencia de pacientes. Todas LANZAN el error; usa
   `mensajeError` (c2Service) para mostrarlo.
============================================================ */

/* ---------- Recetas ---------- */
export interface ItemRecetaPayload {
  medicamento_id_FK: number;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad: number;
  instrucciones?: string;
  via_administracion?: string;
}

export interface RecetaCreada {
  id_PK: number;
  estado: string | null;
  advertencias_interacciones: {
    medicamento_1: string;
    medicamento_2: string;
    severidad: string;
    descripcion: string;
    accion_requerida?: string | null;
  }[];
  alertas_alergias: { medicamento: string; alergia: string; mensaje: string }[];
  hay_faltantes: boolean;
  mensaje_disponibilidad: string | null;
}

/** `citaId` hace que el backend busque/cree la consulta del médico para esa cita. */
export const crearReceta = async (p: {
  pacienteId: number;
  citaId: number;
  items: ItemRecetaPayload[];
  confirmarInteracciones?: boolean;
}): Promise<RecetaCreada> =>
  (
    await api.post("/api/recetas/", {
      paciente_id_FK: p.pacienteId,
      cita_id_FK: p.citaId,
      items: p.items,
      confirmar_interacciones: !!p.confirmarInteracciones,
    })
  ).data;

export interface RecetaPaciente {
  id_PK: number;
  estado: string | null;
  creado_en: string;
  doctor: string | null;
  items: {
    id_PK: number;
    medicamento: string | null;
    presentacion: string | null;
    dosis: string | null;
    frecuencia: string | null;
    duracion: string | null;
    cantidad: number | null;
    cantidad_dispensada: number;
    instrucciones: string | null;
  }[];
}

export const getMisRecetas = async (): Promise<RecetaPaciente[]> =>
  (await api.get("/api/recetas/mis-recetas")).data;

/* ---------- Consultas ---------- */
export const registrarConsulta = async (p: {
  citaId: number;
  diagnostico?: string;
  tratamiento?: string;
  notas?: string;
  codigoCie10?: string;
  signosVitales?: Record<string, string | number>;
  fechaProximaCita?: string;
}) =>
  (
    await api.post("/api/consultas/", {
      cita_id_FK: p.citaId,
      diagnostico: p.diagnostico || null,
      tratamiento: p.tratamiento || null,
      notas: p.notas || null,
      codigo_cie10: p.codigoCie10 || null,
      signos_vitales: p.signosVitales && Object.keys(p.signosVitales).length ? p.signosVitales : null,
      fecha_proxima_cita: p.fechaProximaCita || null,
      finalizar_cita: true,
    })
  ).data;

/* ---------- Expediente ---------- */
export interface Expediente {
  paciente: {
    id_PK: number;
    nombre_completo: string | null;
    fecha_nacimiento: string | null;
    genero: string | null;
    telefono: string | null;
    correo_electronico: string | null;
  };
  datos_clinicos: { tipo_sangre?: string; nombre_contacto_emergencia?: string; telefono_contacto_emergencia?: string };
  alergias: { id_PK: number; alergia_id_FK: number; nombre: string; tipo_alergia: string | null; severidad: string | null; notas: string | null }[];
  antecedentes: { id_PK: number; descripcion: string | null; diagnostico: string | null; estado: string | null; fecha_diagnostico: string | null; tratamiento: string | null; doctor: string | null }[];
  consultas: { id_PK: number; fecha_visita: string | null; doctor: string | null; diagnostico: string | null; tratamiento: string | null; codigo_cie10: string | null; notas?: string | null }[];
  recetas: { id_PK: number; estado: string | null; creado_en: string; doctor: string | null; medicamentos: string[] }[];
  // Solo para personal clínico (no vienen en la vista del paciente)
  registros?: { id_PK: number; tipo_registro: string | null; notas_generales: string | null; creado_en: string; doctor: string | null }[];
  transferencias?: { id_PK: number; de: string | null; a: string | null; motivo: string | null; creado_en: string }[];
}

export const getExpediente = async (pacienteId: number): Promise<Expediente> =>
  (await api.get(`/api/expediente/paciente/${pacienteId}`)).data;

export const getMiExpediente = async (): Promise<Expediente> =>
  (await api.get("/api/expediente/mi-expediente")).data;

export const agregarAntecedente = async (pacienteId: number, datos: Record<string, string | null>) =>
  (await api.post(`/api/expediente/paciente/${pacienteId}/antecedentes`, datos)).data;

export const agregarRegistro = async (pacienteId: number, notas: string, tipo?: string) =>
  (await api.post(`/api/expediente/paciente/${pacienteId}/registros`, { notas_generales: notas, tipo_registro: tipo || null })).data;

export const getCatalogoAlergias = async (): Promise<{ id_PK: number; nombre: string }[]> =>
  (await api.get("/api/expediente/alergias/catalogo")).data;

export const crearAlergiaCatalogo = async (nombre: string, tipo?: string) =>
  (await api.post("/api/expediente/alergias/catalogo", { nombre, tipo_alergia: tipo || null })).data;

export const asignarAlergia = async (pacienteId: number, alergiaId: number, severidad?: string) =>
  (await api.post(`/api/expediente/paciente/${pacienteId}/alergias`, { alergia_id_FK: alergiaId, severidad: severidad || null })).data;

export const quitarAlergia = async (pacienteId: number, alergiaPacienteId: number) =>
  (await api.delete(`/api/expediente/paciente/${pacienteId}/alergias/${alergiaPacienteId}`)).data;

/* ---------- Lista de espera de citas ---------- */
export type Prioridad = "normal" | "alta" | "urgente";
export type EstadoEspera = "en_espera" | "notificado" | "asignada" | "cancelada";

export interface EntradaEspera {
  id_PK: number;
  paciente_id_FK: number;
  paciente: string | null;
  doctor_id_FK: number | null;
  doctor: string | null;
  fecha_deseada: string | null;
  motivo: string | null;
  prioridad: Prioridad;
  estado: EstadoEspera;
  posicion: number | null;
  creado_en: string;
}

export const listarEspera = async (): Promise<EntradaEspera[]> => (await api.get("/api/lista-espera/")).data;

export const agregarAEspera = async (p: {
  pacienteId: number;
  doctorId?: number | null;
  fechaDeseada?: string;
  motivo?: string;
  prioridad: Prioridad;
}) =>
  (
    await api.post("/api/lista-espera/", {
      paciente_id_FK: p.pacienteId,
      doctor_id_FK: p.doctorId ?? null,
      fecha_deseada: p.fechaDeseada || null,
      motivo: p.motivo || null,
      prioridad: p.prioridad,
    })
  ).data;

export const notificarEspera = async (id: number) => (await api.post(`/api/lista-espera/${id}/notificar`)).data;

export const cambiarEstadoEspera = async (id: number, estado: EstadoEspera, citaId?: number) =>
  (await api.patch(`/api/lista-espera/${id}/estado`, { estado, cita_id_FK: citaId ?? null })).data;

export const quitarDeEspera = async (id: number) => (await api.delete(`/api/lista-espera/${id}`)).data;

/* ---------- Transferencia de pacientes ---------- */
export const getDoctoresParaTransferir = async (): Promise<{ id_PK: number; nombre: string; especialidades: { nombre: string }[] }[]> =>
  (await api.get("/api/doctores/lista-para-transferir")).data;

export interface TransferenciaResultado {
  citas_reasignadas: number;
  citas_con_conflicto: { cita_id: number; fecha: string; hora_inicio: string | null }[];
  doctor_destino: string | null;
}

export const transferirPaciente = async (pacienteId: number, doctorDestinoId: number, motivo?: string): Promise<TransferenciaResultado> =>
  (
    await api.post("/api/transferencias/", {
      paciente_id_FK: pacienteId,
      doctor_destino_id_FK: doctorDestinoId,
      motivo: motivo || null,
    })
  ).data;
