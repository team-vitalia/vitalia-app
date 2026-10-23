/** Utilidades comunes de los servicios. */

export const authHeaders = (token?: string | null) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/** Convierte cualquier error de axios/FastAPI en un mensaje legible. */
export function mensajeError(error: any, porDefecto: string): string {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === "string") return detalle;

  // Errores de validación de Pydantic: [{ loc, msg }]
  if (Array.isArray(detalle) && detalle.length > 0) {
    const campo = detalle[0]?.loc?.slice(-1)?.[0];
    return campo
      ? `Revisa el campo "${campo}": ${detalle[0]?.msg ?? "valor no válido"}`
      : detalle[0]?.msg ?? porDefecto;
  }

  if (error?.code === "ERR_NETWORK") {
    return "No hay conexión con el servidor. Verifica tu red e inténtalo de nuevo.";
  }

  return porDefecto;
}
