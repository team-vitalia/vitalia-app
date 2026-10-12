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

interface Paciente {
  id_PK: number;
  nombre: string;
  apellido: string;
  correo_electronico: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  estado: string | null;
}

export default function MisPacientesScreen() {
  const { token } = useAuth();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    if (!token) return;

    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get<Paciente[]>(
        "/api/doctores/mis-pacientes",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPacientes(respuesta.data);
    } catch (err: any) {
      console.log(
        "ERROR MIS PACIENTES:",
        err?.response?.status,
        err?.response?.data
      );

      setError(
        err?.response?.data?.detail ||
          "No se pudieron cargar tus pacientes."
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

  const calcularEdad = (fechaNacimiento: string | null): string => {
    if (!fechaNacimiento) return "—";
    try {
      const nacimiento = new Date(fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      return `${edad} años`;
    } catch {
      return "—";
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
      <Text style={styles.title}>Mis pacientes</Text>
      <Text style={styles.subtitle}>
        Pacientes que tienen citas contigo.
      </Text>

      {/* RESUMEN */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{pacientes.length}</Text>
        <Text style={styles.summaryText}>Pacientes asignados</Text>
      </View>

      {/* CONTENIDO */}
      <Text style={styles.sectionTitle}>Lista de pacientes</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando pacientes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarDatos}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : pacientes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No tienes pacientes asignados</Text>
          <Text style={styles.emptyText}>
            Cuando recepción te asigne citas, tus pacientes aparecerán aquí.
          </Text>
        </View>
      ) : (
        pacientes.map((paciente) => (
          <View key={paciente.id_PK} style={styles.pacienteCard}>
            {/* HEADER CON AVATAR */}
            <View style={styles.pacienteHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {paciente.nombre?.charAt(0)?.toUpperCase() || "P"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.pacienteNombre}>
                  {paciente.nombre} {paciente.apellido}
                </Text>
                <Text style={styles.pacienteId}>
                  ID: #{paciente.id_PK}
                </Text>
              </View>

              {paciente.estado && (
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoText}>
                    {paciente.estado}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* DATOS */}
            {paciente.correo_electronico && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📧 Correo:</Text>
                <Text style={styles.infoValue}>
                  {paciente.correo_electronico}
                </Text>
              </View>
            )}

            {paciente.telefono && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📱 Teléfono:</Text>
                <Text style={styles.infoValue}>{paciente.telefono}</Text>
              </View>
            )}

            {paciente.fecha_nacimiento && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🎂 Edad:</Text>
                <Text style={styles.infoValue}>
                  {calcularEdad(paciente.fecha_nacimiento)} (
                  {paciente.fecha_nacimiento})
                </Text>
              </View>
            )}

            {paciente.genero && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>👤 Género:</Text>
                <Text style={styles.infoValue}>{paciente.genero}</Text>
              </View>
            )}

            {paciente.direccion && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📍 Dirección:</Text>
                <Text style={styles.infoValue}>{paciente.direccion}</Text>
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

  pacienteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  pacienteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#247F76",
  },

  pacienteNombre: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173F3A",
  },

  pacienteId: {
    fontSize: 11,
    color: "#82938F",
    marginTop: 3,
  },

  estadoBadge: {
    backgroundColor: "#E7F5F2",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  estadoText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#247F76",
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
    minWidth: 100,
  },

  infoValue: {
    fontSize: 12,
    color: "#667874",
    flex: 1,
    flexWrap: "wrap",
  },
});