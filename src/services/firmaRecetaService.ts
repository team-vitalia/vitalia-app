import { Platform } from "react-native";

import api from "./api";

/* ============================================================
   Firma electrónica SIMULADA de recetas (uso académico).
   La llave privada vive solo en el backend; aquí nunca llega.
============================================================ */
export const LEYENDA_FIRMA_SIMULADA = "FIRMA ELECTRÓNICA SIMULADA - USO ACADÉMICO - SIN VALIDEZ JURÍDICA";

export interface FirmaReceta {
  firmada: true;
  id_PK: number;
  receta_id: number;
  identificador: string;
  codigo_verificacion: string;
  fecha_firma_utc: string;
  algoritmo: string;
  hash_pdf_sha256: string;
  url_verificacion: string;
  url_accesible_desde_otro_dispositivo: boolean;
  advertencia: string | null;
  medico: { nombre_ficticio: string; cedula_ficticia: string; especialidad_ficticia: string | null; huella_sha256: string };
  leyenda: string;
}

export interface EventoFirma {
  id_PK: number;
  accion: string;
  resultado: string | null;
  detalle: string | null;
  ip: string | null;
  creado_en: string;
}

/** Devuelve la firma de la receta, o null si aún no está firmada. */
export const getFirmaDeReceta = async (recetaId: number): Promise<FirmaReceta | null> => {
  const data = (await api.get(`/api/firma-recetas/recetas/${recetaId}`)).data;
  return data?.firmada ? (data as FirmaReceta) : null;
};

export const getMisFirmas = async (): Promise<FirmaReceta[]> => (await api.get("/api/firma-recetas/mias")).data;

/** Confirma y firma (el backend exige ambas confirmaciones explícitas). */
export const firmarReceta = async (recetaId: number): Promise<FirmaReceta> =>
  (await api.post(`/api/firma-recetas/recetas/${recetaId}/firmar`, { confirmar: true, acepto_simulacion: true })).data;

export const getHistorialFirma = async (codigo: string): Promise<EventoFirma[]> =>
  (await api.get(`/api/firma-recetas/${codigo}/historial`)).data;

/**
 * Descarga el PDF firmado (requiere sesión). Solo disponible en la versión web;
 * en móvil devuelve false para que la pantalla ofrezca abrir la verificación.
 */
export async function descargarPdfFirmado(codigo: string, recetaId: number): Promise<boolean> {
  const g = globalThis as any;
  if (Platform.OS !== "web" || !g.document || !g.URL?.createObjectURL) return false;
  const res = await api.get(`/api/firma-recetas/${codigo}/pdf`, { responseType: "blob" });
  const url = g.URL.createObjectURL(res.data);
  const a = g.document.createElement("a");
  a.href = url;
  a.download = `receta-${String(recetaId).padStart(6, "0")}-firma-simulada.pdf`;
  g.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => g.URL.revokeObjectURL(url), 15000);
  return true;
}

/** «2026-11-10T02:44:41Z» → «10/11/2026 02:44:41 UTC» */
export const fechaFirmaUtcTexto = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 19)} UTC`;
