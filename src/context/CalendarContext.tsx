import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType } from "expo-auth-session";

import api from "../services/api";
import { useAuth } from "./AuthContext";

WebBrowser.maybeCompleteAuthSession();

interface CalendarContextType {
  isCalendarConnected: boolean;
  cargando: boolean;
  ultimoEventoCreado: any;
  conectarGoogle: () => void;
  desconectarGoogle: () => void;
  verificarEstadoServidor: () => Promise<void>;
  crearEvento: (
    summary?: string,
    description?: string,
    startTime?: string,
    durationMinutes?: number
  ) => Promise<any>;
  eliminarEvento: (eventId: string) => Promise<boolean>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const idUsuario = usuario?.id ?? usuario?.id_PK;
  const userId = idUsuario ? `user_${idUsuario}` : "default_user";

  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);
  const [ultimoEventoCreado, setUltimoEventoCreado] = useState<any>(null);

  /*
  ===================================================================================
  CONFIGURACIÓN DE CREDENCIALES DE GOOGLE OAUTH 2.0
  ===================================================================================
  <TU_CLIENT_ID_AQUI>
  ===================================================================================
  */
  const cleanWebClientId = "393671162434-3e031lvkhq3107bfaa2to2hndsvu57tp.apps.googleusercontent.com".replace(/<|>/g, "").trim();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: cleanWebClientId,
    webClientId: cleanWebClientId,
    redirectUri: Platform.select({
      web: typeof window !== "undefined" ? window.location.origin : "http://localhost:8081",
      default: undefined,
    }),
    responseType: ResponseType.Code,
    shouldAutoExchangeCode: false,
    scopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    // Solicitar acceso offline con code para que Google proporcione un refresh_token al backend
    extraParams: {
      access_type: "offline",
      prompt: "consent select_account",
    },
  });

  // Consulta el servidor FastAPI para saber si el usuario tiene vinculación permanente activa
  const verificarEstadoServidor = useCallback(async () => {
    try {
      const res = await api.get(`/calendar/status?user_id=${userId}`);
      if (res.data?.is_connected) {
        setIsCalendarConnected(true);
      } else {
        setIsCalendarConnected(false);
      }
    } catch (err) {
      console.warn("No se pudo verificar el estado de Google Calendar en el servidor:", err);
    }
  }, [userId]);

  // Verificar estado del servidor al montar y cada vez que el usuario autenticado cambie
  useEffect(() => {
    verificarEstadoServidor();
  }, [verificarEstadoServidor]);

  // Prevenir que un mismo código se envíe más de una vez (los códigos OAuth de Google son de un solo uso)
  const ultimoCodigoProcesado = useRef<string | null>(null);

  // Sincronizar y persistir credenciales de forma permanente en el servidor
  const sincronizarConBackend = useCallback(
    async (token?: string | null, code?: string | null) => {
      if (code && ultimoCodigoProcesado.current === code) {
        return;
      }
      if (code) {
        ultimoCodigoProcesado.current = code;
      }

      setCargando(true);
      try {
        const redirectUri =
          request?.redirectUri ||
          (typeof window !== "undefined" ? window.location.origin : "http://localhost:8081");

        const res = await api.post("/calendar/auth/callback", {
          access_token: token || null,
          code: code || null,
          code_verifier: request?.codeVerifier || null,
          user_id: userId,
          redirect_uri: redirectUri,
        });

        // Actualizar estado confirmado por el backend
        if (res.data?.is_connected) {
          setIsCalendarConnected(true);
        }
      } catch (err: any) {
        const detalle = err?.response?.data?.detail || err?.message || err;
        console.error("Error al persistir credenciales en el servidor:", detalle);
        // Permitir reintentar con otro código si falló
        ultimoCodigoProcesado.current = null;
      } finally {
        setCargando(false);
      }
    },
    [userId, request]
  );

  // Escuchar cuando el usuario completa la autorización con Google OAuth
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication, params } = response;
      const token = authentication?.accessToken || params?.access_token;
      const code = params?.code;

      if (token || code) {
        sincronizarConBackend(token, code);
      }
    }
  }, [response, sincronizarConBackend]);

  const conectarGoogle = useCallback(() => {
    if (promptAsync) {
      promptAsync();
    }
  }, [promptAsync]);

  // Desvincular credenciales del servidor permanentemente
  const desconectarGoogle = useCallback(async () => {
    setCargando(true);
    try {
      await api.post("/calendar/auth/disconnect", { user_id: userId });
      setIsCalendarConnected(false);
      setUltimoEventoCreado(null);
    } catch (err) {
      console.error("Error al desvincular Google Calendar en el servidor:", err);
    } finally {
      setCargando(false);
    }
  }, [userId]);

  // Crear citas en Google Calendar directamente a través del servidor
  const crearEvento = useCallback(
    async (
      summary: string = "Cita Médica VITALIA - Prueba",
      description: string = "Cita médica agendada desde el sistema integral VITALIA.",
      startTime?: string,
      durationMinutes: number = 60
    ) => {
      setCargando(true);
      try {
        const respuesta = await api.post("/calendar/event/create", {
          user_id: userId,
          summary,
          description,
          start_time: startTime || undefined,
          duration_minutes: durationMinutes,
        });

        setUltimoEventoCreado(respuesta.data);
        return respuesta.data;
      } catch (error) {
        console.error("Error al crear evento en Google Calendar:", error);
        throw error;
      } finally {
        setCargando(false);
      }
    },
    [userId]
  );

  // Eliminar eventos de Google Calendar a través del servidor
  const eliminarEvento = useCallback(
    async (eventId: string) => {
      setCargando(true);
      try {
        await api.post("/calendar/event/delete", {
          user_id: userId,
          event_id: eventId,
        });

        if (ultimoEventoCreado?.event_id === eventId) {
          setUltimoEventoCreado(null);
        }
        return true;
      } catch (error) {
        console.error("Error al eliminar evento en Google Calendar:", error);
        throw error;
      } finally {
        setCargando(false);
      }
    },
    [userId, ultimoEventoCreado]
  );

  return (
    <CalendarContext.Provider
      value={{
        isCalendarConnected,
        cargando,
        ultimoEventoCreado,
        conectarGoogle,
        desconectarGoogle,
        verificarEstadoServidor,
        crearEvento,
        eliminarEvento,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useGoogleCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useGoogleCalendar debe utilizarse dentro de CalendarProvider");
  }
  return context;
}
