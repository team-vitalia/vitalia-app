import { router } from "expo-router";
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
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Paciente {
  id_PK: number;
  nombre: string;
  apellido: string;
}

interface Doctor {
  id_PK: number;
  nombre: string;
  especialidad: string;
  estado: string;
}

export default function CrearCita() {
  const { token } = useAuth();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);

  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);

  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarPacientes, setMostrarPacientes] = useState(false);
  const [mostrarDoctores, setMostrarDoctores] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    if (!token) return;

    try {
      setCargando(true);

      const [respuestaPacientes, respuestaDoctores] =
        await Promise.all([
          api.get("/api/pacientes/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          api.get("/api/doctores/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      setPacientes(respuestaPacientes.data);
      setDoctores(respuestaDoctores.data);
    } catch (error: any) {
      console.error("Error cargando datos:", error);

      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          "No fue posible cargar pacientes y doctores."
      );
    } finally {
      setCargando(false);
    }
  };

  const crearCita = async () => {
    if (!token) {
      Alert.alert("Error", "No hay sesión activa.");
      return;
    }

    if (!pacienteId) {
      Alert.alert("Falta información", "Selecciona un paciente.");
      return;
    }

    if (!doctorId) {
      Alert.alert("Falta información", "Selecciona un doctor.");
      return;
    }

    if (!fecha.trim()) {
      Alert.alert("Falta información", "Ingresa la fecha.");
      return;
    }

    if (!horaInicio.trim()) {
      Alert.alert("Falta información", "Ingresa la hora de inicio.");
      return;
    }

    if (!horaFin.trim()) {
      Alert.alert("Falta información", "Ingresa la hora de fin.");
      return;
    }

    try {
      setGuardando(true);

      await api.post(
        "/api/citas/",
        {
          paciente_id_FK: pacienteId,
          doctor_id_FK: doctorId,
          fecha: fecha.trim(),
          hora_inicio: horaInicio.trim(),
          hora_fin: horaFin.trim(),
          estado: "programada",
          motivo: motivo.trim() || null,
          notas: notas.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "Cita creada",
        "La cita se registró correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => router.replace("/recepcion/citas"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creando cita:", error);

      Alert.alert(
        "Error",
        error?.response?.data?.detail ||
          "No fue posible crear la cita."
      );
    } finally {
      setGuardando(false);
    }
  };

  const pacienteSeleccionado = pacientes.find(
    (paciente) => paciente.id_PK === pacienteId
  );

  const doctorSeleccionado = doctores.find(
    (doctor) => doctor.id_PK === doctorId
  );

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#2A8C82" />
        <Text style={styles.textoCargando}>
          Cargando información...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.encabezado}>
        <Pressable
          style={styles.botonRegresar}
          onPress={() => router.back()}
        >
          <Text style={styles.textoRegresar}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.titulo}>Nueva cita</Text>
          <Text style={styles.subtitulo}>
            Registra una nueva cita médica
          </Text>
        </View>
      </View>

      {/* PACIENTE */}
      <View style={styles.seccion}>
        <Text style={styles.etiqueta}>Paciente *</Text>

        <Pressable
          style={styles.selector}
          onPress={() => {
            setMostrarPacientes(!mostrarPacientes);
            setMostrarDoctores(false);
          }}
        >
          <Text
            style={
              pacienteSeleccionado
                ? styles.textoSelector
                : styles.placeholder
            }
          >
            {pacienteSeleccionado
              ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`
              : "Selecciona un paciente"}
          </Text>

          <Text style={styles.flecha}>⌄</Text>
        </Pressable>

        {mostrarPacientes && (
          <View style={styles.lista}>
            {pacientes.length === 0 ? (
              <Text style={styles.listaVacia}>
                No hay pacientes registrados.
              </Text>
            ) : (
              pacientes.map((paciente) => (
                <Pressable
                  key={paciente.id_PK}
                  style={styles.opcion}
                  onPress={() => {
                    setPacienteId(paciente.id_PK);
                    setMostrarPacientes(false);
                  }}
                >
                  <Text style={styles.opcionNombre}>
                    {paciente.nombre} {paciente.apellido}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* DOCTOR */}
      <View style={styles.seccion}>
        <Text style={styles.etiqueta}>Doctor *</Text>

        <Pressable
          style={styles.selector}
          onPress={() => {
            setMostrarDoctores(!mostrarDoctores);
            setMostrarPacientes(false);
          }}
        >
          <Text
            style={
              doctorSeleccionado
                ? styles.textoSelector
                : styles.placeholder
            }
          >
            {doctorSeleccionado
              ? `${doctorSeleccionado.nombre} — ${doctorSeleccionado.especialidad}`
              : "Selecciona un doctor"}
          </Text>

          <Text style={styles.flecha}>⌄</Text>
        </Pressable>

        {mostrarDoctores && (
          <View style={styles.lista}>
            {doctores.length === 0 ? (
              <Text style={styles.listaVacia}>
                No hay doctores registrados.
              </Text>
            ) : (
              doctores.map((doctor) => (
                <Pressable
                  key={doctor.id_PK}
                  style={styles.opcion}
                  onPress={() => {
                    setDoctorId(doctor.id_PK);
                    setMostrarDoctores(false);
                  }}
                >
                  <Text style={styles.opcionNombre}>
                    {doctor.nombre}
                  </Text>

                  <Text style={styles.opcionDetalle}>
                    {doctor.especialidad}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* FECHA */}
      <View style={styles.seccion}>
        <Text style={styles.etiqueta}>Fecha *</Text>

        <TextInput
          style={styles.input}
          value={fecha}
          onChangeText={setFecha}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8A9A98"
          maxLength={10}
        />

        <Text style={styles.ayuda}>
          Ejemplo: 2026-10-05
        </Text>
      </View>

      {/* HORARIOS */}
      <View style={styles.fila}>
        <View style={styles.campoMitad}>
          <Text style={styles.etiqueta}>Hora inicio *</Text>

          <TextInput
            style={styles.input}
            value={horaInicio}
            onChangeText={setHoraInicio}
            placeholder="10:00"
            placeholderTextColor="#8A9A98"
            maxLength={5}
          />
        </View>

        <View style={styles.campoMitad}>
          <Text style={styles.etiqueta}>Hora fin *</Text>

          <TextInput
            style={styles.input}
            value={horaFin}
            onChangeText={setHoraFin}
            placeholder="10:30"
            placeholderTextColor="#8A9A98"
            maxLength={5}
          />
        </View>
      </View>

      {/* MOTIVO */}
      <View style={styles.seccion}>
        <Text style={styles.etiqueta}>Motivo de consulta</Text>

        <TextInput
          style={styles.input}
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Consulta general"
          placeholderTextColor="#8A9A98"
        />
      </View>

      {/* NOTAS */}
      <View style={styles.seccion}>
        <Text style={styles.etiqueta}>Notas</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Información adicional..."
          placeholderTextColor="#8A9A98"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* BOTÓN */}
      <Pressable
        style={({ pressed }) => [
          styles.botonCrear,
          pressed && styles.botonPresionado,
          guardando && styles.botonDeshabilitado,
        ]}
        onPress={crearCita}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.textoBoton}>
            Crear cita
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.botonCancelar}
        onPress={() => router.back()}
        disabled={guardando}
      >
        <Text style={styles.textoCancelar}>
          Cancelar
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8F7",
  },

  contenido: {
    padding: 24,
    paddingBottom: 50,
  },

  cargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8F7",
  },

  textoCargando: {
    marginTop: 12,
    color: "#5F716E",
    fontSize: 15,
  },

  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  botonRegresar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    elevation: 2,
  },

  textoRegresar: {
    fontSize: 32,
    color: "#2A8C82",
    lineHeight: 34,
  },

  titulo: {
    fontSize: 27,
    fontWeight: "700",
    color: "#193D39",
  },

  subtitulo: {
    marginTop: 4,
    fontSize: 14,
    color: "#71817F",
  },

  seccion: {
    marginBottom: 20,
  },

  etiqueta: {
    fontSize: 14,
    fontWeight: "600",
    color: "#294B47",
    marginBottom: 8,
  },

  selector: {
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  textoSelector: {
    color: "#294B47",
    fontSize: 15,
    flex: 1,
  },

  placeholder: {
    color: "#8A9A98",
    fontSize: 15,
    flex: 1,
  },

  flecha: {
    fontSize: 22,
    color: "#2A8C82",
    marginLeft: 10,
  },

  lista: {
    marginTop: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    overflow: "hidden",
  },

  opcion: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F1",
  },

  opcionNombre: {
    fontSize: 15,
    fontWeight: "600",
    color: "#294B47",
  },

  opcionDetalle: {
    marginTop: 3,
    fontSize: 13,
    color: "#71817F",
  },

  listaVacia: {
    padding: 16,
    color: "#71817F",
    textAlign: "center",
  },

  input: {
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#294B47",
  },

  ayuda: {
    marginTop: 6,
    fontSize: 12,
    color: "#81908E",
  },

  fila: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },

  campoMitad: {
    flex: 1,
  },

  textArea: {
    minHeight: 110,
    paddingTop: 14,
  },

  botonCrear: {
    height: 54,
    borderRadius: 13,
    backgroundColor: "#2A8C82",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    elevation: 2,
  },

  botonPresionado: {
    backgroundColor: "#247F76",
  },

  botonDeshabilitado: {
    opacity: 0.65,
  },

  textoBoton: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  botonCancelar: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  textoCancelar: {
    color: "#647572",
    fontSize: 15,
    fontWeight: "600",
  },
});