import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

const RUTAS_INICIO: Record<number, string> = {
  1: "/admin",
  2: "/doctor",
  3: "/paciente",
  4: "/recepcion",
  5: "/coordinador",
  6: "/almacen",
};

export default function OAuthRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { usuario, cargando } = useAuth();
  const { theme } = useAppTheme();
  const [haIniciadoCarga, setHaIniciadoCarga] = useState(false);

  useEffect(() => {
    if (params.error) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/login");
      }
    }
  }, [params.error, router]);

  useEffect(() => {
    if (usuario) {
      const rolId = usuario.rol_id ?? usuario.rol_id_FK;
      const ruta = rolId && RUTAS_INICIO[rolId] ? RUTAS_INICIO[rolId] : "/login";
      router.replace(ruta as any);
    }
  }, [usuario, router]);

  useEffect(() => {
    if (cargando) {
      setHaIniciadoCarga(true);
    }
  }, [cargando]);

  useEffect(() => {
    if (haIniciadoCarga && !cargando && !usuario) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/login");
      }
    }
  }, [haIniciadoCarga, cargando, usuario, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!usuario) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/login");
        }
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [usuario, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme?.bg || "#F8FAFC" }]}>
      <ActivityIndicator size="large" color={theme?.primary || "#0F4C45"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
