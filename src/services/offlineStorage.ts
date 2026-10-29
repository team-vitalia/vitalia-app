import { Platform } from "react-native";

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH" | "GET";
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  status: "pending" | "syncing" | "failed";
  description?: string;
}

const DB_NAME = "vitalia_db";
const DB_VERSION = 1;
const STORE_STATE = "app_state";
const STORE_SYNC = "sync_queue";

class OfflineStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private isAvailable(): boolean {
    return Platform.OS === "web" && typeof window !== "undefined" && "indexedDB" in window;
  }

  public initDB(): Promise<IDBDatabase | null> {
    if (!this.isAvailable()) {
      return Promise.resolve(null);
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORE_STATE)) {
            db.createObjectStore(STORE_STATE, { keyPath: "key" });
          }

          if (!db.objectStoreNames.contains(STORE_SYNC)) {
            const syncStore = db.createObjectStore(STORE_SYNC, {
              keyPath: "id",
              autoIncrement: true,
            });
            syncStore.createIndex("status", "status", { unique: false });
            syncStore.createIndex("timestamp", "timestamp", { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async saveState(key: string, value: any): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_STATE, "readwrite");
        const store = tx.objectStore(STORE_STATE);
        const req = store.put({ key, value, updatedAt: Date.now() });

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async getState<T = any>(key: string): Promise<T | null> {
    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_STATE, "readonly");
        const store = tx.objectStore(STORE_STATE);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value as T);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  public async removeState(key: string): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_STATE, "readwrite");
        const store = tx.objectStore(STORE_STATE);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async enqueueOperation(operation: {
    url: string;
    method: "POST" | "PUT" | "DELETE" | "PATCH";
    data?: any;
    headers?: Record<string, string>;
    description?: string;
  }): Promise<number> {
    const db = await this.initDB();
    if (!db) return -1;

    const item: Omit<SyncQueueItem, "id"> = {
      url: operation.url,
      method: operation.method,
      data: operation.data,
      headers: operation.headers,
      description: operation.description,
      timestamp: Date.now(),
      retries: 0,
      status: "pending",
    };

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SYNC, "readwrite");
        const store = tx.objectStore(STORE_SYNC);
        const req = store.add(item);

        req.onsuccess = () => {
          resolve(req.result as number);
        };

        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async getPendingOperations(): Promise<SyncQueueItem[]> {
    const db = await this.initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SYNC, "readonly");
        const store = tx.objectStore(STORE_SYNC);
        const req = store.getAll();

        req.onsuccess = () => {
          const all = (req.result as SyncQueueItem[]) || [];
          const pending = all.filter((item) => item.status !== "failed");
          pending.sort((a, b) => a.timestamp - b.timestamp);
          resolve(pending);
        };

        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  public async removeOperation(id: number): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SYNC, "readwrite");
        const store = tx.objectStore(STORE_SYNC);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async updateOperationStatus(
    id: number,
    status: "pending" | "syncing" | "failed",
    retries: number
  ): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_SYNC, "readwrite");
        const store = tx.objectStore(STORE_SYNC);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          if (!getReq.result) {
            resolve();
            return;
          }
          const item = getReq.result as SyncQueueItem;
          item.status = status;
          item.retries = retries;
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };

        getReq.onerror = () => reject(getReq.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async countPendingOperations(): Promise<number> {
    const pending = await this.getPendingOperations();
    return pending.length;
  }
}

export const offlineStorage = new OfflineStorage();
