import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import {
    actualizarCola,
    Cola,
    listarColasActivas,
} from "../../../services/colasService";

export default function ListaEsperaScreen() {
  const { token } = useAuth();

  const [colas, setColas] = useState<Cola[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState<number | null>(null);

  // Estado para el consultorio
  const [consultorio, setConsultorio] = useState("");
  const [colaSeleccionada, setColaSeleccionada] = useState<number | null>(null);

  const cargarColas = async () => {
    if (!token) return;

    try {
      setCargando(true);
      setError("");

      // 🔹 Solo colas activas (en_espera o llamado)
      const data = await listarColasActivas(token);
      setColas(data);
    } catch (err: any) {
      console.log("ERROR COLAS:", err?.response?.status, err?.response?.data);

      setError(
        err?.response?.data?.detail ||
          "No se pudo cargar la lista de espera."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarColas();
    }
  }, [token]);

  const abrirModalLlamar = (colaId: number) => {
    setColaSeleccionada(colaId);
    setConsultorio("");
  };

  const llamarPaciente = async () => {
    if (!token || !colaSeleccionada) return;

    if (!consultorio.trim()) {
      Alert.alert(
        "Consultorio obligatorio",
        "Escribe el número de consultorio antes de llamar al paciente."
      );
      return;
    }

    try {
      setActualizando(colaSeleccionada);

      await actualizarCola(colaSeleccionada, token, {
        estado: "llamado",
        numero_consultorio: consultorio.trim(),
      });

      setColaSeleccionada(null);
      setConsultorio("");
      await cargarColas();
    } catch (err: any) {
      console.log("Error al llamar paciente:", err?.response?.data);
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo llamar al paciente."
      );
    } finally {
      setActualizando(null);
    }
  };

  const finalizarAtencion = async (colaId: number) => {
    if (!token) return;

    try {
      setActualizando(colaId);

      await actualizarCola(colaId, token, {
        estado: "atendido",
      });

      await cargarColas();
    } catch (err: any) {
      console.log("Error al finalizar:", err?.response?.data);
    } finally {
      setActualizando(null);
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
          <Text style={styles.title}>Lista de espera</Text>
          <Text style={styles.subtitle}>
            Pacientes en cola para ser atendidos.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/recepcion/cola/atendidas")}
          >
            <Text style={styles.historyButtonText}>
              ✓ Ver Citas atendidas
            </Text>
          </Pressable>

          <Pressable
            style={styles.historyButton}
            onPress={() => router.push("/recepcion/citas")}
          >
            <Text style={styles.historyButtonText}>
              ✓ Ver Citas
            </Text>
          </Pressable>

          <Pressable style={styles.refreshButton} onPress={cargarColas}>
            <Text style={styles.refreshText}>↻</Text>
          </Pressable>
        </View>
      </View>

      {/* RESUMEN */}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{colas.length}</Text>
        <Text style={styles.summaryText}>Pacientes en espera</Text>
      </View>

      {/* CONTENIDO */}

      <Text style={styles.sectionTitle}>Turnos activos</Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Cargando lista...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={cargarColas}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : colas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>No hay pacientes en espera</Text>
          <Text style={styles.emptyText}>
            Cuando registres la llegada de un paciente, aparecerá aquí.
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

              <View
                style={[
                  styles.status,
                  cola.estado === "llamado" && styles.statusLlamado,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    cola.estado === "llamado" && styles.statusTextLlamado,
                  ]}
                >
                  {cola.estado || "en_espera"}
                </Text>
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

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>Hora de registro:</Text>{" "}
              {cola.hora_registro
                ? new Date(cola.hora_registro).toLocaleTimeString()
                : "—"}
            </Text>

            {cola.numero_consultorio && (
              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>Consultorio:</Text>{" "}
                {cola.numero_consultorio}
              </Text>
            )}

            {/* BOTONES DE ACCIÓN */}

            <View style={styles.actionsRow}>
              {cola.estado === "en_espera" && colaSeleccionada !== cola.id_PK && (
                <Pressable
                  style={styles.callButton}
                  onPress={() => abrirModalLlamar(cola.id_PK)}
                  disabled={actualizando === cola.id_PK}
                >
                  <Text style={styles.callButtonText}>Llamar paciente</Text>
                </Pressable>
              )}

              {colaSeleccionada === cola.id_PK && (
                <View style={styles.consultorioBox}>
                  <Text style={styles.consultorioLabel}>
                    Número de consultorio
                  </Text>
                  <TextInput
                    style={styles.consultorioInput}
                    value={consultorio}
                    onChangeText={setConsultorio}
                    placeholder="Ej. 1"
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <View style={styles.consultorioActions}>
                    <Pressable
                      style={styles.confirmCallButton}
                      onPress={llamarPaciente}
                      disabled={actualizando === cola.id_PK}
                    >
                      {actualizando === cola.id_PK ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.confirmCallText}>
                          Confirmar llamada
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={styles.cancelCallButton}
                      onPress={() => setColaSeleccionada(null)}
                      disabled={actualizando === cola.id_PK}
                    >
                      <Text style={styles.cancelCallText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {cola.estado === "llamado" && (
                <Pressable
                  style={styles.finishButton}
                  onPress={() => finalizarAtencion(cola.id_PK)}
                  disabled={actualizando === cola.id_PK}
                >
                  {actualizando === cola.id_PK ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.finishButtonText}>
                      Finalizar atención
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
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
    marginBottom: 25,
    flexWrap: "wrap",
    gap: 12,
  },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: { fontSize: 30, fontWeight: "900", color: "#173F3A" },

  subtitle: { fontSize: 13, color: "#82938F", marginTop: 5 },

  historyButton: {
    backgroundColor: "#E7F5F2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  historyButtonText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "800",
  },

  refreshButton: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },

  refreshText: { fontSize: 25, color: "#247F76", fontWeight: "800" },

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

  colaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  colaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  turnoBox: {
    backgroundColor: "#E7F5F2",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },

  turnoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#247F76",
    letterSpacing: 1,
  },

  turnoNumero: {
    fontSize: 22,
    fontWeight: "900",
    color: "#173F3A",
    marginTop: 2,
  },

  status: {
    backgroundColor: "#E2F4F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  statusLlamado: { backgroundColor: "#FFF5E5" },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#247F76",
    textTransform: "capitalize",
  },

  statusTextLlamado: { color: "#C77C0A" },

  divider: {
    height: 1,
    backgroundColor: "#E8F0EE",
    marginVertical: 14,
  },

  detail: { fontSize: 12, color: "#667874", marginBottom: 6 },

  detailLabel: { fontWeight: "800", color: "#31534D" },

  actionsRow: { marginTop: 14 },

  callButton: {
    backgroundColor: "#247F76",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  callButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  consultorioBox: {
    backgroundColor: "#F0F8F6",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#247F76",
  },

  consultorioLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#31534D",
    marginBottom: 8,
  },

  consultorioInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8E4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#173F3A",
  },

  consultorioActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  confirmCallButton: {
    flex: 1,
    backgroundColor: "#247F76",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },

  confirmCallText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  cancelCallButton: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  cancelCallText: {
    color: "#647572",
    fontSize: 13,
    fontWeight: "700",
  },

  finishButton: {
    backgroundColor: "#C77C0A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  finishButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});