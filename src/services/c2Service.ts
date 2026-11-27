import api from "./api";

/* ============================================================
   Tipos comunes
============================================================ */
export type PageMeta = {
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type Pagina<T> = { data: T[]; meta: PageMeta };

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Quita los parámetros vacíos para no mandar "?piso=" al backend. */
function limpiar(params: Record<string, string | number | undefined | null>) {
  const out: Record<string, string | number> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  });
  return out;
}

/** Extrae un mensaje legible de un error de axios / FastAPI. */
export function mensajeError(err: any, porDefecto = "Ocurrió un error inesperado."): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d: any) => (d?.msg ? String(d.msg).replace(/^Value error, /, "") : ""))
      .filter(Boolean)
      .join(" · ");
  }
  if (err?.response?.status === 403) return "No tienes permisos para realizar esta acción.";
  if (err?.response?.status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (err?.message === "Network Error") return "No se pudo conectar con el servidor.";
  return porDefecto;
}

/* ============================================================
   Salas
============================================================ */
export type Sala = {
  id_PK: number;
  nombre: string;
  tipo: string | null;
  ubicacion: string | null;
  estado: string | null;
  capacidad: number | null;
  piso: string | null;
  lista_equipamiento: string | null;
  // calculados por la API para las tarjetas
  total_equipos?: number;
  equipos_con_problema?: number;
  citas_proximas?: number;
};

export type SalaPayload = {
  nombre?: string;
  tipo?: string | null;
  ubicacion?: string | null;
  estado?: string | null;
  capacidad?: number | null;
  piso?: string | null;
  lista_equipamiento?: string | null;
};

export type FiltrosSalas = {
  estado?: string;
  piso?: string;
  tipo?: string;
  buscar?: string;
  page?: number;
  page_size?: number;
};

export async function listarSalas(token: string, filtros: FiltrosSalas = {}): Promise<Pagina<Sala>> {
  const r = await api.get<Pagina<Sala>>("/api/salas", {
    ...auth(token),
    params: limpiar(filtros),
  });
  return r.data;
}

export async function crearSala(token: string, payload: SalaPayload): Promise<Sala> {
  const r = await api.post<Sala>("/api/salas", payload, auth(token));
  return r.data;
}

export async function actualizarSala(token: string, id: number, payload: SalaPayload): Promise<Sala> {
  const r = await api.put<Sala>(`/api/salas/${id}`, payload, auth(token));
  return r.data;
}

export async function cambiarEstadoSala(token: string, id: number, estado: string): Promise<Sala> {
  const r = await api.patch<Sala>(`/api/salas/${id}/estado`, { estado }, auth(token));
  return r.data;
}

export async function eliminarSala(token: string, id: number): Promise<void> {
  await api.delete(`/api/salas/${id}`, auth(token));
}

/* ============================================================
   Equipamiento
============================================================ */
export type Equipo = {
  id_PK: number;
  sala_id_FK: number | null;
  nombre_equipo: string | null;
  tipo_equipo: string | null;
  numero_serie: string | null;
  estado: string | null;
  fecha_compra: string | null;
  ultimo_mantenimiento: string | null;
  proximo_mantenimiento: string | null;
  /** al_dia | proximo | vencido | sin_programar */
  mantenimiento_estado?: string | null;
};

export type EquipoPayload = {
  nombre_equipo?: string | null;
  tipo_equipo?: string | null;
  numero_serie?: string | null;
  estado?: string | null;
  fecha_compra?: string | null;
  ultimo_mantenimiento?: string | null;
  proximo_mantenimiento?: string | null;
};

export async function listarEquipos(token: string, salaId: number): Promise<Equipo[]> {
  const r = await api.get<Equipo[]>(`/api/salas/${salaId}/equipamiento`, auth(token));
  return r.data;
}

export async function agregarEquipo(token: string, salaId: number, payload: EquipoPayload): Promise<Equipo> {
  const r = await api.post<Equipo>(`/api/salas/${salaId}/equipamiento`, payload, auth(token));
  return r.data;
}

export async function actualizarEquipo(token: string, id: number, payload: EquipoPayload): Promise<Equipo> {
  const r = await api.put<Equipo>(`/api/equipamiento/${id}`, payload, auth(token));
  return r.data;
}

