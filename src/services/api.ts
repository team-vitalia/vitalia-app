
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";

const API_URL = "http://127.0.0.1:8000";//CAMBIAR 127.0.0.1:8000 POR LA IP DE TU PC SI ESTÁS USANDO EMULADOR ANDROID, O POR http://localhost:8000 SI ESTÁS USANDO IOS O WEB

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  let token: string | null = null;

  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      token = localStorage.getItem("vitalia_token");
    }
  } else {
    token = await AsyncStorage.getItem("vitalia_token");
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
