import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sombra } from "../../utils/sombra";

type Props = {
  /** Si se indica, el calendario se abre directamente en ese doctor; si no, en la vista general. */
  doctorId?: number | null;
  /** Versión más pequeña, para tarjetas. */
  compacto?: boolean;
};

/**
 * Acceso destacado al calendario de uso de salas (vive en «Salas y equipamiento» → «Asignar salas a doctores»).
 */
export default function BotonAsignarSalas({ doctorId = null, compacto = false }: Props) {
  const router = useRouter();

  const ir = () =>
    router.push({
      pathname: "/admin/salas",
      params: { vista: "calendario", modo: doctorId ? "doctor" : "general", ...(doctorId ? { doctor: String(doctorId) } : {}) },
    } as any);

  return (
    <Pressable
      onPress={ir}
      accessibilityRole="button"
      accessibilityLabel={doctorId ? "Asignar sala y horario a este doctor" : "Asignar salas a doctores"}
      style={({ pressed }) => [s.boton, compacto && s.botonCompacto, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient colors={["#0F766E", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.fondo, compacto && s.fondoCompacto]}>
        <View style={s.icono}>
          <Ionicons name="calendar" size={compacto ? 15 : 18} color="#FFFFFF" />
        </View>
        <Text style={[s.texto, compacto && s.textoCompacto]}>{doctorId ? "Asignar sala y horario" : "Asignar salas a doctores"}</Text>
        <Ionicons name="chevron-forward" size={compacto ? 15 : 18} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  boton: { alignSelf: "stretch", borderRadius: 12, overflow: "hidden", marginTop: 14, ...sombra({ color: "#1D4ED8", x: 0, y: 3, opacity: 0.28, radius: 8, elevation: 3 }) },
  botonCompacto: { alignSelf: "flex-start", marginTop: 12, borderRadius: 10 },
  fondo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 16 },
  fondoCompacto: { paddingVertical: 9, paddingHorizontal: 13, gap: 8 },
  icono: { alignItems: "center", justifyContent: "center" },
  texto: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  textoCompacto: { fontSize: 13 },
});
