import { useTheme, type Theme } from "../../../theme/theme";
import { useMemo,  useEffect, useState  } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import {
    Cola,
    listarAtendidas,
} from "../../../services/colasService";

export default function AtendidasScreen() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { token } = useAuth();

  const [colas, setColas] = useState<Cola[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarAtendidas = async () => {
    if (!token) return;

    try {
      setCargando(true);
      setError("");

      const data = await listarAtendidas(token);
      setColas(data);
    } catch (err: any) {
      console.log(
        "ERROR ATENDIDAS:",
        err?.response?.status,
        err?.response?.data
      );

      setError(
        err?.response?.data?.detail ||
          "No se pudieron cargar las citas atendidas."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarAtendidas();
    }
  }, [token]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ENCABEZADO */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push("/recepcion/cola")}
        >
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.refreshButton}
            onPress={cargarAtendidas}
          >
            <Text style={styles.refreshText}>↻</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.smallTitle}>RECEPCIÓN</Text>
      <Text style={styles.title}>Citas atendidas</Text>
      <Text style={styles.subtitle}>
        Historial de Citas atendidas hoy.
      </Text>

      {/* RESUMEN */}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{colas.length}</Text>
        <Text style={styles.summaryText}>Pacientes atendidos</Text>
      </View>

      {/* CONTENIDO */}

      <Text style={styles.sectionTitle}>Historial</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarAtendidas}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : colas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>Sin pendientes</Text>
          <Text style={styles.emptyTitle}>
            Aún no hay citas atendidas
          </Text>
          <Text style={styles.emptyText}>
            Cuando finalices una atención, aparecerá aquí.
          </Text>
        </View>
      ) : (
        colas.map((cola) => (
          <View key={cola.id_PK} style={styles.colaCard}>
            <View style={styles.colaHeader}>
              <View style={styles.turnoBox}>
                <Text style={styles.turnoLabel}>TURNO</Text>
                <Text style={styles.turnoNumero}>
                  {cola.numero_cola || "—"}
                </Text>
              </View>

              <View style={styles.statusAtendido}>
                <Text style={styles.statusAtendidoText}>ATENDIDO</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Cita:</Text> #{cola.cita_id_FK}
            </Text>

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Prioridad:</Text>{" "}
              {cola.prioridad || "normal"}
            </Text>

            {cola.numero_consultorio && (
              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Consultorio:</Text>{" "}
                {cola.numero_consultorio}
              </Text>
            )}

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Llegada:</Text>{" "}
              {cola.hora_registro
                ? new Date(cola.hora_registro).toLocaleTimeString()
                : "—"}
            </Text>

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Llamado:</Text>{" "}
              {cola.hora_llamado
                ? new Date(cola.hora_llamado).toLocaleTimeString()
                : "—"}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },

  content: {
    padding: 30,
    paddingBottom: 50,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  backText: { color: c.primary, fontSize: 14, fontWeight: "800" },

  headerActions: { flexDirection: "row", gap: 10 },

  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
  },

  refreshText: { fontSize: 22, color: c.primary, fontWeight: "800" },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: c.primary,
    marginBottom: 5,
  },

  title: { fontSize: 30, fontWeight: "900", color: c.text },

  subtitle: { fontSize: 13, color: c.muted, marginTop: 5, marginBottom: 25 },

  summaryCard: {
    backgroundColor: c.primary,
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },

  summaryNumber: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },

  summaryText: { fontSize: 13, color: "#DCEFEB", marginTop: 3 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: c.text,
    marginBottom: 14,
  },

  center: { alignItems: "center", paddingVertical: 50 },

  loadingText: { marginTop: 12, color: c.muted, fontSize: 13 },

  errorCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 25,
    borderWidth: 1,
    borderColor: c.border,
  },

  errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },

  errorText: { fontSize: 12, color: c.muted, marginTop: 6 },

  retryButton: {
    marginTop: 18,
    backgroundColor: c.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  emptyCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
  },

  emptyIcon: { fontSize: 35, color: c.primary, marginBottom: 12 },

  emptyTitle: { fontSize: 16, fontWeight: "800", color: c.text },

  emptyText: {
    fontSize: 12,
    color: c.muted,
    marginTop: 6,
    textAlign: "center",
  },

  colaCard: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },

  colaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  turnoBox: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },

  turnoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: c.primary,
    letterSpacing: 1,
  },

  turnoNumero: {
    fontSize: 22,
    fontWeight: "900",
    color: c.text,
    marginTop: 2,
  },

  statusAtendido: {
    backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  statusAtendidoText: {
    fontSize: 11,
    fontWeight: "800",
    color: c.primary,
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF2F1",
    marginVertical: 14,
  },

  detail: { fontSize: 12, color: c.muted, marginBottom: 6 },

  detailLabel: { fontWeight: "800", color: c.text },
});
};