export async function eliminarEquipo(token: string, id: number): Promise<void> {
  await api.delete(`/api/equipamiento/${id}`, auth(token));
}

/* ============================================================
   Auditoría
============================================================ */
export type RegistroAuditoria = {
  id_PK: number;
  usuario_id_FK: number | null;
  accion: string | null;
  id_registro: number | null;
  descripcion: string | null;
  marca_tiempo: string;
  nombre_tabla: string | null;
  valores_antiguos: Record<string, any> | null;
  valores_nuevos: Record<string, any> | null;
  direccion_ip: string | null;
  // explicación en lenguaje sencillo (la genera la API)
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
  area?: string | null;
  area_texto?: string | null;
  tipo_accion?: string | null;
  accion_texto?: string | null;
  resumen?: string | null;
  tono?: "ok" | "warn" | "danger" | "info" | "neutral" | null;
  icono?: string | null;
  modo_cambios?: "alta" | "baja" | "cambio" | null;
  cambios?: { campo: string; etiqueta: string; antes: string; despues: string }[];
};

export type FiltrosAuditoria = {
  usuario_id?: number | string;
  nombre_tabla?: string;
  accion?: string;
  area?: string;
  tipo_accion?: string;
  buscar?: string;
  desde?: string; // ISO datetime
  hasta?: string; // ISO datetime
  page?: number;
  page_size?: number;
};

export async function listarAuditoria(
  token: string,
  filtros: FiltrosAuditoria = {}
): Promise<Pagina<RegistroAuditoria>> {
  const r = await api.get<Pagina<RegistroAuditoria>>("/api/auditoria", {
    ...auth(token),
    params: limpiar(filtros),
  });
  return r.data;
}

export type CatalogoAuditoria = {
  areas: { valor: string; etiqueta: string; icono: string }[];
  acciones: { valor: string; etiqueta: string; tono?: string; icono?: string }[];
};

export type ResumenAuditoria = {
  desde: string;
  hasta: string;
  total: number;
  por_area: Record<string, number>;
  por_tipo: Record<string, number>;
};

export async function catalogoAuditoria(token: string): Promise<CatalogoAuditoria> {
  const r = await api.get<CatalogoAuditoria>("/api/auditoria/catalogo", auth(token));
  return r.data;
}

export async function resumenAuditoria(token: string, desde?: string, hasta?: string): Promise<ResumenAuditoria> {
  const r = await api.get<ResumenAuditoria>("/api/auditoria/resumen", {
    ...auth(token),
    params: limpiar({ desde, hasta }),
  });
  return r.data;
}

/* ============================================================
   Reportes
============================================================ */
export type ReporteOcupacionSalas = {
  desde: string | null;
  hasta: string | null;
  total_salas: number;
  por_estado: Record<string, number>;
  detalle: {
    sala_id: number;
    nombre: string;
    tipo: string | null;
    piso: string | null;
    estado: string | null;
    capacidad: number | null;
    total_citas: number;
    horas_ocupadas: number;
  }[];
};

export type ReporteCitasPorDoctor = {
  desde: string | null;
  hasta: string | null;
  total_citas: number;
  detalle: {
    doctor_id: number | null;
    doctor: string | null;
    total: number;
    por_estado: Record<string, number>;
  }[];
};

export type ReporteTiemposEspera = {
  desde: string | null;
  hasta: string | null;
  total_atenciones: number;
  promedio_minutos: number;
  detalle: {
    doctor_id: number | null;
    doctor: string | null;
    atenciones: number;
    promedio_minutos: number;
    maximo_minutos: number;
  }[];
};

export type ReporteInventarioBajo = {
  umbral: number;
  total: number;
  detalle: {
    medicamento_id: number;
    nombre: string;
    presentacion: string | null;
    categoria: string | null;
    stock_total: number;
    lotes: number;
    proximo_vencimiento: string | null;
  }[];
};

export type ReporteRecetas = {
  desde: string | null;
  hasta: string | null;
  total: number;
  por_estado: Record<string, number>;
  detalle: { doctor_id: number | null; doctor: string | null; total: number }[];
};

