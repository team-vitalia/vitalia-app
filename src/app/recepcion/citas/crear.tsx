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
import { FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import SelectorFecha from "../../../components/SelectorFecha";
import SelectorHora from "../../../components/SelectorHora";

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
  const { token, usuario, cargando: cargandoAuth } = useAuth();
  const rolId = usuario?.rol_id ?? usuario?.rol_id_FK;

  const hoy = new Date().toISOString().split("T")[0];

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);

  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);

  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");

  const [errores, setErrores] = useState<Record<string, string>>({});
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

      const [respuestaPacientes, respuestaDoctores] = await Promise.all([
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
        error?.response?.data?.detail || "No fue posible cargar pacientes y doctores."
      );
    } finally {
      setCargando(false);
    }
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!pacienteId) {
      nuevosErrores.paciente = "Selecciona un paciente de la lista.";
    }

    if (!doctorId) {
      nuevosErrores.doctor = "Selecciona un doctor para la atención médica.";
    }

    if (!fecha.trim()) {
      nuevosErrores.fecha = "Selecciona la fecha programada.";
    } else if (fecha.trim() < hoy) {
      nuevosErrores.fecha = "La fecha no puede ser anterior a hoy.";
    }

    const patronHora = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!horaInicio.trim()) {
      nuevosErrores.horaInicio = "Ingresa la hora de inicio.";
    } else if (!patronHora.test(horaInicio.trim())) {
      nuevosErrores.horaInicio = "Formato inválido (HH:MM).";
    }

    if (!horaFin.trim()) {
      nuevosErrores.horaFin = "Ingresa la hora de fin.";
    } else if (!patronHora.test(horaFin.trim())) {
      nuevosErrores.horaFin = "Formato inválido (HH:MM).";
    } else if (horaInicio.trim() && horaFin.trim() <= horaInicio.trim()) {
      nuevosErrores.horaFin = "La hora de fin debe ser posterior a la de inicio.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const crearCita = async () => {
    if (!token) {
      Alert.alert("Error", "No hay sesión activa.");
      return;
    }

    if (!validarFormulario()) {
      Alert.alert("Formulario incompleto", "Por favor revisa los campos señalados.");
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
        "La cita se registró y sincronizó correctamente.",
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
        error?.response?.data?.detail || "No fue posible crear la cita."
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
        <ActivityIndicator size="large" color="#247F76" />
        <Text style={styles.textoCargando}>Cargando información...</Text>
      </View>
    );
  }

  if (!cargandoAuth && rolId !== 4) {
    return (
      <View style={styles.deniedContainer}>
        <View style={styles.deniedCard}>
          <View style={styles.deniedIconBox}>
            <FontAwesome name="lock" size={32} color="#D65A5A" />
          </View>
          <Text style={styles.deniedTitle}>Acceso Restringido</Text>
          <Text style={styles.deniedSubtitle}>
            La programación de nuevas citas médicas está reservada exclusivamente para el personal con rol de Recepción.
          </Text>
          <Pressable
            style={styles.deniedButton}
            onPress={() => {
              if (rolId === 1) router.replace("/admin");
              else if (rolId === 2) router.replace("/doctor");
              else if (rolId === 3) router.replace("/paciente");
              else router.replace("/login");
            }}
          >
            <FontAwesome name="arrow-left" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.deniedButtonText}>Volver al Portal</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      <View style={styles.encabezado}>
        <Pressable
          style={styles.botonRegresar}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={14} color="#247F76" />
        </Pressable>

        <View>
          <Text style={styles.titulo}>Agendar Cita</Text>
          <Text style={styles.subtitulo}>
            Programa una nueva consulta médica vinculada a Google Calendar.
          </Text>
        </View>
      </View>

      <View style={styles.syncCard}>
        <FontAwesome name="info-circle" size={18} color="#247F76" style={styles.syncIcon} />
        <View style={styles.syncTextContainer}>
          <Text style={styles.syncTitle}>Sincronización en tiempo real</Text>
          <Text style={styles.syncDescription}>
            Al guardar, se agendará en la base de datos, se sincronizará con Google Calendar del doctor y se emitirán alertas en tiempo real.
          </Text>
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.labelRow}>
          <FontAwesome name="user" size={13} color="#247F76" style={styles.labelIcon} />
          <Text style={styles.etiqueta}>Paciente *</Text>
        </View>

        <Pressable
          style={[styles.selector, errores.paciente && styles.inputError]}
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

          <FontAwesome
            name={mostrarPacientes ? "chevron-up" : "chevron-down"}
            size={13}
            color="#247F76"
          />
        </Pressable>

        {errores.paciente && (
          <Text style={styles.errorTexto}>
            <FontAwesome name="exclamation-circle" size={11} color="#D32F2F" /> {errores.paciente}
          </Text>
        )}

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
                    setErrores((prev) => {
                      const copia = { ...prev };
                      delete copia.paciente;
                      return copia;
                    });
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

      <View style={styles.seccion}>
        <View style={styles.labelRow}>
          <FontAwesome name="user-md" size={14} color="#247F76" style={styles.labelIcon} />
          <Text style={styles.etiqueta}>Doctor *</Text>
        </View>

        <Pressable
          style={[styles.selector, errores.doctor && styles.inputError]}
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

          <FontAwesome
            name={mostrarDoctores ? "chevron-up" : "chevron-down"}
            size={13}
            color="#247F76"
          />
        </Pressable>

        {errores.doctor && (
          <Text style={styles.errorTexto}>
            <FontAwesome name="exclamation-circle" size={11} color="#D32F2F" /> {errores.doctor}
          </Text>
        )}

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
                    setErrores((prev) => {
                      const copia = { ...prev };
                      delete copia.doctor;
                      return copia;
                    });
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

      <View style={styles.seccion}>
        <View style={styles.labelRow}>
          <FontAwesome name="calendar" size={13} color="#247F76" style={styles.labelIcon} />
          <Text style={styles.etiqueta}>Fecha de la cita *</Text>
        </View>

        <SelectorFecha
          value={fecha}
          min={hoy}
          onChange={(nuevaFecha) => {
            setFecha(nuevaFecha);
            setErrores((prev) => {
              const copia = { ...prev };
              delete copia.fecha;
              return copia;
            });
          }}
          placeholder="Seleccionar fecha (AAAA-MM-DD)"
        />
        {errores.fecha ? (
          <Text style={styles.errorTexto}>
            <FontAwesome name="exclamation-circle" size={11} color="#D32F2F" /> {errores.fecha}
          </Text>
        ) : (
          <Text style={styles.ayuda}>
            Selecciona el día programado para la consulta.
          </Text>
        )}
      </View>

      <View style={styles.fila}>
        <View style={styles.campoMitad}>
          <View style={styles.labelRow}>
            <FontAwesome name="clock-o" size={13} color="#247F76" style={styles.labelIcon} />
            <Text style={styles.etiqueta}>Hora inicio *</Text>
          </View>

          <SelectorHora
            value={horaInicio}
            onChange={(nuevaHora) => {
              setHoraInicio(nuevaHora);
              setErrores((prev) => {
                const copia = { ...prev };
                delete copia.horaInicio;
                return copia;
              });
            }}
            placeholder="10:00"
          />

          {errores.horaInicio && (
            <Text style={styles.errorTexto}>
              <FontAwesome name="exclamation-circle" size={11} color="#D32F2F" /> {errores.horaInicio}
            </Text>
          )}
        </View>

        <View style={styles.campoMitad}>
          <View style={styles.labelRow}>
            <FontAwesome name="clock-o" size={13} color="#247F76" style={styles.labelIcon} />
            <Text style={styles.etiqueta}>Hora fin *</Text>
          </View>

          <SelectorHora
            value={horaFin}
            min={horaInicio || undefined}
            onChange={(nuevaHora) => {
              setHoraFin(nuevaHora);
              setErrores((prev) => {
                const copia = { ...prev };
                delete copia.horaFin;
                return copia;
              });
            }}
            placeholder="10:30"
          />

          {errores.horaFin && (
            <Text style={styles.errorTexto}>
              <FontAwesome name="exclamation-circle" size={11} color="#D32F2F" /> {errores.horaFin}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.labelRow}>
          <FontAwesome name="stethoscope" size={13} color="#247F76" style={styles.labelIcon} />
          <Text style={styles.etiqueta}>Motivo de consulta</Text>
        </View>

        <TextInput
          style={styles.input}
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ej. Chequeo preventivo, dolor lumbar..."
          placeholderTextColor="#8A9A98"
          maxLength={250}
        />
      </View>

      <View style={styles.seccion}>
        <View style={styles.labelRow}>
          <FontAwesome name="pencil-square-o" size={13} color="#247F76" style={styles.labelIcon} />
          <Text style={styles.etiqueta}>Notas adicionales</Text>
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Información adicional relevante para la consulta..."
          placeholderTextColor="#8A9A98"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
      </View>

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
          <View style={styles.botonCrearContent}>
            <FontAwesome name="plus-circle" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.textoBoton}>Guardar y Sincronizar Cita</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={styles.botonCancelar}
        onPress={() => router.back()}
        disabled={guardando}
      >
        <Text style={styles.textoCancelar}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

  contenido: {
    padding: 24,
    paddingBottom: 50,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },

  cargando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4FAF8",
  },

  textoCargando: {
    marginTop: 12,
    color: "#5F716E",
    fontSize: 14,
    fontWeight: "600",
  },

  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  botonRegresar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#DCE8E5",
  },

  titulo: {
    fontSize: 26,
    fontWeight: "900",
    color: "#173F3A",
  },

  subtitulo: {
    marginTop: 3,
    fontSize: 13,
    color: "#71817F",
  },

  syncCard: {
    flexDirection: "row",
    backgroundColor: "#E7F5F2",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BDE2D9",
    marginBottom: 24,
    alignItems: "flex-start",
  },

  syncIcon: {
    marginRight: 12,
    marginTop: 2,
  },

  syncTextContainer: {
    flex: 1,
  },

  syncTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#17685F",
    marginBottom: 4,
  },

  syncDescription: {
    fontSize: 12,
    color: "#3F645E",
    lineHeight: 18,
  },

  seccion: {
    marginBottom: 20,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  labelIcon: {
    marginRight: 7,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: "700",
    color: "#294B47",
  },

  selector: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputError: {
    borderColor: "#D32F2F",
    backgroundColor: "#FFF8F8",
  },

  errorTexto: {
    marginTop: 6,
    color: "#D32F2F",
    fontSize: 12,
    fontWeight: "600",
  },

  textoSelector: {
    color: "#294B47",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  placeholder: {
    color: "#8A9A98",
    fontSize: 14,
    flex: 1,
  },

  lista: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    overflow: "hidden",
  },

  opcion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F1",
  },

  opcionNombre: {
    fontSize: 14,
    fontWeight: "700",
    color: "#294B47",
  },

  opcionDetalle: {
    marginTop: 3,
    fontSize: 12,
    color: "#71817F",
  },

  listaVacia: {
    padding: 16,
    color: "#71817F",
    textAlign: "center",
    fontSize: 13,
  },

  input: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E5E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#294B47",
  },

  ayuda: {
    marginTop: 5,
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
    minHeight: 96,
    paddingTop: 12,
  },

  botonCrear: {
    height: 50,
    borderRadius: 13,
    backgroundColor: "#247F76",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  botonCrearContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  botonPresionado: {
    backgroundColor: "#1D6760",
  },

  botonDeshabilitado: {
    opacity: 0.65,
  },

  textoBoton: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  botonCancelar: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  textoCancelar: {
    color: "#647572",
    fontSize: 14,
    fontWeight: "700",
  },

  deniedContainer: {
    flex: 1,
    backgroundColor: "#F4FAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  deniedCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2ECEA",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  deniedIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFF0EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FAD2CE",
  },

  deniedTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#173F3A",
  },

  deniedSubtitle: {
    fontSize: 14,
    color: "#718581",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 26,
  },

  deniedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#247F76",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
  },

  deniedButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});