import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

interface CitaTransferida {
  id_PK: number;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  notas: string | null;
  paciente_nombre: string;
  doctor_actual_nombre: string;
  doctor_actual_especialidad: string;
}

export default function CitasTransferidasScreen() {
  const { token } = useAuth();
  const [citas, setCitas] = useState<CitaTransferida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarCitas = async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");
      const res = await api.get<CitaTransferida[]>("/api/citas/transferidas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCitas(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "No se pudieron cargar las citas transferidas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCitas();
  }, [token]);

  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return "Sin fecha";
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch {
      return fecha;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/doctor/consultas")}>
          <FontAwesome name="arrow-left" size={13} color="#247F76" style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Volver a mis consultas</Text>
        </Pressable>
        <Pressable style={styles.refreshButton} onPress={cargarCitas}>
          <FontAwesome name="refresh" size={14} color="#247F76" />
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>HISTORIAL CLÍNICO</Text>
      <Text style={styles.title}>Citas Transferidas</Text>
      <Text style={styles.subtitle}>Consulta las citas que has pasado a otros especialistas.</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarCitas}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : citas.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome name="exchange" size={40} color="#8A9A98" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No has transferido citas</Text>
          <Text style={styles.emptyText}>Cuando pases una cita a otro doctor, aparecerá aquí.</Text>
        </View>
      ) : (
        citas.map((cita) => (
          <View key={cita.id_PK} style={styles.citaCard}>
            <View style={styles.citaHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.citaTitle}>Cita #{cita.id_PK}</Text>
                <Text style={styles.citaDate}>{formatearFecha(cita.fecha)}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{cita.estado || "Transferida"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <FontAwesome name="user-md" size={14} color="#247F76" style={{ marginRight: 8, marginTop: 2 }} />
              <View>
                <Text style={styles.infoLabel}>Doctor Actual:</Text>
                <Text style={styles.infoValue}>Dr. {cita.doctor_actual_nombre}</Text>
                <Text style={styles.infoSubValue}>{cita.doctor_actual_especialidad}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <FontAwesome name="user" size={14} color="#247F76" style={{ marginRight: 8, marginTop: 2 }} />
              <View>
                <Text style={styles.infoLabel}>Paciente:</Text>
                <Text style={styles.infoValue}>{cita.paciente_nombre}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <FontAwesome name="clock-o" size={14} color="#247F76" style={{ marginRight: 8, marginTop: 2 }} />
              <View>
                <Text style={styles.infoLabel}>Horario:</Text>
                <Text style={styles.infoValue}>{cita.hora_inicio || "—"} - {cita.hora_fin || "—"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <FontAwesome name="stethoscope" size={14} color="#247F76" style={{ marginRight: 8, marginTop: 2 }} />
              <View>
                <Text style={styles.infoLabel}>Motivo:</Text>
                <Text style={styles.infoValue}>{cita.motivo || "No especificado"}</Text>
              </View>
            </View>

            {cita.notas && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Historial de Transferencia:</Text>
                <Text style={styles.notesText}>{cita.notas}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 30, paddingBottom: 50, maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#DCEAE6" },
  backText: { color: "#247F76", fontSize: 13, fontWeight: "800" },
  refreshButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#DCEAE6" },
  smallTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#2A8C82", marginBottom: 5 },
  title: { fontSize: 30, fontWeight: "900", color: "#173F3A" },
  subtitle: { fontSize: 13, color: "#82938F", marginTop: 4, marginBottom: 20 },
  center: { alignItems: "center", paddingVertical: 50 },
  loadingText: { marginTop: 12, color: "#82938F", fontSize: 13 },
  errorCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 25, borderWidth: 1, borderColor: "#E4EEEB" },
  errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },
  errorText: { fontSize: 12, color: "#879691", marginTop: 6 },
  retryButton: { marginTop: 18, backgroundColor: "#247F76", paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, alignSelf: "flex-start" },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 35, alignItems: "center", borderWidth: 1, borderColor: "#E4EEEB" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#26443F" },
  emptyText: { fontSize: 12, color: "#879691", marginTop: 6, textAlign: "center" },
  citaCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "#E4EEEB" },
  citaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  citaTitle: { fontSize: 16, fontWeight: "800", color: "#26443F" },
  citaDate: { fontSize: 12, color: "#82938F", marginTop: 4, textTransform: "capitalize" },
  statusBadge: { backgroundColor: "#E7F5F2", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { fontSize: 11, fontWeight: "800", color: "#247F76", textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#E8F0EE", marginVertical: 14 },
  infoRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-start" },
  infoLabel: { fontSize: 11, fontWeight: "800", color: "#82938F", textTransform: "uppercase" },
  infoValue: { fontSize: 13, color: "#31534D", fontWeight: "700", marginTop: 2 },
  infoSubValue: { fontSize: 12, color: "#667874", marginTop: 2 },
  notesContainer: { marginTop: 10, backgroundColor: "#F8FAFA", padding: 15, borderRadius: 12 },
  notesLabel: { fontSize: 12, fontWeight: "800", color: "#31534D", marginBottom: 5 },
  notesText: { fontSize: 13, color: "#5C706C", lineHeight: 20 },
});