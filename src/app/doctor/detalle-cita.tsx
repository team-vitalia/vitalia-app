import { FontAwesome } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
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

interface CitaDetalle {
  id_PK: number;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string | null;
  motivo: string | null;
  notas: string | null;
  paciente: {
    id_PK: number;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string | null;
    telefono?: string | null;
    alergias?: { nombre: string; severidad?: string }[];
  } | null;
}

interface DoctorDisponible {
  id_PK: number;
  nombre: string;
  especialidades: { nombre: string }[];
}

export default function DetalleCitaScreen() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [cita, setCita] = useState<CitaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  
  const [modalVisible, setModalVisible] = useState(false);
  const [doctores, setDoctores] = useState<DoctorDisponible[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoDoctores, setCargandoDoctores] = useState(false);

  const cargarDetalle = async () => {
    if (!token || !id) return;
    try {
      setCargando(true);
      setError("");
      const response = await api.get<CitaDetalle>(`/api/citas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCita(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "No se pudo cargar el detalle de la cita.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDetalle();
  }, [id, token]);

  // FUNCIÓN CORREGIDA IGUAL A LA DE CONSULTAS
  const terminarCita = async () => {
    const ejecutarTerminar = async () => {
      try {
        await api.put(
          `/api/citas/${id}/estado?nuevo_estado=completada`, 
          {}, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Éxito: La cita ha sido completada.");
        router.replace("/doctor/consultas");
      } catch (e: any) {
        alert("Error: " + (e?.response?.data?.detail || "No se pudo terminar la cita."));
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm("¿Estás seguro de que deseas marcar esta cita como completada?")) {
        ejecutarTerminar();
      }
    } else {
      Alert.alert("Terminar Cita", "¿Estás seguro de que deseas marcar esta cita como completada?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, terminar", onPress: ejecutarTerminar },
      ]);
    }
  };

  const abrirModalReasignar = async () => {
    setModalVisible(true);
    setCargandoDoctores(true);
    try {
      const res = await api.get<DoctorDisponible[]>("/api/doctores/lista-para-transferir", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctores(res.data);
    } catch (e: any) {
      console.log("Error cargando doctores:", e?.response?.data);
      Alert.alert("Error", "No se pudieron cargar los doctores.");
    } finally {
      setCargandoDoctores(false);
    }
  };

  const reasignarADoctor = async (nuevoDoctorId: number) => {
    try {
      await api.put(`/api/citas/${id}/reasignar?nuevo_doctor_id=${nuevoDoctorId}`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setModalVisible(false);
      alert("Éxito: La cita ha sido reasignada correctamente.");
      router.replace("/doctor/consultas");
    } catch (e: any) {
      console.log("Error backend:", e?.response?.data);
      alert("Error: " + (e?.response?.data?.detail || "No se pudo reasignar la cita."));
    }
  };

  const doctoresFiltrados = doctores.filter(d => 
    d.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    d.especialidades.some(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return "Sin fecha";
    try {
      const d = new Date(fecha + "T00:00:00");
      return d.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch {
      return fecha;
    }
  };

  const calcularEdad = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento) return "No registrada";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return `${edad} años`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/doctor/consultas")}>
          <FontAwesome name="arrow-left" size={13} color="#247F76" style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Volver a la agenda</Text>
        </Pressable>
      </View>

      <Text style={styles.smallTitle}>EXPEDIENTE CLÍNICO</Text>
      <Text style={styles.title}>Detalle de la Consulta</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarDetalle}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : cita ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}><FontAwesome name="user" size={20} color="#247F76" /></View>
              <View>
                <Text style={styles.cardTitle}>Datos del Paciente</Text>
                <Text style={styles.cardSubtitle}>Información general</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre completo:</Text>
              <Text style={styles.infoValue}>{cita.paciente ? `${cita.paciente.nombre} ${cita.paciente.apellido}` : "Paciente no asignado"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Edad:</Text>
              <Text style={styles.infoValue}>{calcularEdad(cita.paciente?.fecha_nacimiento)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{cita.paciente?.telefono || "No registrado"}</Text>
            </View>
            <View style={styles.alergiasContainer}>
              <View style={styles.alergiasHeader}>
                <FontAwesome name="exclamation-triangle" size={14} color="#D65A5A" />
                <Text style={styles.alergiasTitle}>Alergias Registradas</Text>
              </View>
              {cita.paciente?.alergias && cita.paciente.alergias.length > 0 ? (
                <View style={styles.alergiasList}>
                  {cita.paciente.alergias.map((alergia, index) => (
                    <View key={index} style={styles.alergiaBadge}>
                      <Text style={styles.alergiaText}>{alergia.nombre} {alergia.severidad ? `(${alergia.severidad})` : ""}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noAlergiasText}>Sin alergias registradas.</Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}><FontAwesome name="calendar-check-o" size={20} color="#247F76" /></View>
              <View>
                <Text style={styles.cardTitle}>Detalles de la Cita</Text>
                <Text style={styles.cardSubtitle}>Cita #{cita.id_PK}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Fecha:</Text><Text style={styles.infoValue}>{formatearFecha(cita.fecha)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Horario:</Text><Text style={styles.infoValue}>{cita.hora_inicio || "—"} - {cita.hora_fin || "—"}</Text></View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={[styles.infoValue, { textTransform: "capitalize", fontWeight: "700", color: "#247F76" }]}>{cita.estado || "Desconocido"}</Text>
            </View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Motivo:</Text><Text style={styles.infoValue}>{cita.motivo || "No especificado"}</Text></View>
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notas / Historial:</Text>
              <Text style={styles.notesText}>{cita.notas || "No hay notas adicionales para esta cita."}</Text>
            </View>
          </View>

          {cita.estado !== "completada" && cita.estado !== "atendida" && (
            <View style={styles.actionContainer}>
              <Pressable style={[styles.actionButton, styles.buttonTransfer]} onPress={abrirModalReasignar}>
                <FontAwesome name="exchange" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Pasar a otro Doctor</Text>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.buttonFinish]} onPress={terminarCita}>
                <FontAwesome name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Terminar Consulta</Text>
              </Pressable>
            </View>
          )}

          <Modal visible={modalVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Pasar Cita a otro Doctor</Text>
                  <Pressable onPress={() => setModalVisible(false)}>
                    <FontAwesome name="close" size={20} color="#173F3A" />
                  </Pressable>
                </View>
                
                <View style={styles.searchContainer}>
                  <FontAwesome name="search" size={14} color="#82938F" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o especialidad..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                  />
                </View>

                {cargandoDoctores ? (
                  <ActivityIndicator size="large" color="#247F76" style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={doctoresFiltrados}
                    keyExtractor={(item) => item.id_PK.toString()}
                    renderItem={({ item }) => (
                      <Pressable style={styles.doctorItem} onPress={() => reasignarADoctor(item.id_PK)}>
                        <View>
                          <Text style={styles.doctorName}>Dr. {item.nombre}</Text>
                          <Text style={styles.doctorSpecialty}>
                            {item.especialidades.map(e => e.nombre).join(", ") || "General"}
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#247F76" />
                      </Pressable>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron doctores.</Text>}
                  />
                )}
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FAF8" },
  content: { padding: 30, paddingBottom: 50, maxWidth: 1100, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#DCEAE6" },
  backText: { color: "#247F76", fontSize: 13, fontWeight: "800" },
  smallTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#2A8C82", marginBottom: 5 },
  title: { fontSize: 30, fontWeight: "900", color: "#173F3A", marginBottom: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#CCE4DD", marginBottom: 20 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E7F5F2", justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#173F3A" },
  cardSubtitle: { fontSize: 12, color: "#82938F", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E8F0EE", marginBottom: 15 },
  infoRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  infoLabel: { width: 130, fontSize: 13, fontWeight: "800", color: "#31534D" },
  infoValue: { flex: 1, fontSize: 13, color: "#4A5D59" },
  alergiasContainer: { marginTop: 10, padding: 15, backgroundColor: "#FFF7F7", borderRadius: 12, borderWidth: 1, borderColor: "#FCE3E3" },
  alergiasHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  alergiasTitle: { fontSize: 13, fontWeight: "800", color: "#D65A5A", marginLeft: 6 },
  alergiasList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alergiaBadge: { backgroundColor: "#FAD4D4", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  alergiaText: { fontSize: 12, color: "#A33B3B", fontWeight: "700" },
  noAlergiasText: { fontSize: 12, color: "#8A9A98", fontStyle: "italic" },
  notesContainer: { marginTop: 15, backgroundColor: "#F8FAFA", padding: 15, borderRadius: 12 },
  notesLabel: { fontSize: 12, fontWeight: "800", color: "#31534D", marginBottom: 5 },
  notesText: { fontSize: 13, color: "#5C706C", lineHeight: 20 },
  center: { alignItems: "center", paddingVertical: 50 },
  loadingText: { marginTop: 12, color: "#82938F", fontSize: 13 },
  errorCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 25, borderWidth: 1, borderColor: "#E4EEEB" },
  errorTitle: { fontSize: 15, fontWeight: "800", color: "#8A4B4B" },
  errorText: { fontSize: 12, color: "#879691", marginTop: 6 },
  retryButton: { marginTop: 18, backgroundColor: "#247F76", paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, alignSelf: "flex-start" },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  actionContainer: { flexDirection: "row", gap: 12, marginTop: 10 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 },
  actionButtonText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  buttonTransfer: { backgroundColor: "#E5A13A" },
  buttonFinish: { backgroundColor: "#D65A5A" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#173F3A" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F4FAF8", borderRadius: 10, paddingHorizontal: 12, height: 45, marginBottom: 15 },
  searchInput: { flex: 1, fontSize: 14, color: "#173F3A" },
  doctorItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E8F0EE" },
  doctorName: { fontSize: 14, fontWeight: "700", color: "#173F3A" },
  doctorSpecialty: { fontSize: 12, color: "#82938F", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#82938F", marginTop: 20, fontSize: 13 },
});