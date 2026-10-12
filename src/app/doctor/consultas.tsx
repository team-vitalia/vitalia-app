import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
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
}

interface Paciente {
  id_PK: number;
  nombre: string;
  apellido: string;
}

export default function MisConsultasScreen() {
  const { token } = useAuth();

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
      console.log(
        "ERROR MIS CONSULTAS:",
        err?.response?.status,
        err?.response?.data
      );

      setError(
        err?.response?.data?.detail ||
          "No se pudieron cargar tus consultas."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarDatos();
    }
  }, [token]);

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
      case "programada":
        return { bg: "#E7F5F2", text: "#247F76" };
      case "completada":
      case "atendida":
        return { bg: "#D5EFEB", text: "#17685F" };
      case "cancelada":
        return { bg: "#FFF0EF", text: "#D65A5A" };
      default:
        return { bg: "#F0F5F3", text: "#71837E" };
    }
  };

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
          onPress={() => router.push("/doctor")}
        >
          <Text style={styles.backText}>← Volver al panel</Text>
        </Pressable>

        <Pressable style={styles.refreshButton} onPress={cargarDatos}>
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>PANEL CLÍNICO</Text>
      <Text style={styles.title}>Mis consultas</Text>
      <Text style={styles.subtitle}>
        Consulta las citas de tus pacientes asignados.
      </Text>

      {/* RESUMEN */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{citas.length}</Text>
        <Text style={styles.summaryText}>Consultas registradas</Text>
      </View>

      {/* CONTENIDO */}
      <Text style={styles.sectionTitle}>Agenda de consultas</Text>

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
          <Text style={styles.emptyIcon}>◷</Text>
          <Text style={styles.emptyTitle}>No tienes consultas asignadas</Text>
          <Text style={styles.emptyText}>
            Cuando recepción te asigne citas, aparecerán aquí.
          </Text>
        </View>
      ) : (
        citas.map((cita) => {
          const estado = colorEstado(cita.estado);

          return (
            <View key={cita.id_PK} style={styles.citaCard}>
              <View style={styles.citaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.citaTitle}>Cita #{cita.id_PK}</Text>
                  <Text style={styles.citaDate}>
                    {formatearFecha(cita.fecha)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.status,
                    { backgroundColor: estado.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: estado.text }]}
                  >
                    {cita.estado || "Sin estado"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* HORARIO */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🕐 Horario:</Text>
                <Text style={styles.infoValue}>
                  {cita.hora_inicio || "—"} - {cita.hora_fin || "—"}
                </Text>
              </View>

              {/* PACIENTE */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>👤 Paciente:</Text>
                <Text style={styles.infoValue}>
                  {obtenerNombrePaciente(cita.paciente_id_FK)}
                </Text>
              </View>

              {/* MOTIVO */}
              {cita.motivo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📋 Motivo:</Text>
                  <Text style={styles.infoValue}>{cita.motivo}</Text>
                </View>
              )}

              {/* NOTAS */}
              {cita.notas && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📝 Notas:</Text>
                  <Text style={styles.infoValue}>{cita.notas}</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },

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

  backButton: { paddingVertical: 8, paddingHorizontal: 12 },

  backText: { color: "#247F76", fontSize: 14, fontWeight: "800" },

  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },

  refreshText: { fontSize: 22, color: "#247F76", fontWeight: "800" },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: { fontSize: 30, fontWeight: "900", color: "#173F3A" },

  subtitle: {
    fontSize: 13,
    color: "#82938F",
    marginTop: 5,
    marginBottom: 25,
  },

  summaryCard: {
    backgroundColor: "#247F76",
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },

  summaryNumber: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },

  summaryText: { fontSize: 13, color: "#DCEFEB", marginTop: 3 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 14,
  },

  center: { alignItems: "center", paddingVertical: 50 },

  loadingText: { marginTop: 12, color: "#82938F", fontSize: 13 },

  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 25,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },

  errorText: { fontSize: 12, color: "#879691", marginTop: 6 },

  retryButton: {
    marginTop: 18,
    backgroundColor: "#247F76",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  emptyIcon: { fontSize: 35, color: "#247F76", marginBottom: 12 },

  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#26443F" },

  emptyText: {
    fontSize: 12,
    color: "#879691",
    marginTop: 6,
    textAlign: "center",
  },

  citaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  citaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  citaTitle: { fontSize: 15, fontWeight: "800", color: "#26443F" },

  citaDate: {
    fontSize: 12,
    color: "#82938F",
    marginTop: 4,
    textTransform: "capitalize",
  },

  status: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  divider: {
    height: 1,
    backgroundColor: "#E8F0EE",
    marginVertical: 14,
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#31534D",
    marginRight: 6,
    minWidth: 90,
  },

  infoValue: {
    fontSize: 12,
    color: "#667874",
    flex: 1,
    flexWrap: "wrap",
  },
});