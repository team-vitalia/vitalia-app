import { useCallback, useState } from "react";
import {
  AsistenteIAResponse,
  consultarAsistenteIA,
} from "../services/asistenteIaService";

export function useAsistenteIA() {
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AsistenteIAResponse | null>(null);

  const consultar = useCallback(
    async (
      citaId: number,
      sintomas: string,
      incluirNotasPrevias: boolean = true
    ): Promise<AsistenteIAResponse | null> => {
      if (!sintomas || sintomas.trim().length < 5) {
        setError("Por favor ingresa una descripción de síntomas de al menos 5 caracteres.");
        return null;
      }

      setCargando(true);
      setError(null);

      try {
        const data = await consultarAsistenteIA(citaId, {
          sintomas: sintomas.trim(),
          incluir_notas_previas: incluirNotasPrevias,
        });
        setResultado(data);
        return data;
      } catch (err: any) {
        console.error("Error al consultar Asistente IA:", err);
        const mensaje =
          err?.response?.data?.detail ||
          err?.message ||
          "No fue posible obtener la respuesta del Asistente Clínico IA. Verifica la conexión y permisos.";
        setError(mensaje);
        return null;
      } finally {
        setCargando(false);
      }
    },
    []
  );

  const limpiar = useCallback(() => {
    setResultado(null);
    setError(null);
    setCargando(false);
  }, []);

  return {
    cargando,
    error,
    resultado,
    consultar,
    limpiar,
  };
}
