import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { useTheme, type Theme } from "../../theme/theme";

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
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { token, planActual } = useAuth();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formGenero, setFormGenero] = useState("");
  const [formDireccion, setFormDireccion] = useState("");

  const esPlanGratuito = (planActual?.nombre_plan || "").toLowerCase().trim() === "gratuito";

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
      setError(
        err?.response?.data?.detail || "No se pudieron cargar tus pacientes."
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

  const handleCrearPaciente = async () => {
    if (!formNombre.trim() || !formApellido.trim()) {
      setErrorFormulario("El nombre y los apellidos son obligatorios.");
      return;
    }

    setGuardandoPaciente(true);
    setErrorFormulario("");

    try {
      await api.post(
        "/api/pacientes/",
        {
          nombre: formNombre.trim(),
          apellido: formApellido.trim(),
          telefono: formTelefono.trim() || null,
          correo_electronico: formCorreo.trim().toLowerCase() || null,
          genero: formGenero || null,
          direccion: formDireccion.trim() || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFormNombre("");
      setFormApellido("");
      setFormTelefono("");
      setFormCorreo("");
      setFormGenero("");
      setFormDireccion("");
      setModalCrearVisible(false);
      await cargarDatos();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorFormulario(
        typeof detail === "string"
          ? detail
          : "No se pudo registrar el paciente. Verifica los datos ingresados."
      );
    } finally {
      setGuardandoPaciente(false);
    }
  };

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
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
          {esPlanGratuito
            ? "Pacientes registrados y asignados a tu consultorio."
            : "Pacientes que tienen citas contigo."}
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryFila}>
            <View>
              <Text style={styles.summaryNumber}>
                {esPlanGratuito ? `${pacientes.length} / 20` : pacientes.length}
              </Text>
              <Text style={styles.summaryText}>
                {esPlanGratuito
                  ? "Pacientes registrados este mes (Plan Gratuito)"
                  : "Pacientes asignados"}
              </Text>
            </View>

            {esPlanGratuito && (
              <Pressable
                style={styles.btnCrearPaciente}
                onPress={() => {
                  setErrorFormulario("");
                  setModalCrearVisible(true);
                }}
              >
                <Ionicons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnCrearPacienteTexto}>Nuevo Paciente</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filaSeccionHeader}>
          <Text style={styles.sectionTitle}>Lista de pacientes</Text>
          {esPlanGratuito && (
            <Pressable
              style={styles.btnCrearSecundario}
              onPress={() => {
                setErrorFormulario("");
                setModalCrearVisible(true);
              }}
            >
              <Text style={styles.btnCrearSecundarioTexto}>+ Registrar paciente</Text>
            </Pressable>
          )}
        </View>

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
            <Ionicons name="person-outline" size={40} color={c.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No tienes pacientes registrados</Text>
            <Text style={styles.emptyText}>
              {esPlanGratuito
                ? "Pulsa el botón 'Nuevo Paciente' para dar de alta a tu primer paciente y gestionar su expediente digital."
                : "Cuando recepción te asigne citas, tus pacientes aparecerán aquí."}
            </Text>
            {esPlanGratuito && (
              <Pressable
                style={[styles.btnCrearPaciente, { marginTop: 16 }]}
                onPress={() => {
                  setErrorFormulario("");
                  setModalCrearVisible(true);
                }}
              >
                <Ionicons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.btnCrearPacienteTexto}>Registrar primer paciente</Text>
              </Pressable>
            )}
          </View>
        ) : (
          pacientes.map((paciente) => (
            <View key={paciente.id_PK} style={styles.pacienteCard}>
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

              {paciente.correo_electronico && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Correo:</Text>
                  <Text style={styles.infoValue}>
                    {paciente.correo_electronico}
                  </Text>
                </View>
              )}

              {paciente.telefono && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Teléfono:</Text>
                  <Text style={styles.infoValue}>{paciente.telefono}</Text>
                </View>
              )}

              {paciente.fecha_nacimiento && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Edad:</Text>
                  <Text style={styles.infoValue}>
                    {calcularEdad(paciente.fecha_nacimiento)} ({paciente.fecha_nacimiento})
                  </Text>
                </View>
              )}

              {paciente.genero && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Género:</Text>
                  <Text style={styles.infoValue}>{paciente.genero}</Text>
                </View>
              )}

              {paciente.direccion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dirección:</Text>
                  <Text style={styles.infoValue}>{paciente.direccion}</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Pressable
                  style={[styles.btnVerExpediente, { flex: 1, backgroundColor: "#E7F5F2", borderWidth: 1, borderColor: "#247F76" }]}
                  onPress={() =>
                    router.push({
                      pathname: "/doctor/consultas",
                      params: { pacienteId: String(paciente.id_PK) },
                    })
                  }
                >
                  <Ionicons name="calendar-outline" size={14} color="#247F76" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnVerExpedienteTexto, { color: "#247F76" }]}>Agendar consulta</Text>
                </Pressable>

                <Pressable
                  style={[styles.btnVerExpediente, { flex: 1 }]}
                  onPress={() =>
                    router.push({
                      pathname: "/doctor/expediente",
                      params: { pacienteId: String(paciente.id_PK) },
                    })
                  }
                >
                  <Ionicons name="folder-open-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnVerExpedienteTexto}>Ver expediente</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalCrearVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCrearVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalCrearVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitulo}>Registrar Paciente</Text>
                <Text style={styles.modalSubtitulo}>
                  El expediente quedará asignado a tu consultorio
                </Text>
              </View>
              <Pressable
                onPress={() => setModalCrearVisible(false)}
                style={styles.modalCerrar}
              >
                <Ionicons name="close" size={20} color={c.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {errorFormulario ? (
                <View style={styles.modalErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.modalErrorTexto}>{errorFormulario}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Nombre(s) *</Text>
              <TextInput
                style={styles.input}
                value={formNombre}
                onChangeText={setFormNombre}
                placeholder="Ej. Juan Carlos"
                placeholderTextColor={c.muted}
              />

              <Text style={styles.inputLabel}>Apellidos *</Text>
              <TextInput
                style={styles.input}
                value={formApellido}
                onChangeText={setFormApellido}
                placeholder="Ej. Pérez Gómez"
                placeholderTextColor={c.muted}
              />

              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={formTelefono}
                onChangeText={setFormTelefono}
                placeholder="Ej. 5512345678"
                keyboardType="phone-pad"
                placeholderTextColor={c.muted}
              />

              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                value={formCorreo}
                onChangeText={setFormCorreo}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={c.muted}
              />

              <Text style={styles.inputLabel}>Género</Text>
              <View style={styles.generoFila}>
                {["Masculino", "Femenino", "Otro"].map((gen) => (
                  <Pressable
                    key={gen}
                    style={[
                      styles.generoBtn,
                      formGenero === gen && styles.generoBtnActivo,
                    ]}
                    onPress={() => setFormGenero(gen)}
                  >
                    <Text
                      style={[
                        styles.generoBtnTexto,
                        formGenero === gen && styles.generoBtnTextoActivo,
                      ]}
                    >
                      {gen}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Dirección</Text>
              <TextInput
                style={styles.input}
                value={formDireccion}
                onChangeText={setFormDireccion}
                placeholder="Calle, número, colonia"
                placeholderTextColor={c.muted}
              />

              <Pressable
                style={[
                  styles.btnGuardarPaciente,
                  guardandoPaciente && { opacity: 0.7 },
                ]}
                onPress={handleCrearPaciente}
                disabled={guardandoPaciente}
              >
                {guardandoPaciente ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnGuardarPacienteTexto}>
                    Guardar y Asignar Paciente
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      maxWidth: 900,
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
    backText: { color: c.primary, fontSize: 14, fontWeight: "800" },

    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
      justifyContent: "center",
      alignItems: "center",
    },
    refreshText: { fontSize: 20, color: c.primary, fontWeight: "800" },

    smallTitle: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 2,
      color: c.primary,
      marginBottom: 5,
    },
    title: { fontSize: 28, fontWeight: "900", color: c.text },
    subtitle: {
      fontSize: 13,
      color: c.muted,
      marginTop: 5,
      marginBottom: 20,
    },

    summaryCard: {
      backgroundColor: c.primary,
      borderRadius: 18,
      padding: 20,
      marginBottom: 24,
    },
    summaryFila: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    },
    summaryNumber: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    summaryText: { fontSize: 12, color: "#DCEFEB", marginTop: 2 },

    btnCrearPaciente: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.22)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    btnCrearPacienteTexto: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },

    filaSeccionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    btnCrearSecundario: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    btnCrearSecundarioTexto: {
      color: c.primary,
      fontSize: 12,
      fontWeight: "800",
    },

    center: { alignItems: "center", paddingVertical: 50 },
    loadingText: { marginTop: 12, color: c.muted, fontSize: 13 },

    errorCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 22,
      borderWidth: 1,
      borderColor: c.border,
    },
    errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },
    errorText: { fontSize: 12, color: c.muted, marginTop: 6 },
    retryButton: {
      marginTop: 16,
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

    emptyCard: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    emptyText: {
      fontSize: 12,
      color: c.muted,
      marginTop: 6,
      textAlign: "center",
      maxWidth: 400,
    },

    pacienteCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    pacienteHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "900",
      color: c.primary,
    },
    pacienteNombre: {
      fontSize: 15,
      fontWeight: "800",
      color: c.text,
    },
    pacienteId: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
    },
    estadoBadge: {
      backgroundColor: isDark ? "rgba(8,191,164,0.18)" : "#E2F4F0",
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    estadoText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.primary,
      textTransform: "capitalize",
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF2F1",
      marginVertical: 12,
    },
    infoRow: {
      flexDirection: "row",
      marginBottom: 5,
      alignItems: "flex-start",
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: c.text,
      marginRight: 6,
      minWidth: 80,
    },
    infoValue: {
      fontSize: 12,
      color: c.muted,
      flex: 1,
      flexWrap: "wrap",
    },
    btnVerExpediente: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: "#247F76",
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    btnVerExpedienteTexto: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 12,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalCard: {
      width: "100%",
      maxWidth: 480,
      maxHeight: "90%",
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalTitulo: {
      fontSize: 18,
      fontWeight: "900",
      color: c.text,
    },
    modalSubtitulo: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
    },
    modalCerrar: {
      padding: 4,
    },
    modalErrorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(220, 38, 38, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(220, 38, 38, 0.25)",
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    modalErrorTexto: {
      color: "#DC2626",
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: c.text,
      marginBottom: 5,
      marginTop: 10,
    },
    input: {
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: c.text,
    },
    generoFila: {
      flexDirection: "row",
      gap: 8,
    },
    generoBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
    },
    generoBtnActivo: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    generoBtnTexto: {
      fontSize: 12,
      fontWeight: "700",
      color: c.muted,
    },
    generoBtnTextoActivo: {
      color: "#FFFFFF",
    },
    btnGuardarPaciente: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 8,
    },
    btnGuardarPacienteTexto: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
  });
};
