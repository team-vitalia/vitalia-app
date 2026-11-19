import api from "./api";

export interface CancelarSuscripcionPayload {
  motivo_categoria: string;
  comentarios_adicionales?: string;
  solicitar_reembolso: boolean;
}

export interface RespuestaCancelarSuscripcion {
  status: string;
  mensaje: string;
  clinica_id: number;
  plan_actual: string;
  aplica_reembolso: boolean;
  estado_reembolso: string;
  paypal_refund_id?: string | null;
  fecha_cancelacion: string;
}

export const cancelarSuscripcion = async (datos: CancelarSuscripcionPayload) =>
  (await api.post<RespuestaCancelarSuscripcion>("/api/suscripciones/cancelar", datos)).data;
