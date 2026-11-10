import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  getInventario,
  getMovimientosInventario,
  type LoteInventario,
  type MovimientoInventario,
} from "../services/almacenService";

const fechaHoy = new Date();
const dentroDeTreintaDias = new Date(fechaHoy);
dentroDeTreintaDias.setDate(fechaHoy.getDate() + 30);

function esCaducidadProxima(fecha: string | null): boolean {
  if (!fecha) return false;
  const vencimiento = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  return vencimiento <= dentroDeTreintaDias;
}

export default function AlmacenDashboardScreen() {
  const router = useRouter();
  const { usuario, clinica } = useAuth();
  const [lotes, setLotes] = useState<LoteInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const cargar = async () => {
        setCargando(true);
        setError("");
        try {
          const [datosLotes, datosMovimientos] = await Promise.all([
            getInventario(clinica?.id),
            getMovimientosInventario(clinica?.id),
          ]);
          if (!activo) return;
          const clinicaId = clinica?.id;
          const lotesClinica = clinicaId
            ? datosLotes.filter((lote) => Number(lote.clinica_id_FK) === Number(clinicaId))
            : datosLotes;
          setLotes(lotesClinica);
          const movimientosClinica = clinicaId
            ? datosMovimientos.filter(
                (movimiento) => Number(movimiento.clinica_id_FK) === Number(clinicaId),
              )
            : datosMovimientos;
          setMovimientos(movimientosClinica.slice(0, 4));
        } catch (error: any) {
          if (activo) {
            setError(
              error?.response?.data?.detail || "No se pudo cargar el resumen del almacén.",
            );
          }
        } finally {
          if (activo) setCargando(false);
        }
      };
      void cargar();
      return () => {
        activo = false;
      };
    }, [clinica]),
  );

  const stockBajo = lotes.filter((lote) => lote.stock_actual <= 10).length;
  const caducidadProxima = lotes.filter((lote) =>
    esCaducidadProxima(lote.fecha_vencimiento),
  ).length;
  const abrirInventario = (tab?: "lotes" | "movimientos") =>
    router.push({
      pathname: "/admin/inventario",
      params: tab ? { tab } : undefined,
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="cube-outline" size={24} color="#0F766E" />
        </View>
        <Text style={styles.kicker}>PANEL DE TRABAJO</Text>
        <Text style={styles.title}>Almacén y farmacia</Text>
        <Text style={styles.subtitle}>
          Hola, {usuario?.nombre || "equipo de almacén"}. Controla existencias y
          movimientos de {clinica?.nombre_comercial || "tu clínica"}.
        </Text>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#0F766E" style={styles.loading} />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{lotes.length}</Text>
              <Text style={styles.statLabel}>Lotes activos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.warningText]}>{stockBajo}</Text>
              <Text style={styles.statLabel}>Stock bajo</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, styles.dangerText]}>{caducidadProxima}</Text>
              <Text style={styles.statLabel}>Vencen en 30 días</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.primaryAction}
            onPress={() => abrirInventario("lotes")}
          >
            <Ionicons name="layers-outline" size={21} color="#FFFFFF" />
            <View style={styles.actionCopy}>
              <Text style={styles.primaryActionTitle}>Abrir control de inventario</Text>
              <Text style={styles.primaryActionSubtitle}>Lotes, caducidades y dispensación</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={styles.secondaryAction}
            onPress={() => abrirInventario("movimientos")}
          >
            <Ionicons name="swap-vertical-outline" size={20} color="#0F766E" />
            <Text style={styles.secondaryActionText}>Registrar entrada, salida o dispensación</Text>
          </Pressable>

          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Movimientos recientes</Text>
            <Pressable onPress={() => abrirInventario("movimientos")}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </Pressable>
          </View>
          {movimientos.length ? (
            movimientos.map((movimiento) => (
              <View key={movimiento.id_PK} style={styles.movementRow}>
                <View style={styles.movementIcon}>
                  <Ionicons
                    name={movimiento.tipo.toLowerCase().includes("entrada") ? "arrow-down" : "arrow-up"}
                    size={17}
                    color="#0F766E"
                  />
                </View>
                <View style={styles.movementCopy}>
                  <Text style={styles.movementTitle}>
                    {movimiento.tipo} · {movimiento.medicamento_nombre || "Medicamento"}
                  </Text>
                  <Text style={styles.movementMeta}>
                    Lote {movimiento.numero_lote || "sin número"} · {movimiento.cantidad} unidades
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Aún no hay movimientos registrados.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 20, paddingBottom: 36, width: "100%", maxWidth: 900, alignSelf: "center" },
  header: { paddingTop: 16, paddingBottom: 20 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#DDF3EE", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  kicker: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800", color: "#0F766E" },
  title: { fontSize: 28, fontWeight: "800", color: "#173F3A", marginTop: 5 },
  subtitle: { fontSize: 14, lineHeight: 21, color: "#60736F", marginTop: 7 },
  loading: { marginTop: 30 },
  error: { color: "#B42318", marginBottom: 12 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: 96, backgroundColor: "#FFFFFF", borderColor: "#E4EEEB", borderWidth: 1, borderRadius: 16, padding: 14 },
  statNumber: { fontSize: 25, fontWeight: "800", color: "#173F3A" },
  statLabel: { fontSize: 11, color: "#657773", marginTop: 5 },
  warningText: { color: "#B7791F" },
  dangerText: { color: "#B42318" },
  primaryAction: { minHeight: 78, flexDirection: "row", alignItems: "center", backgroundColor: "#0F766E", padding: 16, borderRadius: 16, gap: 12 },
  actionCopy: { flex: 1 },
  primaryActionTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  primaryActionSubtitle: { fontSize: 12, color: "#D5F5EF", marginTop: 4 },
  secondaryAction: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#B9D7D1", borderRadius: 14, marginTop: 10, paddingHorizontal: 12 },
  secondaryActionText: { color: "#0F766E", fontWeight: "700", fontSize: 13 },
  activityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 10 },
  activityTitle: { fontSize: 17, fontWeight: "800", color: "#173F3A" },
  seeAll: { fontSize: 12, fontWeight: "700", color: "#0F766E" },
  movementRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E4EEEB" },
  movementIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#E7F5F1", alignItems: "center", justifyContent: "center", marginRight: 10 },
  movementCopy: { flex: 1 },
  movementTitle: { color: "#173F3A", fontSize: 13, fontWeight: "700" },
  movementMeta: { color: "#82938F", fontSize: 11, marginTop: 3 },
  empty: { color: "#82938F", fontSize: 13, paddingVertical: 8 },
});
