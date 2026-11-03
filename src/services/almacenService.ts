import api from "./api";

export interface Medicamento {
  id_PK: number;
  nombre: string;
  principio_activo?: string;
  presentacion?: string;
  requiere_receta?: boolean;
  descripcion?: string;
  codigo_barras?: string;
  categoria?: string;
}
export type MedicamentoCreate = Omit<Medicamento, "id_PK">;

export interface LoteData {
  medicamento_id_FK: number;
  numero_lote?: string;
  stock_actual: number;
  ubicacion?: string;
  fecha_vencimiento?: string | null;
  precio_venta?: number | null;
  proveedor_id_FK?: number | null;
  fecha_recepcion?: string | null;
}

export const getMedicamentos = async (): Promise<Medicamento[]> => {
  try {
    const response = await api.get("/api/medicamentos/");
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.warn("Error al obtener medicamentos:", error);
    return [];
  }
};

export const registrarMedicamento = async (
  medicamento: MedicamentoCreate
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

  try {
    const response = await api.post("/api/medicamentos/", payload);
    return response.data;
  } catch (error: any) {
    console.warn("Error al registrar medicamento:", error?.response?.data || error);
    throw error;
  }
};

export const getInventario = async () => {
  try {
    const response = await api.get("/api/almacen/inventario");
    return Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.warn("Error al obtener inventario:", error);
    return [];
  }
};

export const registrarLoteInventario = async (loteData: LoteData) => {
  try {
    const payload = {
      medicamento_id_FK: Number(loteData.medicamento_id_FK),
      numero_lote: loteData.numero_lote?.trim() || null,
      stock_actual: Number(loteData.stock_actual) || 0,
      ubicacion: loteData.ubicacion?.trim() || null,
      fecha_vencimiento: loteData.fecha_vencimiento || null,
      precio_venta: loteData.precio_venta ? Number(loteData.precio_venta) : null,
      proveedor_id_FK: loteData.proveedor_id_FK ? Number(loteData.proveedor_id_FK) : null,
      fecha_recepcion: loteData.fecha_recepcion || null,
    };

    const response = await api.post("/api/almacen/inventario", payload);
    return response.data;
  } catch (error: any) {
    console.warn("Error al registrar lote en la API:", error?.response?.data || error);
    throw error;
  }
};

export const actualizarLoteInventario = async (
  id: number,
  loteData: LoteData
) => {
  const payload = {
    medicamento_id_FK: Number(loteData.medicamento_id_FK),
    numero_lote: loteData.numero_lote?.trim() || null,
    stock_actual: Number(loteData.stock_actual),
    ubicacion: loteData.ubicacion?.trim() || null,
    fecha_vencimiento: loteData.fecha_vencimiento || null,
    precio_venta: loteData.precio_venta ?? null,
    proveedor_id_FK: loteData.proveedor_id_FK ?? null,
    fecha_recepcion: loteData.fecha_recepcion || null,
  };

  try {
    const response = await api.put(`/api/almacen/inventario/${id}`, payload);
    return response.data;
  } catch (error: any) {
    console.warn("Error al actualizar lote en la API:", error?.response?.data || error);
    throw error;
  }
};

export const evaluarInteracciones = async (medicamentosIds: number[]) => {
  try {
    const response = await api.post("/api/almacen/evaluar-interacciones", {
      medicamentos_ids: medicamentosIds,
    });
    return response.data;
  } catch (error) {
    console.warn("Error al evaluar interacciones:", error);
    return { tiene_interaccion: false, detalles: [] };
  }
};
