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

interface NotificationsContextType {
  status: ConnectionStatus;
  messages: WSMessage[];
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
  const { usuario } = useAuth();
  const router = useRouter();

  const userId = usuario ? usuario.id ?? usuario.id_PK : null;
  const clientId = userId ? `user_${userId}` : "invitado";

  const handleToastRedirect = useCallback(() => {
    router.push("/notificaciones");
  }, [router]);

  const socketData = useNotificationsSocket(clientId, handleToastRedirect);

  const [extraMessages, setExtraMessages] = useState<WSMessage[]>([]);

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
