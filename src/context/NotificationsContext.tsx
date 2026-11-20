import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import {
  useNotificationsSocket,
  ConnectionStatus,
  WSMessage,
} from "../hooks/useNotificationsSocket";
import { pushNotificationService } from "../services/pushNotificationService";
import { offlineSyncService } from "../services/offlineSync";
import api from "../services/api";

interface NotificationsContextType {
  status: ConnectionStatus;
  messages: WSMessage[];
  unreadCount: number;
  refetchUnreadCount: () => Promise<void>;
  sendPing: () => boolean;
  sendMessage: (payload: any) => boolean;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  pushSupported: boolean;
  requestPushPermission: () => Promise<NotificationPermission>;
  subscribeToPush: (vapidKey?: string) => Promise<PushSubscription | null>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { usuario, token, recargarSesion } = useAuth();
  const router = useRouter();

  const userId = usuario ? usuario.id ?? usuario.id_PK : null;
  const clientId = userId ? `user_${userId}` : "invitado";

  const handleToastRedirect = useCallback(() => {
    router.push("/notificaciones");
  }, [router]);

  const socketData = useNotificationsSocket(clientId, handleToastRedirect);

  const [extraMessages, setExtraMessages] = useState<WSMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refetchUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get<{ no_leidas: number }>("/api/notificaciones/conteo-no-leidas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (typeof res.data?.no_leidas === "number") {
        setUnreadCount(res.data.no_leidas);
        return;
      }
    } catch {}

    try {
      const fallbackRes = await api.get<any[]>("/api/notificaciones/?estado=no_leido", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(fallbackRes.data)) {
        setUnreadCount(fallbackRes.data.length);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    void refetchUnreadCount();
  }, [refetchUnreadCount, token, usuario]);

  useEffect(() => {
    if (socketData.messages.length > 0 || extraMessages.length > 0) {
      void refetchUnreadCount();
    }
  }, [socketData.messages.length, extraMessages.length, refetchUnreadCount]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      void refetchUnreadCount();
    }, 20000);
    return () => clearInterval(interval);
  }, [token, refetchUnreadCount]);

  useEffect(() => {
    offlineSyncService.init();
  }, []);

  useEffect(() => {
    const unsubscribe = pushNotificationService.onPushReceived((payload) => {
      const pushMsg: WSMessage = {
        id: `push-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        data: payload,
        timestamp: new Date().toLocaleTimeString(),
      };
      setExtraMessages((prev) => [pushMsg, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!socketData.messages.length) return;
    const ultimo = socketData.messages[0];
    const data = ultimo?.data;
    if (!data) return;

    if (
      data.type === "plan_actualizado" ||
      data.type === "suscripcion_actualizada" ||
      data.event === "suscripcion_actualizada"
    ) {
      const clinicaIdUsuario = usuario?.clinica?.id || (usuario as any)?.clinica_id_FK;
      if (!clinicaIdUsuario || !data.clinica_id || Number(data.clinica_id) === Number(clinicaIdUsuario)) {
        void recargarSesion();
      }
    }
  }, [socketData.messages, recargarSesion, usuario]);

  const combinedMessages = [...extraMessages, ...socketData.messages];

  const pushSupported = pushNotificationService.isSupported();

  const requestPushPermission = useCallback(async () => {
    return await pushNotificationService.requestPermission();
  }, []);

  const subscribeToPush = useCallback(async (vapidKey?: string) => {
    return await pushNotificationService.subscribeUser(vapidKey);
  }, []);

  const value: NotificationsContextType = {
    ...socketData,
    messages: combinedMessages,
    unreadCount,
    refetchUnreadCount,
    clearMessages: () => {
      setExtraMessages([]);
      socketData.clearMessages();
    },
    pushSupported,
    requestPushPermission,
    subscribeToPush,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications debe ser usado dentro de NotificationsProvider");
  }
  return context;
}
