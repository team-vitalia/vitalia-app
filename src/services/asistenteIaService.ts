import api from "./api";

export interface DiagnosticoSugerido {
  diagnostico: string;
  codigo_cie10: string;
  probabilidad: "alta" | "media" | "baja";
  justificacion_clinica: string;
}

export interface MedicamentoSugerido {
  nombre_generico: string;
  presentacion_dosis: string;
  frecuencia: string;
  duracion_dias: string;
  justificacion: string;
  alerta_alergia: boolean;
  nivel_riesgo: "seguro" | "precaucion" | "alto_riesgo" | "contraindicado";
  detalle_alergia?: string | null;
}

export interface AsistenteIAResponse {
  diagnosticos_probables: DiagnosticoSugerido[];
  medicamentos_sugeridos: MedicamentoSugerido[];
  observaciones_farmacologicas?: string | null;
  disclaimer_legal: string;
}

export interface AsistenteIAPayload {
  sintomas: string;
  incluir_notas_previas?: boolean;
}

/**
 * Consulta el servicio de Asistente Clínico IA (Groq) para una cita determinada.
 * Requiere rol de Médico tratante asignado o Administrador.
 */
export async function consultarAsistenteIA(
  citaId: number,
  payload: AsistenteIAPayload
): Promise<AsistenteIAResponse> {
  const response = await api.post<AsistenteIAResponse>(
    `/api/citas/${citaId}/asistente-ia`,
    {
      sintomas: payload.sintomas,
      incluir_notas_previas: payload.incluir_notas_previas ?? true,
    }
  );
  return response.data;
}
