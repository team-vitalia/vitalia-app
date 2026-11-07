import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { offlineStorage } from "./offlineStorage";

export function getLocalApiUrl(port: number = 8000): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:${port}`;
      }
    }
    return `http://localhost:${port}`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp) {
      return `http://${hostIp}:${port}`;
    }
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
}

/**
 * Determina la URL base del backend estrictamente desde variables de entorno.
 * Si no está definida y estamos en desarrollo (__DEV__), resuelve dinámicamente la IP local.
 */
export function resolveApiBaseUrl(): string {
  const forceLocal =
    process.env.EXPO_PUBLIC_USE_LOCAL === "true" ||
    process.env.EXPO_PUBLIC_ENV === "local";

  if (forceLocal) {
    return getLocalApiUrl();
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;

  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Si no se proporcionó variable de entorno y estamos en desarrollo, conectar a local
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const localUrl = getLocalApiUrl();
    console.info(`[API Service] EXPO_PUBLIC_API_URL no definida. Usando host local de desarrollo: ${localUrl}`);
    return localUrl;
  }

  console.error(
    "[API Service] ERROR: La variable de entorno EXPO_PUBLIC_API_URL no está configurada para este entorno."
  );
  return "";
}

export function getWsBaseUrl(apiUrl: string = resolveApiBaseUrl()): string {
  const clean = apiUrl.replace(/\/+$/, "");
  if (clean.startsWith("https://")) {
    return clean.replace(/^https:\/\//, "wss://");
  }
  if (clean.startsWith("http://")) {
    return clean.replace(/^http:\/\//, "ws://");
  }
  return clean ? `ws://${clean.replace(/^\/+/, "")}` : "";
}

export function resolveLandingUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_LANDING_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://landing-ten-sigma-42.vercel.app";
    }
  }
  return "http://localhost:3000";
}

export const API_URL = resolveApiBaseUrl();
export const WS_URL = getWsBaseUrl(API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log(`[API Service] baseURL: "${api.defaults.baseURL}" | wsURL: "${WS_URL}"`);

api.interceptors.request.use(async (config) => {
  let token: string | null = null;

  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      token = localStorage.getItem("vitalia_token");
    }
  } else {
    token = await AsyncStorage.getItem("vitalia_token");
  }

  if (
    token &&
    !config.headers.Authorization &&
    !config.url?.includes("/api/auth/login")
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (
      Platform.OS === "web" &&
      response.config.method?.toUpperCase() === "GET" &&
      response.config.url &&
      response.status === 200
    ) {
      const normalizedUrl = response.config.url.replace(/^(?:https?:\/\/[^\/]+)?/, "");
      offlineStorage.saveState("api_cache_" + normalizedUrl, response.data).catch(() => {});
      if (normalizedUrl !== response.config.url) {
        offlineStorage.saveState("api_cache_" + response.config.url, response.data).catch(() => {});
      }
    }
    return response;
  },
  async (error) => {
    const isNetworkError = !error.response || error.code === "ERR_NETWORK";
    const isOffline =
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      (!navigator.onLine || isNetworkError);

    if (isOffline && error.config) {
      const method = (error.config.method || "GET").toUpperCase();
      const url = error.config.url;

      if (method === "GET" && url) {
        const normalizedUrl = url.replace(/^(?:https?:\/\/[^\/]+)?/, "");
        let cached = await offlineStorage.getState("api_cache_" + normalizedUrl);
        if (cached === null) {
          cached = await offlineStorage.getState("api_cache_" + url);
        }
        if (cached !== null && cached !== undefined) {
          return {
            data: cached,
            status: 200,
            statusText: "OK (Offline Cache)",
            headers: {},
            config: error.config,
          };
        }

        if (url.includes("/api/auth/me")) {
          let userStored: any = null;
          if (Platform.OS === "web" && typeof localStorage !== "undefined") {
            const raw = localStorage.getItem("vitalia_usuario");
            if (raw) {
              try {
                userStored = JSON.parse(raw);
              } catch (e) {}
            }
          }
          if (userStored) {
            return {
              data: userStored,
              status: 200,
              statusText: "OK (Offline Auth)",
              headers: {},
              config: error.config,
            };
          }
        }

        return {
          data: [],
          status: 200,
          statusText: "OK (Offline Fallback)",
          headers: {},
          config: error.config,
        };
      } else if (
        (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") &&
        url
      ) {
        if (url.includes("/api/auth/")) {
          return Promise.reject(error);
        }

        let requestData = error.config.data;
        if (typeof requestData === "string") {
          try {
            requestData = JSON.parse(requestData);
          } catch (e) {}
        }

        await offlineStorage.enqueueOperation({
          url,
          method: method as any,
          data: requestData,
          headers: error.config.headers as any,
          description: `${method} ${url}`,
        });

        import("./offlineSync")
          .then(({ offlineSyncService }) => {
            offlineSyncService.requestBackgroundSync().catch(() => {});
          })
          .catch(() => {});

        return {
          data: { offline: true, queued: true },
          status: 202,
          statusText: "Accepted (Offline Queued)",
          headers: {},
          config: error.config,
        };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
