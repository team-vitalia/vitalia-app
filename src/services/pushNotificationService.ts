import { Platform } from "react-native";
import api from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private pushListeners: Set<(payload: any) => void> = new Set();
  private initialized = false;

  public isSupported(): boolean {
    return (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return "denied";
    }
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return "denied";
    }
    return await Notification.requestPermission();
  }

  public async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (e) {
      return null;
    }
  }

  public async subscribeUser(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }

    const perm = await this.requestPermission();
    if (perm !== "granted") {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        const options: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
        };

        if (vapidPublicKey) {
          options.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as any;
        }

        subscription = await reg.pushManager.subscribe(options);
      }

      const subData = subscription.toJSON();
      try {
        await api.post("/api/notificaciones/push-subscription", subData);
      } catch (err) {}

      return subscription;
    } catch (e) {
      return null;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        return await subscription.unsubscribe();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  public onPushReceived(callback: (payload: any) => void): () => void {
    this.pushListeners.add(callback);
    this.ensureListener();
    return () => {
      this.pushListeners.delete(callback);
    };
  }

  private ensureListener(): void {
    if (this.initialized || !this.isSupported()) {
      return;
    }
    this.initialized = true;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
        this.pushListeners.forEach((listener) => {
          try {
            listener(event.data.payload);
          } catch (e) {}
        });
      }
    });
  }
}

export const pushNotificationService = new PushNotificationService();