export async function reporteOcupacionSalas(token: string, desde?: string, hasta?: string) {
  const r = await api.get<ReporteOcupacionSalas>("/api/reportes/ocupacion-salas", {
    ...auth(token),
    params: limpiar({ desde, hasta }),
  });
  return r.data;
}

export async function reporteCitasPorDoctor(token: string, desde?: string, hasta?: string) {
  const r = await api.get<ReporteCitasPorDoctor>("/api/reportes/citas-por-doctor", {
    ...auth(token),
    params: limpiar({ desde, hasta }),
  });
  return r.data;
}

export async function reporteTiemposEspera(token: string, desde?: string, hasta?: string) {
  const r = await api.get<ReporteTiemposEspera>("/api/reportes/tiempos-espera", {
    ...auth(token),
    params: limpiar({ desde, hasta }),
  });
  return r.data;
}

export async function reporteInventarioBajo(token: string, umbral: number) {
  const r = await api.get<ReporteInventarioBajo>("/api/reportes/inventario-bajo", {
    ...auth(token),
    params: { umbral },
  });
  return r.data;
}

export async function reporteRecetas(token: string, desde?: string, hasta?: string) {
  const r = await api.get<ReporteRecetas>("/api/reportes/recetas", {
    ...auth(token),
    params: limpiar({ desde, hasta }),
  });
  return r.data;
}

/* ============================================================
   Salas asignadas a doctores (con horario de uso)
============================================================ */
export type AsignacionSala = {
  id_PK?: number;
  sala_id_FK: number;
  dia_semana: number | null; // 0 = lunes ... 6 = domingo, null = todos los días
  hora_inicio: string; // "HH:MM" o "HH:MM:SS"
  hora_fin: string;
  sala_nombre?: string | null;
  sala_tipo?: string | null;
  sala_piso?: string | null;
  sala_estado?: string | null;
};

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const nombreDia = (d: number | null | undefined) => (d == null ? "Todos los días" : DIAS_SEMANA[d] ?? "—");
export const hhmm = (h: string) => (h ? h.slice(0, 5) : "");

export async function misSalas(token: string): Promise<AsignacionSala[]> {
  return (await api.get("/api/doctor-salas/mis-salas", auth(token))).data;
}

export async function salasDeDoctor(token: string, doctorId: number): Promise<AsignacionSala[]> {
  return (await api.get(`/api/doctor-salas/doctor/${doctorId}`, auth(token))).data;
}

export async function asignarSalas(
  token: string,
  doctorId: number,
  asignaciones: Pick<AsignacionSala, "sala_id_FK" | "dia_semana" | "hora_inicio" | "hora_fin">[]
): Promise<AsignacionSala[]> {
  return (await api.put(`/api/doctor-salas/doctor/${doctorId}`, { asignaciones }, auth(token))).data;
}

/* ---------- Calendario de uso de salas (doctor + sala + día + horario) ---------- */
export type AsignacionCalendario = {
  id_PK: number;
  doctor_id: number;
  doctor_nombre: string | null;
  especialidad: string | null;
  sala_id: number;
  sala_nombre: string | null;
  sala_tipo: string | null;
  sala_piso: string | null;
  sala_estado: string | null;
  dia_semana: number | null;
  hora_inicio: string;
  hora_fin: string;
};

export type NuevaAsignacion = {
  doctor_id: number;
  sala_id: number;
  dia_semana: number | null;
  hora_inicio: string; // "HH:MM"
  hora_fin: string;
  notificar: boolean;
};

export type ValidacionAsignacion = {
  valido: boolean;
  conflictos: { tipo: "doctor_ocupado" | "sala_ocupada" | "sala_no_disponible" | string; mensaje: string }[];
};

export async function calendarioSalas(token: string): Promise<AsignacionCalendario[]> {
  return (await api.get("/api/doctor-salas/calendario", auth(token))).data;
}

export async function validarAsignacion(token: string, datos: NuevaAsignacion, excluirId?: number): Promise<ValidacionAsignacion> {
  return (
    await api.post("/api/doctor-salas/asignaciones/validar", datos, { ...auth(token), params: limpiar({ excluir_id: excluirId }) })
  ).data;
}

export async function crearAsignacion(token: string, datos: NuevaAsignacion): Promise<{ id_PK: number; doctor_notificado: boolean }> {
  return (await api.post("/api/doctor-salas/asignaciones", datos, auth(token))).data;
}

