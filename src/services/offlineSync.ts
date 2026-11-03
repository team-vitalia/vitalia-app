import { Platform } from "react-native";
import api from "./api";
import { offlineStorage, SyncQueueItem } from "./offlineStorage";

type SyncListener = (syncing: boolean, pendingCount: number) => void;

class OfflineSyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private initialized = false;

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(syncing: boolean, count: number): void {
    this.listeners.forEach((listener) => {
      try {
        listener(syncing, count);
      } catch (e) {}
    });
  }

  public init(): void {
    if (this.initialized || Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    this.initialized = true;

    window.addEventListener("online", () => {
      this.syncAll();
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "TRIGGER_OFFLINE_SYNC") {
          this.syncAll();
        }
      });
    }

    if (navigator.onLine) {
      setTimeout(() => {
        this.syncAll();
      }, 3000);
    }
  }

  public async syncAll(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    if (Platform.OS === "web" && typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const pending = await offlineStorage.getPendingOperations();
    if (pending.length === 0) {
      this.notify(false, 0);
      return;
    }

    this.isSyncing = true;
    this.notify(true, pending.length);

    try {
      for (const op of pending) {
        if (!op.id) continue;

        try {
          await offlineStorage.updateOperationStatus(op.id, "syncing", op.retries);

          await api({
            url: op.url,
            method: op.method,
            data: op.data,
            headers: op.headers,
          });

          await offlineStorage.removeOperation(op.id);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && status >= 400 && status < 500) {
            await offlineStorage.removeOperation(op.id);
          } else {
            const nextRetries = op.retries + 1;
            if (nextRetries >= 5) {
              await offlineStorage.updateOperationStatus(op.id, "failed", nextRetries);
            } else {
              await offlineStorage.updateOperationStatus(op.id, "pending", nextRetries);
            }
            break;
          }
        }
      }
    } finally {
      this.isSyncing = false;
      const remaining = await offlineStorage.countPendingOperations();
      this.notify(false, remaining);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("vitalia-sync-completed", {
            detail: { remaining },
          })
        );
      }
    }
  }

  public async requestBackgroundSync(): Promise<void> {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "SyncManager" in window
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ("sync" in registration) {
          await (registration as any).sync.register("sync-vitalia-operations");
          return;
        }
      } catch (e) {}
    }
    this.syncAll();
  }
}

export const offlineSyncService = new OfflineSyncService();
