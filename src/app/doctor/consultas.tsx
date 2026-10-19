import { FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useGoogleCalendar } from "../../context/CalendarContext";
import { useNotifications } from "../../context/NotificationsContext";
import api from "../../services/api";

interface Cita {
  id_PK: number;
  paciente_id_FK: number | null;
  doctor_id_FK: number | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  notas: string | null;
  creado_por: number | null;
  google_event_id?: string | null;
}

interface Paciente {
  id_PK: number;
  nombre: string;
  apellido: string;
}

export default function MisConsultasScreen() {
  const { token } = useAuth();
  const { messages } = useNotifications();
  const {
    isCalendarConnected,
    cargando: cargandoCalendar,
    conectarGoogle,
    desconectarGoogle,
  } = useGoogleCalendar();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");
      const [respuestaCitas, respuestaPacientes] = await Promise.all([
        api.get<Cita[]>("/api/citas/mis-consultas", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get<Paciente[]>("/api/doctores/mis-pacientes", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setCitas(respuestaCitas.data);
      setPacientes(respuestaPacientes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "No se pudieron cargar tus consultas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) cargarDatos();
  }, [token]);

  useEffect(() => {
    if (messages.length > 0 && token) cargarDatos();
  }, [messages.length, token]);

  const obtenerNombrePaciente = (pacienteId: number | null): string => {
    if (!pacienteId) return "—";
    const paciente = pacientes.find((p) => p.id_PK === pacienteId);
    if (!paciente) return `Paciente #${pacienteId}`;
    return `${paciente.nombre} ${paciente.apellido}`;
  };

  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return "Sin fecha";
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  const colorEstado = (estado: string | null) => {
    switch (estado) {
      case "programada": return { bg: "#E7F5F2", text: "#247F76" };
      case "completada":
      case "atendida": return { bg: "#D5EFEB", text: "#17685F" };
      case "cancelada": return { bg: "#FFF0EF", text: "#D65A5A" };
      default: return { bg: "#F0F5F3", text: "#71837E" };
    }
  };

  const terminarCitaRapido = async (citaId: number) => {
    const ejecutarTerminar = async () => {
      try {
        await api.put(
          `/api/citas/${citaId}/estado?nuevo_estado=completada`, 
          {}, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Éxito: La cita se ha terminado correctamente.");
        cargarDatos();
      } catch (e: any) {
        alert("Error: " + (e?.response?.data?.detail || "No se pudo terminar la cita."));
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm("¿Marcar esta cita como completada?")) {
        ejecutarTerminar();
      }
    } else {
      Alert.alert("Terminar Cita", "¿Marcar esta cita como completada?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, terminar", onPress: ejecutarTerminar },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.push("/doctor")}>
          <FontAwesome name="arrow-left" size={13} color="#247F76" style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Volver al panel</Text>
        </Pressable>
        <Pressable 
          style={[styles.refreshButton, { width: 'auto', paddingHorizontal: 12, flexDirection: 'row', gap: 6 }]} 
          onPress={() => router.push("/doctor/citas-transferidas")}
        >
          <FontAwesome name="exchange" size={12} color="#247F76" />
          <Text style={{ color: "#247F76", fontSize: 12, fontWeight: "800" }}>Transferidas</Text>
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>PANEL CLÍNICO</Text>
      <Text style={styles.title}>Mis Consultas</Text>
      <Text style={styles.subtitle}>Consulta tus citas asignadas y mantén sincronizada tu agenda personal.</Text>

      <View style={styles.calendarSyncCard}>
        <View style={styles.calendarSyncInfo}>
          <View style={styles.calendarTitleRow}>
            <FontAwesome name="calendar" size={18} color="#247F76" style={{ marginRight: 8 }} />
            <Text style={styles.calendarCardTitle}>Google Calendar del Médico</Text>
          </View>
          <Text style={styles.calendarCardSubtitle}>
            {isCalendarConnected
              ? "Tu cuenta de Google Calendar está vinculada. Las citas que recepción te asigne se registrarán en tu calendario."
              : "Vincula tu cuenta de Google para que las citas asignadas por recepción aparezcan automáticamente en tu calendario."}
          </Text>
          <View style={styles.calendarStatusRow}>
            <View style={[styles.calendarStatusDot, { backgroundColor: isCalendarConnected ? "#247F76" : "#D65A5A" }]} />
            <Text style={styles.calendarStatusText}>
              {isCalendarConnected ? "Servicio Conectado y Activo" : "No conectado"}
            </Text>
          </View>
        </View>
        <View style={styles.calendarActions}>
          {cargandoCalendar ? (
            <ActivityIndicator size="small" color="#247F76" />
          ) : isCalendarConnected ? (
            <Pressable style={styles.unlinkButton} onPress={desconectarGoogle}>
              <FontAwesome name="chain-broken" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.unlinkButtonText}>Desvincular</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.linkButton} onPress={conectarGoogle}>
              <FontAwesome name="google" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.linkButtonText}>Vincular Calendar</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryNumber}>{citas.length}</Text>
          <Text style={styles.summaryText}>Consultas registradas</Text>
        </View>
        <FontAwesome name="stethoscope" size={38} color="#A7DFD6" />
      </View>

      <Text style={styles.sectionTitle}>Agenda de Consultas</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando consultas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarDatos}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : citas.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome name="calendar-times-o" size={40} color="#8A9A98" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No tienes consultas asignadas</Text>
          <Text style={styles.emptyText}>Cuando recepción registre citas para tu consultorio, aparecerán aquí.</Text>
        </View>
      ) : (
        citas.map((cita) => {
          const estado = colorEstado(cita.estado);
          const tieneGoogleCalendar = !!cita.google_event_id;

          return (
            <View key={cita.id_PK} style={styles.citaCard}>
              <View style={styles.citaHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.citaTitleRow}>
                    <Text style={styles.citaTitle}>Cita #{cita.id_PK}</Text>
                    {tieneGoogleCalendar ? (
                      <View style={styles.googleBadge}>
                        <FontAwesome name="calendar-check-o" size={11} color="#17685F" style={{ marginRight: 4 }} />
                        <Text style={styles.googleBadgeText}>Google Calendar</Text>
                      </View>
                    ) : (
                      <View style={styles.localBadge}>
                        <FontAwesome name="calendar-o" size={11} color="#687F7B" style={{ marginRight: 4 }} />
                        <Text style={styles.localBadgeText}>Local</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.citaDate}>{formatearFecha(cita.fecha)}</Text>
                </View>
                <View style={[styles.status, { backgroundColor: estado.bg }]}>
                  <Text style={[styles.statusText, { color: estado.text }]}>{cita.estado || "Sin estado"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome name="clock-o" size={12} color="#247F76" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Horario:</Text>
                </View>
                <Text style={styles.infoValue}>{cita.hora_inicio || "—"} - {cita.hora_fin || "—"}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome name="user" size={12} color="#247F76" style={styles.infoIcon} />
                  <Text style={styles.infoLabel}>Paciente:</Text>
                </View>
                <Text style={styles.infoValue}>{obtenerNombrePaciente(cita.paciente_id_FK)}</Text>
              </View>

              {cita.motivo && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <FontAwesome name="stethoscope" size={12} color="#247F76" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>Motivo:</Text>
                  </View>
                  <Text style={styles.infoValue}>{cita.motivo}</Text>
                </View>
              )}

              {cita.notas && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <FontAwesome name="file-text-o" size={12} color="#247F76" style={styles.infoIcon} />
                    <Text style={styles.infoLabel}>Notas:</Text>
                  </View>
                  <Text style={styles.infoValue}>{cita.notas}</Text>
                </View>
              )}
              
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "#247F76", flex: 1 }]}
                  onPress={() => router.push({ pathname: "/doctor/detalle-cita", params: { id: cita.id_PK.toString() } })}
                >
                  <Text style={styles.actionBtnText}>Ver Detalle</Text>
                  <FontAwesome name="chevron-right" size={12} color="#FFFFFF" />
                </Pressable>

                {cita.estado !== "completada" && cita.estado !== "atendida" && (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: "#D65A5A", flex: 0.6 }]}
                    onPress={() => terminarCitaRapido(cita.id_PK)}
                  >
                    <Text style={styles.actionBtnText}>Terminar</Text>
                    <FontAwesome name="check" size={12} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
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
  calendarSyncCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#CCE4DD", marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 },
  calendarSyncInfo: { flex: 1, minWidth: 260 },
  calendarTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  calendarCardTitle: { fontSize: 15, fontWeight: "800", color: "#173F3A" },
  calendarCardSubtitle: { fontSize: 12, color: "#607671", lineHeight: 18, marginBottom: 8 },
  calendarStatusRow: { flexDirection: "row", alignItems: "center" },
  calendarStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  calendarStatusText: { fontSize: 11, fontWeight: "700", color: "#46625D" },
  calendarActions: { flexDirection: "row", alignItems: "center" },
  linkButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#247F76", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  linkButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  unlinkButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#D65A5A", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  unlinkButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  summaryCard: { backgroundColor: "#247F76", borderRadius: 20, padding: 22, marginBottom: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLeft: { flex: 1 },
  summaryNumber: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },
  summaryText: { fontSize: 13, color: "#DCEFEB", marginTop: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A", marginBottom: 14 },
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
  citaTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  citaTitle: { fontSize: 15, fontWeight: "800", color: "#26443F" },
  googleBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#E2F6F2", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  googleBadgeText: { fontSize: 10, fontWeight: "800", color: "#17685F" },
  localBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2F5F4", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  localBadgeText: { fontSize: 10, fontWeight: "700", color: "#687F7B" },
  citaDate: { fontSize: 12, color: "#82938F", marginTop: 4, textTransform: "capitalize" },
  status: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#E8F0EE", marginVertical: 14 },
  infoRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
  infoLabelContainer: { flexDirection: "row", alignItems: "center", width: 90 },
  infoIcon: { marginRight: 6 },
  infoLabel: { fontSize: 12, fontWeight: "800", color: "#31534D" },
  infoValue: { fontSize: 12, color: "#667874", flex: 1, flexWrap: "wrap" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, gap: 6 },
  actionBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});