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
  /** medicamento | insumo | equipo (insumos: guantes, jeringas, alcohol, gasas...) */
  tipo_articulo?: TipoArticulo;
  unidad_medida?: string | null;
  stock_minimo?: number;
  stock_actual?: number;
}
export type TipoArticulo = "medicamento" | "insumo" | "equipo";
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
    tipo_articulo: medicamento.tipo_articulo ?? "medicamento",
    unidad_medida: medicamento.unidad_medida?.trim() || null,
    stock_minimo: medicamento.stock_minimo ?? 0,
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

/* ============================================================
   Almacén: resumen, caducidades, movimientos y dispensación
   (estas funciones LANZAN el error para que la pantalla muestre el mensaje)
============================================================ */
export interface ResumenAlmacen {
  total_medicamentos: number;
  total_lotes: number;
  unidades_vigentes: number;
  lotes_vencidos: number;
  lotes_por_vencer: number;
  medicamentos_stock_bajo: number;
  recetas_pendientes: number;
  umbral_stock_bajo: number;
  dias_alerta_caducidad: number;
}

export interface Caducidad {
  inventario_id: number;
  medicamento_id: number;
  medicamento: string | null;
  numero_lote: string | null;
  stock_actual: number;
  ubicacion: string | null;
  fecha_vencimiento: string;
  dias_restantes: number;
  estado: "vencido" | "por_vencer";
  tipo_articulo?: TipoArticulo;
  unidad_medida?: string | null;
}

export interface DisponibilidadItem {
  item_receta_id: number;
  medicamento_id: number | null;
  medicamento: string | null;
  presentacion: string | null;
  cantidad_recetada: number;
  cantidad_dispensada: number;
  cantidad_pendiente: number;
  stock_disponible: number;
  estado: "disponible" | "parcial" | "no_disponible" | "dispensado";
}

export interface RecetaPendiente {
  id_PK: number;
  paciente: string | null;
  doctor: string | null;
  estado: string | null;
  creado_en: string;
  items: {
    id_PK: number;
    medicamento: string | null;
    dosis: string | null;
    frecuencia: string | null;
    duracion: string | null;
    cantidad: number | null;
    cantidad_dispensada: number;
  }[];
  disponibilidad: DisponibilidadItem[];
}

export interface DispensarResultado {
  receta_id: number;
  estado_receta: string | null;
  completa: boolean;
  dispensaciones: { item_receta_id: number; medicamento: string | null; numero_lote: string | null; cantidad: number }[];
  faltantes: { item_receta_id: number; medicamento: string | null; cantidad_pendiente: number }[];
}

export interface MovimientoInventario {
  id_PK: number;
  medicamento: string | null;
  numero_lote: string | null;
  tipo: string | null;
  cantidad: number | null;
  stock_anterior: number | null;
  stock_nuevo: number | null;
  id_referencia: number | null;
  creado_en: string | null;
}

export type TipoMovimiento = "entrada" | "salida" | "merma" | "ajuste";

export const getResumenAlmacen = async (): Promise<ResumenAlmacen> =>
  (await api.get("/api/almacen/resumen")).data;

export const getCaducidades = async (dias = 60, tipo?: TipoArticulo): Promise<Caducidad[]> =>
  (await api.get("/api/almacen/caducidades", { params: { dias, tipo } })).data;

export const getRecetasPendientes = async (): Promise<RecetaPendiente[]> =>
  (await api.get("/api/almacen/recetas-pendientes")).data;

/** Sin `items` dispensa todo lo pendiente que haya en existencia (puede quedar parcial). */
export const dispensarReceta = async (
  recetaId: number,
  items?: { item_receta_id: number; cantidad: number }[],
  notas?: string
): Promise<DispensarResultado> =>
  (await api.post("/api/almacen/dispensar", { receta_id: recetaId, items: items ?? null, notas: notas || null })).data;

export const getMovimientos = async (limite = 100): Promise<MovimientoInventario[]> =>
  (await api.get("/api/almacen/movimientos", { params: { limite } })).data;

export const registrarMovimientoLote = async (
  loteId: number,
  tipo: TipoMovimiento,
  cantidad: number,
  motivo?: string
) => (await api.post(`/api/almacen/inventario/${loteId}/movimientos`, { tipo, cantidad, motivo: motivo || null })).data;


/* ============================================================
   Consumo interno, gráficas y predicción de demanda
============================================================ */
export const registrarConsumo = async (p: { medicamentoId: number; cantidad: number; area?: string; motivo?: string }) =>
  (
    await api.post("/api/almacen/consumos", {
      medicamento_id: p.medicamentoId,
      cantidad: p.cantidad,
      area: p.area || null,
      motivo: p.motivo || null,
    })
  ).data as {
    medicamento: string | null;
    cantidad: number;
    lotes: { numero_lote: string | null; cantidad: number }[];
    stock_restante: number;
  };

export interface PanelAnalitico {
  consumo_mensual: { mes: string; medicamentos: number; insumos: number; merma: number }[];
  top_consumo_90d: { medicamento_id: number; nombre: string; tipo_articulo: TipoArticulo; unidades: number }[];
  stock_por_tipo: { tipo_articulo: TipoArticulo; unidades: number; valor: number }[];
  caducidad_unidades: { vencido: number; por_vencer_30: number; por_vencer_90: number; vigente: number; sin_fecha: number };
}

export type RiesgoStock = "agotado" | "critico" | "bajo" | "ok" | "sin_movimiento";

export interface ItemPrediccion {
  medicamento_id: number;
  nombre: string;
  presentacion: string | null;
  tipo_articulo: TipoArticulo;
  unidad_medida: string | null;
  stock_vigente: number;
  stock_minimo: number;
  consumo_ultimos_30d: number;
  pronostico_horizonte: number;
  cobertura_dias: number | null;
  unidades_por_vencer: number;
  excedente_por_vencer: number;
  sugerido_pedir: number;
  riesgo: RiesgoStock;
  confianza: "alta" | "media" | "baja" | "sin_datos";
  tendencia_pct: number | null;
  error_backtest_pct: number | null;
  serie_semanal: number[];
}

export interface Prediccion {
  generado: string;
  horizonte_dias: number;
  nota: string;
  resumen_riesgo: Record<RiesgoStock, number>;
  mas_demandados: { medicamento_id: number; nombre: string; tipo_articulo: TipoArticulo; pronostico_horizonte: number; unidad_medida: string | null }[];
  items: ItemPrediccion[];
}

export interface AnalisisIA {
  resumen: string;
  alertas: { articulo: string; nivel: string; detalle: string }[];
  recomendaciones: string[];
  observaciones: string;
  origen: "ia" | "reglas";
  modelo: string | null;
  aviso: string | null;
  articulos_analizados: number;
  nota: string;
}

export const getPanelAnalitico = async (meses = 6): Promise<PanelAnalitico> =>
  (await api.get("/api/almacen/analitica/panel", { params: { meses } })).data;

export const getPrediccion = async (horizonteDias = 30, tipo?: TipoArticulo): Promise<Prediccion> =>
  (await api.get("/api/almacen/analitica/prediccion", { params: { horizonte_dias: horizonteDias, tipo } })).data;

export const getAnalisisIA = async (horizonteDias = 30, tipo?: TipoArticulo): Promise<AnalisisIA> =>
  (await api.post("/api/almacen/analitica/analisis-ia", { horizonte_dias: horizonteDias, tipo: tipo ?? null })).data;
