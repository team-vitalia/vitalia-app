import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { toast } from "gooey-toast";
import "gooey-toast/styles.css";
import { offlineSyncService } from "../services/offlineSync";

export function OfflineBanner() {
  const wasOffline = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const handleOffline = () => {
      wasOffline.current = true;
      toast.warning({
        title: "Modo sin conexión",
        description: "Trabajando en modo offline. Los datos y operaciones se guardarán localmente.",
        duration: 5000,
      });
    };

    const handleOnline = () => {
      offlineSyncService.syncAll();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = offlineSyncService.subscribe((syncing) => {
      if (!syncing && wasOffline.current) {
        wasOffline.current = false;
        toast.clear();
        toast.success({
          title: "Sincronización completada",
          description: "Todas las operaciones locales se han sincronizado correctamente.",
          duration: 4000,
        });
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  return null;
}
