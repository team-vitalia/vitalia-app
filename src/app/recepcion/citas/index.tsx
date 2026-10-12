import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import {
  Cola,
  listarColas,
  registrarLlegada,
} from "../../../services/colasService";

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

interface Doctor {
  id_PK: number;
  nombre: string;
  especialidad?: string;
}

export default function CitasScreen() {
  const { token } = useAuth();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [colas, setColas] = useState<Cola[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // 🔹 BUSCADOR
  const [busqueda, setBusqueda] = useState("");

  // Estados para registrar llegada
  const [modalLlegada, setModalLlegada] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);
  const [prioridad, setPrioridad] = useState<"normal" | "urgente">("normal");
  const [registrando, setRegistrando] = useState(false);

  // 🔹 MODAL DE CONFIRMACIÓN DE ELIMINAR
  const [modalEliminar, setModalEliminar] = useState(false);
  const [citaAEliminar, setCitaAEliminar] = useState<Cita | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // 🔹 Carga paralela
  const cargarDatos = async () => {
    if (!token) return;

    try {
      setCargando(true);
      setError("");

      const [
        respuestaCitas,
        respuestaPacientes,
        respuestaDoctores,
        respuestaColas,
      ] = await Promise.all([
        api.get<Cita[]>("/api/citas/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get<Paciente[]>("/api/pacientes/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get<Doctor[]>("/api/doctores/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        listarColas(token),
      ]);

      setCitas(respuestaCitas.data);
      setPacientes(respuestaPacientes.data);
      setDoctores(respuestaDoctores.data);
      setColas(respuestaColas);
    } catch (err: any) {
      console.log(
        "ERROR DATOS:",
        err?.response?.status,
        err?.response?.data
      );

      setError(
        err?.response?.data?.detail ||
          "No se pudieron cargar los datos."
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

  // 🔹 Obtener cola asociada a una cita
  const obtenerColaDeCita = (citaId: number): Cola | undefined => {
    return colas.find((cola) => cola.cita_id_FK === citaId);
  };

  // 🔹 Obtener nombre del paciente
  const obtenerNombrePaciente = (pacienteId: number | null): string => {
    if (!pacienteId) return "—";
    const paciente = pacientes.find((p) => p.id_PK === pacienteId);
    if (!paciente) return `Paciente #${pacienteId}`;
    return `${paciente.nombre} ${paciente.apellido}`;
  };

  // 🔹 Obtener nombre del doctor
  const obtenerNombreDoctor = (doctorId: number | null): string => {
    if (!doctorId) return "—";
    const doctor = doctores.find((d) => d.id_PK === doctorId);
    if (!doctor) return `Doctor #${doctorId}`;
    return doctor.nombre;
  };

  // 🔹 CITAS ORDENADAS + FILTRADAS POR BÚSQUEDA
  const citasOrdenadas = useMemo(() => {
    let resultado = citas;

    if (busqueda.trim()) {
      const termino = busqueda.trim().toLowerCase();
      resultado = citas.filter((cita) =>
        cita.id_PK.toString().includes(termino)
      );
    }

    return [...resultado].sort((a, b) => {
      const colaA = obtenerColaDeCita(a.id_PK);
      const colaB = obtenerColaDeCita(b.id_PK);

      if (!colaA && colaB) return -1;
      if (colaA && !colaB) return 1;

      return a.id_PK - b.id_PK;
    });
  }, [citas, colas, busqueda]);

  // 🔹 Abrir modal de llegada
  const abrirModalLlegada = (cita: Cita) => {
    const colaExistente = obtenerColaDeCita(cita.id_PK);

    if (colaExistente) {
      Alert.alert(
        "⚠️ Esta cita ya fue registrada",
        `Turno: ${colaExistente.numero_cola}\nEstado: ${colaExistente.estado?.toUpperCase()}\nPrioridad: ${colaExistente.prioridad}`
      );
      return;
    }

    setCitaSeleccionada(cita);
    setPrioridad("normal");
    setModalLlegada(true);
  };

  // 🔹 Confirmar registro de llegada
  const confirmarLlegada = async () => {
    if (!citaSeleccionada) return;

    if (!token) {
      Alert.alert("Error", "No hay sesión activa.");
      return;
    }

    try {
      setRegistrando(true);

      const cola = await registrarLlegada(
        citaSeleccionada.id_PK,
        token,
        prioridad
      );

      setModalLlegada(false);

      const citaActual = citaSeleccionada;
      setCitaSeleccionada(null);

      await cargarDatos();

      Alert.alert(
        "✓ ¡Llegada registrada!",
        `Cita #${citaActual.id_PK}\nTurno asignado: ${cola.numero_cola}\nPrioridad: ${cola.prioridad}`
      );
    } catch (err: any) {
      console.log("Error registrando llegada:", err?.response?.data);

      const detalle = err?.response?.data?.detail || "";
      const status = err?.response?.status;

      if (status === 400 && detalle.includes("ya tiene un turno")) {
        Alert.alert(
          "⚠️ Esta cita ya fue registrada",
          "Esta cita ya tiene un turno registrado hoy."
        );
      } else {
        Alert.alert(
          "Error al registrar llegada",
          detalle || "No se pudo registrar la llegada."
        );
      }
    } finally {
      setRegistrando(false);
    }
  };

  // 🔹 ABRIR MODAL DE ELIMINAR
  const abrirModalEliminar = (cita: Cita) => {
    setCitaAEliminar(cita);
    setModalEliminar(true);
  };

  // 🔹 CONFIRMAR ELIMINACIÓN
  const confirmarEliminar = async () => {
    if (!token || !citaAEliminar) return;

    try {
      setEliminando(true);

      await api.delete(`/api/citas/${citaAEliminar.id_PK}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setModalEliminar(false);
      const idEliminado = citaAEliminar.id_PK;
      setCitaAEliminar(null);

      await cargarDatos();

      Alert.alert(
        "✓ Cita eliminada",
        `La cita #${idEliminado} fue eliminada correctamente.`
      );
    } catch (err: any) {
      console.log(
        "Error eliminando cita:",
        err?.response?.status,
        err?.response?.data
      );

      const detalle = err?.response?.data?.detail || "";
      const status = err?.response?.status;

      setModalEliminar(false);
      setCitaAEliminar(null);

      if (status === 400 && detalle.includes("turno")) {
        Alert.alert(
          "⚠️ No se puede eliminar",
          "Esta cita ya tiene un turno registrado. No se puede eliminar."
        );
      } else if (status === 403) {
        Alert.alert(
          "⛔ Sin permisos",
          "No tienes permisos para eliminar citas."
        );
      } else {
        Alert.alert(
          "Error al eliminar",
          detalle || "No se pudo eliminar la cita."
        );
      }
    } finally {
      setEliminando(false);
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
        <View>
          <Text style={styles.smallTitle}>RECEPCIÓN</Text>
          <Text style={styles.title}>Citas</Text>
          <Text style={styles.subtitle}>
            Consulta las citas programadas.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.waitingButton}
            onPress={() => router.push("/recepcion/cola")}
          >
            <Text style={styles.waitingButtonText}>
              ◎ Lista de Citas en espera
            </Text>
          </Pressable>

          <Pressable
            style={styles.newAppointmentButton}
            onPress={() => router.push("/recepcion/citas/crear")}
          >
            <Text style={styles.newAppointmentText}>
              + Nueva cita
            </Text>
          </Pressable>
        </View>
      </View>

      {/* BUSCADOR */}

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por número de cita..."
          placeholderTextColor="#8A9A98"
          keyboardType="numeric"
        />
        {busqueda ? (
          <Pressable
            style={styles.clearButton}
            onPress={() => setBusqueda("")}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* RESUMEN */}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{citas.length}</Text>
        <Text style={styles.summaryText}>Citas registradas</Text>
      </View>

      {/* CONTENIDO */}

      <Text style={styles.sectionTitle}>Agenda</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando citas...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            No se pudieron cargar las citas
          </Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarDatos}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : citasOrdenadas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>◷</Text>
          <Text style={styles.emptyTitle}>
            {busqueda
              ? "No se encontraron citas con ese número"
              : "No hay citas registradas"}
          </Text>
          <Text style={styles.emptyText}>
            {busqueda
              ? "Intenta con otro número de cita."
              : "Cuando se registren citas aparecerán aquí."}
          </Text>
        </View>
      ) : (
        citasOrdenadas.map((cita) => {
          const cola = obtenerColaDeCita(cita.id_PK);
          const registrada = !!cola;
          const atendida = cola?.estado === "atendido";

          return (
            <View
              key={cita.id_PK}
              style={[
                styles.citaCard,
                atendida && styles.citaCardAtendida,
              ]}
            >
              {/* HEADER DE LA CITA */}
              <View style={styles.citaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.citaTitle}>Cita #{cita.id_PK}</Text>
                  <Text style={styles.citaDate}>
                    {cita.fecha || "Sin fecha"} · {cita.hora_inicio || "—"} a{" "}
                    {cita.hora_fin || "—"}
                  </Text>
                </View>

                <View style={styles.headerRight}>
                  <View style={styles.status}>
                    <Text style={styles.statusText}>
                      {cita.estado || "Sin estado"}
                    </Text>
                  </View>

                  {/* 🗑️ BOTÓN ELIMINAR — SOLO SI NO ESTÁ REGISTRADA */}
                  {!registrada && (
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => abrirModalEliminar(cita)}
                    >
                      <Text style={styles.deleteButtonText}>🗑</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* DATOS DEL PACIENTE */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>👤 Paciente:</Text>
                <Text style={styles.infoValue}>
                  {obtenerNombrePaciente(cita.paciente_id_FK)}
                </Text>
              </View>

              {/* DATOS DEL DOCTOR */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>🩺 Doctor:</Text>
                <Text style={styles.infoValue}>
                  {obtenerNombreDoctor(cita.doctor_id_FK)}
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

              {/* 🔹 BANNERS SEGÚN ESTADO */}

              {atendida ? (
                <View style={styles.attendedBanner}>
                  <Text style={styles.attendedBannerTitle}>
                    ✓ PACIENTE YA ATENDIDO
                  </Text>
                  <View style={styles.registeredInfoRow}>
                    <Text style={styles.attendedInfo}>
                      Turno: {cola?.numero_cola || "—"}
                    </Text>
                    {cola?.numero_consultorio && (
                      <Text style={styles.attendedInfo}>
                        Consultorio: {cola.numero_consultorio}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.attendedNote}>
                    📌 Hora de llegada:{" "}
                    {cola?.hora_registro
                      ? new Date(cola.hora_registro).toLocaleString()
                      : "—"}
                  </Text>
                  {cola?.hora_llamado && (
                    <Text style={styles.attendedNote}>
                      🔔 Hora de llamado:{" "}
                      {new Date(cola.hora_llamado).toLocaleString()}
                    </Text>
                  )}
                </View>
              ) : registrada ? (
                <View style={styles.registeredBanner}>
                  <View style={styles.registeredHeader}>
                    <Text style={styles.registeredText}>
                      ✓ LLEGADA REGISTRADA
                    </Text>
                    <Text
                      style={[
                        styles.registeredEstado,
                        cola?.estado === "llamado" &&
                          styles.registeredEstadoLlamado,
                      ]}
                    >
                      {cola?.estado === "llamado"
                        ? "🔔 LLAMADO"
                        : "⏳ EN ESPERA"}
                    </Text>
                  </View>

                  <View style={styles.registeredInfoRow}>
                    <Text style={styles.registeredInfo}>
                      <Text style={styles.registeredInfoLabel}>
                        Turno:{" "}
                      </Text>
                      {cola?.numero_cola || "—"}
                    </Text>

                    {cola?.numero_consultorio && (
                      <Text style={styles.registeredInfo}>
                        <Text style={styles.registeredInfoLabel}>
                          Consultorio:{" "}
                        </Text>
                        {cola.numero_consultorio}
                      </Text>
                    )}

                    <Text style={styles.registeredInfo}>
                      <Text style={styles.registeredInfoLabel}>
                        Prioridad:{" "}
                      </Text>
                      {cola?.prioridad || "normal"}
                    </Text>
                  </View>

                  <View style={styles.registeredNote}>
                    <Text style={styles.registeredNoteText}>
                      📌 Hora de llegada:{" "}
                      {cola?.hora_registro
                        ? new Date(cola.hora_registro).toLocaleString()
                        : "—"}
                    </Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.arrivalButton}
                  onPress={() => abrirModalLlegada(cita)}
                >
                  <Text style={styles.arrivalButtonText}>
                    ✓ Registrar llegada
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {/* MODAL DE LLEGADA */}

      <Modal
        visible={modalLlegada}
        transparent
        animationType="fade"
        onRequestClose={() => setModalLlegada(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registrar llegada</Text>

            <Text style={styles.modalSubtitle}>
              Cita #{citaSeleccionada?.id_PK}
            </Text>

            <Text style={styles.modalLabel}>Prioridad</Text>

            <View style={styles.priorityRow}>
              <Pressable
                style={[
                  styles.priorityBtn,
                  prioridad === "normal" && styles.priorityBtnActive,
                ]}
                onPress={() => setPrioridad("normal")}
              >
                <Text
                  style={[
                    styles.priorityText,
                    prioridad === "normal" && styles.priorityTextActive,
                  ]}
                >
                  Normal
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.priorityBtn,
                  prioridad === "urgente" && styles.priorityBtnUrgent,
                ]}
                onPress={() => setPrioridad("urgente")}
              >
                <Text
                  style={[
                    styles.priorityText,
                    prioridad === "urgente" && styles.priorityTextActive,
                  ]}
                >
                  Urgente
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.confirmButton,
                registrando && styles.confirmButtonDisabled,
              ]}
              onPress={confirmarLlegada}
              disabled={registrando}
            >
              {registrando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirmar llegada
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalLlegada(false)}
              disabled={registrando}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 🔹 MODAL DE ELIMINAR */}

      <Modal
        visible={modalEliminar}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEliminar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.deleteIconContainer}>
              <Text style={styles.deleteIconText}>🗑</Text>
            </View>

            <Text style={styles.modalTitle}>Eliminar cita</Text>

            <Text style={styles.modalSubtitle}>
              ¿Estás seguro de eliminar la cita #{citaAEliminar?.id_PK}?
            </Text>

            <Text style={styles.deleteWarning}>
              Esta acción no se puede deshacer.
            </Text>

            <Pressable
              style={[
                styles.deleteConfirmButton,
                eliminando && styles.confirmButtonDisabled,
              ]}
              onPress={confirmarEliminar}
              disabled={eliminando}
            >
              {eliminando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteConfirmText}>
                  Sí, eliminar cita
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalEliminar(false)}
              disabled={eliminando}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    flexWrap: "wrap",
    gap: 12,
  },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: { fontSize: 30, fontWeight: "900", color: "#173F3A" },

  subtitle: { fontSize: 13, color: "#82938F", marginTop: 5 },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  waitingButton: {
    backgroundColor: "#E7F5F2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  waitingButtonText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "800",
  },

  newAppointmentButton: {
    backgroundColor: "#247F76",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  newAppointmentText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#DCE8E4",
  },

  searchIcon: { fontSize: 16, marginRight: 8 },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#173F3A",
  },

  clearButton: { padding: 6 },

  clearButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#82938F",
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

  citaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  citaCardAtendida: {
    backgroundColor: "#F0FAF7",
    borderColor: "#A8D9D0",
  },

  citaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  citaTitle: { fontSize: 15, fontWeight: "800", color: "#26443F" },

  citaDate: { fontSize: 12, color: "#82938F", marginTop: 4 },

  status: {
    backgroundColor: "#E2F4F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  statusText: { fontSize: 11, fontWeight: "700", color: "#247F76" },

  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFF0EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D65A5A",
  },

  deleteButtonText: { fontSize: 20 },

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

  arrivalButton: {
    marginTop: 14,
    backgroundColor: "#247F76",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },

  arrivalButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  registeredBanner: {
    marginTop: 14,
    backgroundColor: "#E7F5F2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  registeredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 6,
  },

  registeredText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#247F76",
    letterSpacing: 1,
  },

  registeredEstado: {
    fontSize: 11,
    fontWeight: "800",
    color: "#31534D",
  },

  registeredEstadoLlamado: { color: "#C77C0A" },

  registeredInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },

  registeredInfo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#31534D",
  },

  registeredInfoLabel: { color: "#82938F", fontWeight: "700" },

  registeredNote: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#C7EAE0",
  },

  registeredNoteText: {
    fontSize: 11,
    color: "#48605B",
    fontWeight: "600",
    marginBottom: 3,
  },

  attendedBanner: {
    marginTop: 14,
    backgroundColor: "#D5EFEB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "#247F76",
  },

  attendedBannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#17685F",
    letterSpacing: 1,
    marginBottom: 10,
  },

  attendedInfo: {
    fontSize: 12,
    fontWeight: "800",
    color: "#17685F",
  },

  attendedNote: {
    fontSize: 11,
    color: "#31534D",
    fontWeight: "600",
    marginTop: 6,
  },

  // MODALES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 35, 32, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 26,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#173F3A",
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#82938F",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#31534D",
    marginBottom: 8,
  },

  priorityRow: { flexDirection: "row", gap: 10, marginBottom: 20 },

  priorityBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE8E4",
    alignItems: "center",
  },

  priorityBtnActive: {
    backgroundColor: "#E7F5F2",
    borderColor: "#247F76",
  },

  priorityBtnUrgent: {
    backgroundColor: "#FFF0EF",
    borderColor: "#D65A5A",
  },

  priorityText: { fontSize: 14, fontWeight: "700", color: "#58716C" },

  priorityTextActive: { color: "#173F3A" },

  confirmButton: {
    backgroundColor: "#247F76",
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },

  confirmButtonDisabled: { opacity: 0.65 },

  confirmButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  cancelButton: { paddingVertical: 14, alignItems: "center" },

  cancelButtonText: { color: "#647572", fontSize: 14, fontWeight: "700" },

  // ICONO DE ELIMINAR
  deleteIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF0EF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#D65A5A",
  },

  deleteIconText: { fontSize: 32 },

  deleteWarning: {
    fontSize: 13,
    color: "#D65A5A",
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 20,
    marginTop: 8,
  },

  deleteConfirmButton: {
    backgroundColor: "#D65A5A",
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
  },

  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});