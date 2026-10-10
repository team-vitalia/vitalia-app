import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { toast } from "gooey-toast";
import "gooey-toast/styles.css";

export interface WSMessage {
  id: string;
  data: any;
  timestamp: string;
}

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

const getBaseWsUrl = (): string => {
  if (Platform.OS === "android") {
    return "ws://10.0.2.2:8000";
  }
  return "ws://127.0.0.1:8000";
};

export function useNotificationsSocket(
  clientId: string = "doctor_1",
  onNotificationClick?: () => void,
  serverUrl: string = getBaseWsUrl()
) {
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const [messages, setMessages] = useState<WSMessage[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const reconnectAttemptsRef = useRef<number>(0);
  const onNotificationClickRef = useRef(onNotificationClick);
  const recentHashesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    onNotificationClickRef.current = onNotificationClick;
  }, [onNotificationClick]);

  const triggerToastNotification = useCallback((parsedData: any) => {
    if (Platform.OS === "web") {
      try {
        const titleText =
          typeof parsedData === "object" && parsedData.title
            ? parsedData.title
            : typeof parsedData === "object" && parsedData.type
            ? `Notificación: ${parsedData.type}`
            : "Nueva Notificación";

        const descText =
          typeof parsedData === "object" && parsedData.body
            ? parsedData.body
            : typeof parsedData === "object" && parsedData.message
            ? parsedData.message
            : typeof parsedData === "object"
            ? JSON.stringify(parsedData)
            : String(parsedData);

        toast.info({
          title: titleText,
          description: descText,
          duration: 5000,
        });

        if (typeof document !== "undefined") {
          setTimeout(() => {
            const toastElements = document.querySelectorAll("[data-gooey-toast]");
            toastElements.forEach((el) => {
              if (!el.hasAttribute("data-click-handler")) {
                el.setAttribute("data-click-handler", "true");
                (el as HTMLElement).style.cursor = "pointer";
                el.addEventListener("click", () => {
                  if (onNotificationClickRef.current) {
                    onNotificationClickRef.current();
                  }
                });
              }
            });
          }, 100);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      const ws = socketRef.current;
      socketRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000, "Desconexión iniciada por el cliente");
      } catch (e) {
        console.error(e);
      }
    }
    setStatus("DISCONNECTED");
  }, []);

  const connect = useCallback(() => {
    if (!clientId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    disconnect();

    const fullUrl = `${serverUrl}/ws/notifications/${clientId}`;
    setStatus(reconnectAttemptsRef.current > 0 ? "RECONNECTING" : "CONNECTING");

    try {
      const ws = new WebSocket(fullUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current || socketRef.current !== ws) return;
        setStatus("CONNECTED");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current || socketRef.current !== ws) return;

        const rawData = event.data;
        const hash = typeof rawData === "string" ? rawData : JSON.stringify(rawData);

        if (recentHashesRef.current.has(hash)) {
          return;
        }

        recentHashesRef.current.add(hash);
        setTimeout(() => {
          recentHashesRef.current.delete(hash);
        }, 3000);

        let parsedData: any;
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          parsedData = rawData;
        }

        const newMessage: WSMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          data: parsedData,
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [newMessage, ...prev]);
        triggerToastNotification(parsedData);
      };

      ws.onerror = (error) => {
        if (socketRef.current !== ws) return;
        console.warn(error);
      };

      ws.onclose = () => {
        if (!isMountedRef.current || socketRef.current !== ws) return;
        setStatus("DISCONNECTED");
        socketRef.current = null;
        scheduleReconnect();
      };
    } catch (error) {
      console.error(error);
      setStatus("DISCONNECTED");
      scheduleReconnect();
    }
  }, [clientId, serverUrl, disconnect, triggerToastNotification]);

  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, Math.min(reconnectAttemptsRef.current, 3)), 10000);
    setStatus("RECONNECTING");

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  const sendMessage = useCallback((payload: any): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageStr = typeof payload === "string" ? payload : JSON.stringify(payload);
      socketRef.current.send(messageStr);
      return true;
    }
    return false;
  }, []);

  const sendPing = useCallback((): boolean => {
    return sendMessage({
      type: "ping",
      client_id: clientId,
      timestamp: new Date().toISOString(),
    });
  }, [sendMessage, clientId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [clientId, serverUrl]);

  return {
    status,
    messages,
    sendMessage,
    sendPing,
    connect,
    disconnect,
    clearMessages,
  };
}
