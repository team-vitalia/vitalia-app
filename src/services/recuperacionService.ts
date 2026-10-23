import api from "./api";
import { authHeaders } from "./util";

const BASE = "/api/auth/recuperar";

export type TipoRecuperacion = "correo" | "qr";

export interface QRGenerado {
  payload: string;
  usuario: string;
  expira_en: string;
  segundos: number;
}

interface RespuestaCorreo {
  mensaje: string;
  espera_segundos: number;
}

interface RespuestaMensaje {
  mensaje: string;
}

function obtenerMensajeError(error: unknown): string {
  const e = error as {
    response?: {
      data?: { detail?: string | { msg?: string }[]; mensaje?: string };
    };
    message?: string;
  };
  const detalle = e.response?.data?.detail;
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle.map((item) => item.msg ?? "Dato inválido").join("\n");
  }
  return (
    e.response?.data?.mensaje ??
    e.message ??
    "No se pudo completar la solicitud. Comprueba tu conexión con el servidor."
  );
}

export { obtenerMensajeError };


export async function solicitarEnlaceCorreo(
  correo: string
): Promise<RespuestaCorreo> {
  const normalizado = correo.trim().toLowerCase();

  if (!normalizado) {
    throw new Error("Escribe tu correo electrónico.");
  }

  try {
    const respuesta = await api.post<RespuestaCorreo>(
      `${BASE}/correo/solicitar`,
      {
        correo_electronico: normalizado,
      }
    );

    console.log("Recuperación: respuesta de la API", {
      status: respuesta.status,
      data: respuesta.data,
    });

    return respuesta.data;
  } catch (error: any) {
    console.error("Error solicitando recuperación:", {
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
    });

    throw new Error(obtenerMensajeError(error));
  }
}


export async function confirmarEnlaceCorreo(
  usuarioId: number,
  token: string,
  nuevaPassword: string
): Promise<RespuestaMensaje> {
  validarNuevaPassword(nuevaPassword);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("El enlace no contiene un identificador válido.");
  }
  if (!token || token.length < 20) throw new Error("El enlace de recuperación no es válido.");
  try {
    const respuesta = await api.post<RespuestaMensaje>(`${BASE}/correo/confirmar`, {
      usuario_id: usuarioId,
      token,
      nueva_password: nuevaPassword,
    });
    return respuesta.data;
  } catch (error) {
    throw new Error(obtenerMensajeError(error));
  }
}

export async function generarQR(
  usuarioId: number,
  token?: string | null
): Promise<QRGenerado> {
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("El identificador del usuario no es válido.");
  }
  try {
    const respuesta = await api.post<QRGenerado>(
      `${BASE}/qr/generar/${usuarioId}`,
      {},
      authHeaders(token)
    );
    return respuesta.data;
  } catch (error) {
    throw new Error(obtenerMensajeError(error));
  }
}

export async function confirmarQR(
  usuarioId: number,
  tokenQR: string,
  nuevaPassword: string
): Promise<RespuestaMensaje> {
  validarNuevaPassword(nuevaPassword);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("El QR no contiene un identificador válido.");
  }
  if (!tokenQR || tokenQR.length < 20) throw new Error("El contenido del QR no es válido.");
  try {
    const respuesta = await api.post<RespuestaMensaje>(`${BASE}/qr/confirmar`, {
      usuario_id: usuarioId,
      token: tokenQR,
      nueva_password: nuevaPassword,
    });
    return respuesta.data;
  } catch (error) {
    throw new Error(obtenerMensajeError(error));
  }
}

function validarNuevaPassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("La contraseña debe tener entre 8 y 128 caracteres.");
  }
}

/** Acepta el nuevo QR con URL y el formato anterior durante la transición. */
export function interpretarQR(
  texto: string
): { usuarioId: number; token: string; tipo: TipoRecuperacion } | null {
  const valor = texto.trim();
  if (!valor) return null;
  try {
    if (/^https?:\/\//i.test(valor)) {
      const url = new URL(valor);
      const usuarioId = Number(url.searchParams.get("usuario_id"));
      const token = url.searchParams.get("token") ?? "";
      const tipo = url.searchParams.get("tipo") === "correo" ? "correo" : "qr";
      if (Number.isInteger(usuarioId) && usuarioId > 0 && token.length >= 20) {
        return { usuarioId, token, tipo };
      }
      return null;
    }
  } catch {
    return null;
  }
  const partes = valor.split(":");
  if (partes.length === 3 && partes[0] === "vitalia-reset") {
    const usuarioId = Number(partes[1]);
    const token = partes[2];
    if (Number.isInteger(usuarioId) && usuarioId > 0 && token.length >= 20) {
      return { usuarioId, token, tipo: "qr" };
    }
  }
  return null;
}
