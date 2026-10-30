import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { offlineStorage } from "./offlineStorage";

let API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;

if (!API_URL || API_URL.includes("vercel.app")) {
  API_URL = "https://vitalia-api-ve7c.onrender.com";
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("[API Service] baseURL configurada:", api.defaults.baseURL);

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
