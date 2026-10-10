import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { useNotificationsSocket, ConnectionStatus, WSMessage } from "../hooks/useNotificationsSocket";

interface NotificationsContextType {
  status: ConnectionStatus;
  messages: WSMessage[];
  sendPing: () => boolean;
  sendMessage: (payload: any) => boolean;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const router = useRouter();

  const clientId = usuario ? `user_${usuario.id}` : "invitado";

  const handleToastRedirect = useCallback(() => {
    router.push("/notificaciones");
  }, [router]);

  const socketData = useNotificationsSocket(
    clientId,
    handleToastRedirect
  );

  return (
    <NotificationsContext.Provider value={socketData}>
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