export async function moverAsignacion(
  token: string,
  id: number,
  datos: NuevaAsignacion
): Promise<{ id_PK: number; doctor_notificado: boolean }> {
  return (await api.put(`/api/doctor-salas/asignaciones/${id}`, datos, auth(token))).data;
}

export async function quitarAsignacion(token: string, id: number, notificar = true): Promise<{ doctor_notificado: boolean }> {
  return (await api.delete(`/api/doctor-salas/asignaciones/${id}`, { ...auth(token), params: { notificar } })).data;
}

/* ============================================================
   Descarga de reportes (PDF / Excel)
============================================================ */
export async function descargarReporte(
  token: string,
  tipo: string,
  formato: "pdf" | "excel",
  params: { desde?: string; hasta?: string; umbral?: number } = {}
): Promise<void> {
  const res = await api.get(`/api/reportes/${tipo}/exportar`, {
    ...auth(token),
    params: limpiar({ formato, ...params }),
    responseType: "blob",
  });
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("La descarga de reportes está disponible en la versión web.");
  }
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_${tipo}.${formato === "pdf" ? "pdf" : "xlsx"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ============================================================
   Reportes Empresariales con IA
============================================================ */
export type AlertaIA = {
  titulo: string;
  descripcion: string;
  prioridad: "critico" | "oportunidad" | "optimo";
  metrica: string;
};

export type RecomendacionIA = {
  titulo: string;
  accion: string;
  impacto_esperado: string;
  area: string;
};

export type InsightsIA = {
  resumen_ejecutivo: string;
  score_eficiencia: number;
  alertas_anomalias: AlertaIA[];
  recomendaciones: RecomendacionIA[];
  origen?: string;
  modelo?: string;
};

export type MetricaComparativa = {
  indicador: string;
  clave: string;
  unidad: string;
  valor_actual: number;
  valor_anterior: number;
  variacion_pct: number;
  tendencia: "up" | "down" | "neutral";
  favorable: boolean;
};

export type ReporteEmpresarialDatos = {
  tipo: string;
  desde: string | null;
  hasta: string | null;
  anterior_desde: string | null;
  anterior_hasta: string | null;
  resumen_general: {
    total_citas: number;
    citas_atendidas: number;
    citas_canceladas: number;
    total_salas: number;
    horas_ocupadas_totales: number;
    espera_promedio_minutos: number;
    total_atenciones_espera: number;
    total_medicamentos_stock_bajo: number;
    total_recetas: number;
    detalle_salas: any[];
    detalle_doctores: any[];
    detalle_espera: any[];
    detalle_inventario: any[];
    detalle_recetas: any[];
  };
  datos_especificos: any;
  comparativa: MetricaComparativa[];
  insights_ia: InsightsIA;
};

export async function reporteEmpresarialDatos(
  token: string,
  tipo: string = "general",
  desde?: string,
  hasta?: string,
  umbral: number = 10
): Promise<ReporteEmpresarialDatos> {
  const r = await api.get<ReporteEmpresarialDatos>("/api/reportes/empresarial/datos", {
    ...auth(token),
    params: limpiar({ tipo, desde, hasta, umbral }),
  });
  return r.data;
}

export async function consultarIAReporte(
  token: string,
  pregunta: string,
  tipo: string = "general",
  desde?: string,
  hasta?: string
): Promise<{ respuesta: string }> {
  const r = await api.post<{ respuesta: string }>(
    "/api/reportes/empresarial/consultor-ia",
    limpiar({ pregunta, tipo, desde, hasta }),
    auth(token)
  );
  return r.data;
}

export async function descargarReporteEmpresarial(
  token: string,
  tipo: string,
  formato: "pdf" | "excel",
  params: { desde?: string; hasta?: string; umbral?: number } = {}
): Promise<void> {
  const res = await api.get(`/api/reportes/empresarial/${tipo}/exportar`, {
    ...auth(token),
    params: limpiar({ formato, ...params }),
    responseType: "blob",
  });
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("La descarga de reportes está disponible en la versión web.");
  }
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_empresarial_${tipo}.${formato === "pdf" ? "pdf" : "xlsx"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
