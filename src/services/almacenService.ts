import api from "./api";

export interface Medicamento {
  id_PK: number;
  nombre: string;
  principio_activo?: string | null;
  presentacion?: string | null;
  requiere_receta?: boolean | null;
  descripcion?: string | null;
  codigo_barras?: string | null;
  categoria?: string | null;
  clinica_id_FK?: number | null;
}

export type MedicamentoCreate = Omit<Medicamento, "id_PK" | "clinica_id_FK">;

export interface LoteInventario {
  id_PK: number;
  medicamento_id_FK: number;
  numero_lote: string | null;
  stock_actual: number;
  ubicacion: string | null;
  fecha_vencimiento: string | null;
  fecha_recepcion: string | null;
  precio_venta: number | null;
  proveedor_id_FK: number | null;
  esta_activo: boolean;
  clinica_id_FK: number | null;
  medicamento?: Medicamento;
}

export type LoteData = Omit<LoteInventario, "id_PK" | "esta_activo" | "clinica_id_FK" | "medicamento">;
export type TipoMovimiento = "entrada" | "salida" | "dispensacion";

export interface MovimientoInventario {
  id_PK: number;
  inventario_id_FK: number;
  cantidad: number;
  tipo: string;
  motivo: string | null;
  usuario_id_FK: number | null;
  usuario_nombre: string | null;
  creado_en: string | null;
  stock_anterior: number | null;
  stock_nuevo: number | null;
  clinica_id_FK: number | null;
  medicamento_nombre: string | null;
  numero_lote: string | null;
}

const clinicHeaders = (clinicaId?: number) =>
  clinicaId ? { headers: { "X-Clinic-Id": String(clinicaId) } } : undefined;

export const getMedicamentos = async (clinicaId?: number): Promise<Medicamento[]> => {
  const response = await api.get<Medicamento[]>("/api/medicamentos/", clinicHeaders(clinicaId));
  return response.data;
};

export const getMedicamentosAlmacen = async (
  clinicaId?: number,
): Promise<Medicamento[]> => {
  const response = await api.get<Medicamento[]>(
    "/api/almacen/medicamentos",
    clinicHeaders(clinicaId),
  );
  return response.data;
};

export const registrarMedicamento = async (
  medicamento: MedicamentoCreate,
): Promise<Medicamento> => {
  const payload = {
    nombre: medicamento.nombre.trim(),
    principio_activo: medicamento.principio_activo?.trim() || null,
    presentacion: medicamento.presentacion?.trim() || null,
    requiere_receta: medicamento.requiere_receta ?? false,
    descripcion: medicamento.descripcion?.trim() || null,
    codigo_barras: medicamento.codigo_barras?.trim() || null,
    categoria: medicamento.categoria?.trim() || null,
  };
  const response = await api.post<Medicamento>("/api/medicamentos/", payload);
  return response.data;
};

export const eliminarMedicamento = async (id: number): Promise<void> => {
  await api.delete(`/api/medicamentos/${id}`);
};

export const getInventario = async (clinicaId?: number): Promise<LoteInventario[]> => {
  const response = await api.get<LoteInventario[]>("/api/almacen/inventario", clinicHeaders(clinicaId));
  return response.data;
};

export const registrarLoteInventario = async (
  loteData: LoteData,
): Promise<LoteInventario> => {
  const payload = {
    ...loteData,
    medicamento_id_FK: Number(loteData.medicamento_id_FK),
    numero_lote: loteData.numero_lote?.trim() || null,
    stock_actual: Number(loteData.stock_actual),
    ubicacion: loteData.ubicacion?.trim() || null,
    precio_venta: loteData.precio_venta === null ? null : Number(loteData.precio_venta),
    proveedor_id_FK: loteData.proveedor_id_FK ? Number(loteData.proveedor_id_FK) : null,
  };
  const response = await api.post<LoteInventario>("/api/almacen/inventario", payload);
  return response.data;
};

export const actualizarLoteInventario = async (
  id: number,
  loteData: LoteData,
): Promise<LoteInventario> => {
  const response = await api.put<LoteInventario>(`/api/almacen/inventario/${id}`, {
    ...loteData,
    medicamento_id_FK: Number(loteData.medicamento_id_FK),
    stock_actual: Number(loteData.stock_actual),
  });
  return response.data;
};

export const eliminarLoteInventario = async (id: number): Promise<void> => {
  await api.delete(`/api/almacen/inventario/${id}`);
};

export const getMovimientosInventario = async (clinicaId?: number): Promise<MovimientoInventario[]> => {
  const response = await api.get<MovimientoInventario[]>(
    "/api/almacen/movimientos",
    clinicHeaders(clinicaId),
  );
  return response.data;
};

export const registrarMovimientoInventario = async (
  movimiento: {
    inventario_id_FK: number;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo?: string;
  },
): Promise<MovimientoInventario> => {
  const response = await api.post<MovimientoInventario>(
    "/api/almacen/movimientos",
    movimiento,
  );
  return response.data;
};

export const evaluarInteracciones = async (medicamentosIds: number[]) => {
  const response = await api.post("/api/almacen/evaluar-interacciones", {
    medicamentos_ids: medicamentosIds,
  });
  return response.data;
};
