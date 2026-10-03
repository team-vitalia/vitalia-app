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
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

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

export default function CitasScreen() {
  const { token } = useAuth();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarCitas = async () => {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/api/citas/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCitas(respuesta.data);
    } catch (error: any) {
      console.log(
        "ERROR CITAS:",
        error?.response?.status,
        error?.response?.data
      );

      setError(
        error?.response?.data?.detail ||
          "No se pudieron cargar las citas."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarCitas();
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
        <View>
            <Text style={styles.smallTitle}>
            RECEPCIÓN
            </Text>

            <Text style={styles.title}>
            Citas
            </Text>

            <Text style={styles.subtitle}>
            Consulta las citas programadas.
            </Text>
        </View>

        <View style={styles.headerActions}>
            <Pressable
            style={styles.newAppointmentButton}
            onPress={() => router.push("/recepcion/citas/crear")}
            >
            <Text style={styles.newAppointmentText}>
                + Nueva cita
            </Text>
            </Pressable>

            <View style={styles.iconCircle}>
            <Text style={styles.icon}>
                ◷
            </Text>
            </View>
        </View>
        </View>

      {/* RESUMEN */}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>
          {citas.length}
        </Text>

        <Text style={styles.summaryText}>
          Citas registradas
        </Text>
      </View>

      {/* CONTENIDO */}

      <Text style={styles.sectionTitle}>
        Agenda
      </Text>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#247F76"
          />

          <Text style={styles.loadingText}>
            Cargando citas...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            No se pudieron cargar las citas
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={cargarCitas}
          >
            <Text style={styles.retryText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : citas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>
            ◷
          </Text>

          <Text style={styles.emptyTitle}>
            No hay citas registradas
          </Text>

          <Text style={styles.emptyText}>
            Cuando se registren citas aparecerán
            aquí.
          </Text>
        </View>
      ) : (
        citas.map((cita) => (
          <View
            key={cita.id_PK}
            style={styles.citaCard}
          >
            <View style={styles.citaHeader}>
              <View>
                <Text style={styles.citaTitle}>
                  Cita #{cita.id_PK}
                </Text>

                <Text style={styles.citaDate}>
                  {cita.fecha || "Sin fecha"}
                </Text>
              </View>

              <View style={styles.status}>
                <Text style={styles.statusText}>
                  {cita.estado || "Sin estado"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>
                Paciente:
              </Text>{" "}
              #{cita.paciente_id_FK ?? "—"}
            </Text>

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>
                Doctor:
              </Text>{" "}
              #{cita.doctor_id_FK ?? "—"}
            </Text>

            <Text style={styles.detail}>
              <Text style={styles.detailLabel}>
                Horario:
              </Text>{" "}
              {cita.hora_inicio || "—"} -{" "}
              {cita.hora_fin || "—"}
            </Text>

            {cita.motivo && (
              <Text style={styles.detail}>
                <Text style={styles.detailLabel}>
                  Motivo:
                </Text>{" "}
                {cita.motivo}
              </Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

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
  },

  smallTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#173F3A",
  },

  subtitle: {
    fontSize: 13,
    color: "#82938F",
    marginTop: 5,
  },

  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    fontSize: 25,
    color: "#247F76",
    fontWeight: "800",
  },

  summaryCard: {
    backgroundColor: "#247F76",
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
  },

  summaryNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  summaryText: {
    fontSize: 13,
    color: "#DCEFEB",
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 14,
  },

  center: {
    alignItems: "center",
    paddingVertical: 50,
  },

  loadingText: {
    marginTop: 12,
    color: "#82938F",
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },

  emptyIcon: {
    fontSize: 35,
    color: "#247F76",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#26443F",
  },

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

  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A4B4B",
  },

  errorText: {
    fontSize: 12,
    color: "#879691",
    marginTop: 6,
  },

  retryButton: {
    marginTop: 18,
    backgroundColor: "#247F76",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
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

  citaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#26443F",
  },

  citaDate: {
    fontSize: 12,
    color: "#82938F",
    marginTop: 4,
  },

  status: {
    backgroundColor: "#E2F4F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#247F76",
  },

  divider: {
    height: 1,
    backgroundColor: "#E8F0EE",
    marginVertical: 14,
  },

  detail: {
    fontSize: 12,
    color: "#667874",
    marginBottom: 6,
  },

  detailLabel: {
    fontWeight: "800",
    color: "#31534D",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    },

    newAppointmentButton: {
    backgroundColor: "#247F76",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    },

    newAppointmentText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    },
});