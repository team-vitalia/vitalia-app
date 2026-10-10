
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

type Especialidad = {
  id_PK: number;
  nombre: string;
};

type PerfilDoctor = {
  id_PK: number;
  usuario_id_FK: number;
  nombre: string;
  correo_electronico: string;
  numero_licencia: string | null;
  estado: string | null;
  costo_consulta: number | string | null;
  especialidades: Especialidad[];
};


type AlertaProps = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: "exito" | "error";
  onCerrar: () => void;
};


function AlertaPersonalizada({
  visible,
  titulo,
  mensaje,
  tipo,
  onCerrar,
}: AlertaProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <View style={styles.alertaOverlay}>
        <View style={styles.alertaCaja}>
          <View
            style={[
              styles.alertaIconoContainer,
              tipo === "error" && styles.alertaIconoError,
            ]}
          >
            <Text
              style={[
                styles.alertaIcono,
                tipo === "error" && styles.alertaIconoTextoError,
              ]}
            >
              {tipo === "exito" ? "✓" : "!"}
            </Text>
          </View>

          <Text style={styles.alertaTitulo}>
            {titulo}
          </Text>

          <Text style={styles.alertaMensaje}>
            {mensaje}
          </Text>

          <Pressable
            onPress={onCerrar}
            style={({ pressed }) => [
              styles.alertaBoton,
              pressed && styles.alertaBotonPresionado,
            ]}
          >
            <Text style={styles.alertaBotonTexto}>
              Aceptar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function PerfilDoctorScreen() {
    const router = useRouter();
    const { token } = useAuth();

    const [perfil, setPerfil] = useState<PerfilDoctor | null>(null);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [licencia, setLicencia] = useState("");
    const [modalEspecialidad, setModalEspecialidad] = useState(false);
    const [nuevaEspecialidad, setNuevaEspecialidad] = useState("");
    const [creandoEspecialidad, setCreandoEspecialidad] = useState(false);
    const [descripcionEspecialidad, setDescripcionEspecialidad] = useState("");
const [codigoEspecialidad, setCodigoEspecialidad] = useState("");
    const [costo, setCosto] = useState("");
    const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState({
        visible: false,
        titulo: "",
        mensaje: "",
        tipo: "exito" as "exito" | "error",
    });

    const mostrarNotificacion = (
        titulo: string,
        mensaje: string,
        tipo: "exito" | "error" = "exito"
        ) => {
        setNotificacion({
            visible: true,
            titulo,
            mensaje,
            tipo,
        });
        };

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    useEffect(() => {
        if (token) {
        cargarDatos();
        }
    }, [token]);

    const cargarDatos = async () => {
        setCargando(true);
        setError("");

        try {
        const [respuestaPerfil, respuestaEspecialidades] =
            await Promise.all([
            api.get("/api/doctores/perfil", { headers }),
            api.get("/api/especialidades/", { headers }),
            ]);

        const datos: PerfilDoctor = respuestaPerfil.data;

        setPerfil(datos);
        setLicencia(datos.numero_licencia ?? "");
        setCosto(
            datos.costo_consulta != null
            ? String(datos.costo_consulta)
            : ""
        );

        setSeleccionadas(
            (datos.especialidades ?? []).map((e) => e.id_PK)
        );

        setEspecialidades(respuestaEspecialidades.data);
        } catch (err: any) {
        setError(
            err?.response?.data?.detail ??
            "No fue posible cargar tu perfil profesional."
        );
        } finally {
            setCargando(false);
        }
    };

    const alternarEspecialidad = (id: number) => {
        const especialidad = especialidades.find(
            (e) => e.id_PK === id
        );

        if (!especialidad) return;

        const yaSeleccionada = seleccionadas.includes(id);

        setSeleccionadas((actuales) =>
            yaSeleccionada
            ? actuales.filter((item) => item !== id)
            : [...actuales, id]
        );

        mostrarNotificacion(
            yaSeleccionada
                ? "Especialidad desmarcada"
                : "Especialidad seleccionada",
            yaSeleccionada
                ? `Se quitó "${especialidad.nombre}" de la selección. Recuerda guardar los cambios.`
                : `Se agregó "${especialidad.nombre}" a la selección. Recuerda guardar los cambios.`
        );
    };

    const crearEspecialidad = async () => {
        const nombre = nuevaEspecialidad.trim();
        const descripcion = descripcionEspecialidad.trim();
        const codigo = codigoEspecialidad.trim();

        if (!nombre || !descripcion || !codigo) {
            mostrarNotificacion(
                "Campos obligatorios",
                "Ingresa el nombre, la descripción y el código de la especialidad.",
                "error"
            );
            return;
        }

        if (nombre.length > 100) {
            mostrarNotificacion(
                "Nombre demasiado largo",
                "El nombre no puede superar los 100 caracteres.",
                "error"
            );
            return;
        }

        const duplicada = especialidades.some(
            (e) => e.nombre.trim().toLowerCase() === nombre.toLowerCase()
        );

        if (duplicada) {
            mostrarNotificacion(
                "Especialidad existente",
                "Esta especialidad ya está registrada. Selecciónala de la lista.",
                "error"
            );
            return;
        }

        setCreandoEspecialidad(true);

        try {
            const respuesta = await api.post(
                "/api/especialidades/para-mi-perfil",
                {
                    nombre,
                    descripcion,
                    codigo,
                },
                { headers }
            );

            const nueva = respuesta.data as Especialidad;

            if (!nueva?.id_PK) {
                throw new Error(
                    "El servidor no devolvió el ID de la especialidad creada."
                );
            }

            setEspecialidades((actuales) =>
                actuales.some((e) => e.id_PK === nueva.id_PK)
                    ? actuales
                    : [...actuales, nueva]
            );

            setSeleccionadas((actuales) =>
                actuales.includes(nueva.id_PK)
                    ? actuales
                    : [...actuales, nueva.id_PK]
            );

            setPerfil((actual) =>
                actual
                    ? {
                        ...actual,
                        especialidades: [
                            ...(actual.especialidades ?? []).filter(
                                (e) => e.id_PK !== nueva.id_PK
                            ),
                            nueva,
                        ],
                    }
                    : actual
            );

            setNuevaEspecialidad("");
            setDescripcionEspecialidad("");
            setCodigoEspecialidad("");
            setModalEspecialidad(false);

            mostrarNotificacion(
                "¡Especialidad creada!",
                `"${nueva.nombre}" se registró con su descripción y código, y se relacionó con tu perfil profesional.`
            );
        } catch (err: any) {
            const mensaje =
                err?.response?.data?.detail ??
                err?.message ??
                "No fue posible crear y relacionar la especialidad.";

            mostrarNotificacion(
                "Error al crear especialidad",
                mensaje,
                "error"
            );
        } finally {
            setCreandoEspecialidad(false);
        }
    };

    const guardarCambios = async () => {
        const costoNumerico =
            costo.trim() === "" ? null : Number(costo);

        if (
            costoNumerico !== null &&
            (!Number.isFinite(costoNumerico) || costoNumerico < 0)
        ) {
            mostrarNotificacion(
            "Costo inválido",
            "Ingresa un costo de consulta válido y no negativo.",
            "error"
            );
            return;
        }

        setGuardando(true);
        setError("");

        try {
            const respuesta = await api.put(
            "/api/doctores/perfil",
            {
                numero_licencia: licencia.trim() || null,
                costo_consulta: costoNumerico,
                especialidad_ids: seleccionadas,
            },
            { headers }
            );

            console.log(
            "Respuesta al actualizar el perfil:",
            respuesta.status,
            respuesta.data
            );

            setPerfil((actual) =>
            actual
                ? {
                    ...actual,
                    numero_licencia: licencia.trim() || null,
                    costo_consulta: costoNumerico,
                    especialidades: especialidades.filter((e) =>
                    seleccionadas.includes(e.id_PK)
                    ),
                }
                : actual
            );

            mostrarNotificacion(
            "¡Datos actualizados!",
            "Tu perfil profesional se actualizó correctamente."
            );
        } catch (err: any) {
            console.error(
            "Error al actualizar el perfil:",
            err?.response?.status,
            err?.response?.data ?? err?.message
            );

            const mensaje =
            err?.response?.data?.detail ??
            "No fue posible guardar los cambios. Revisa la conexión con el servidor.";

            setError(mensaje);

            mostrarNotificacion(
            "Error al actualizar",
            mensaje,
            "error"
            );
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#247F76" />
            <Text style={styles.loadingText}>
            Cargando perfil profesional...
            </Text>
        </View>
        );
    }

    return (
        <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        >
        <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Volver al panel</Text>
        </Pressable>

        <Text style={styles.heading}>Mi perfil profesional</Text>
        <Text style={styles.subtitle}>
            Consulta y actualiza tu información profesional.
        </Text>

        
        <AlertaPersonalizada
        visible={notificacion.visible}
        titulo={notificacion.titulo}
        mensaje={notificacion.mensaje}
        tipo={notificacion.tipo}
        onCerrar={() =>
            setNotificacion((actual) => ({
            ...actual,
            visible: false,
            }))
        }
        />

            {error ? (
                <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={cargarDatos}>
                    <Text style={styles.retry}>Intentar nuevamente</Text>
                </Pressable>
                </View>
            ) : null}

            {perfil && (
                <>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Datos de la cuenta
                    </Text>

                    <Text style={styles.label}>Nombre</Text>
                    <TextInput
                        style={[styles.input, styles.readOnly]}
                        value={perfil.nombre}
                        editable={false}
                    />

                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                style={[styles.input, styles.readOnly]}
                value={perfil.correo_electronico}
                editable={false}
                />

                <Text style={styles.label}>Estado profesional</Text>
                <Text style={styles.status}>
                {perfil.estado ?? "Sin estado"}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                Información profesional
                </Text>

                <Text style={styles.label}>
                Número de licencia profesional
                </Text>
                <TextInput
                style={styles.input}
                value={licencia}
                onChangeText={setLicencia}
                placeholder="Ej. LIC-001"
                autoCapitalize="characters"
                />

                <Text style={styles.label}>
                Costo de consulta (MXN)
                </Text>
                <TextInput
                style={styles.input}
                value={costo}
                onChangeText={setCosto}
                placeholder="Ej. 500"
                keyboardType="decimal-pad"
                />

                <Text style={styles.label}>
                Especialidades
                </Text>
                <Text style={styles.helper}>
                Selecciona todas las especialidades que te correspondan.
                </Text>

                {especialidades.length === 0 ? (
                <Text style={styles.helper}>
                    No hay especialidades activas disponibles.
                </Text>
                ) : (
                especialidades.map((especialidad) => {
                    const activa = seleccionadas.includes(
                    especialidad.id_PK
                    );

                    return (
                    <Pressable
                        key={especialidad.id_PK}
                        style={[
                        styles.specialty,
                        activa && styles.specialtySelected,
                        ]}
                        onPress={() =>
                        alternarEspecialidad(especialidad.id_PK)
                        }
                    >
                        <View
                        style={[
                            styles.checkbox,
                            activa && styles.checkboxSelected,
                        ]}
                        >
                        {activa && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                        </View>

                        <Text
                        style={[
                            styles.specialtyText,
                            activa && styles.specialtyTextSelected,
                        ]}
                        >
                        {especialidad.nombre}
                        </Text>
                    </Pressable>
                    );
                })
                )}

                <Pressable
                    style={styles.crearEspecialidadButton}
                    onPress={() => {
                        setNuevaEspecialidad("");
                        setDescripcionEspecialidad("");
                        setCodigoEspecialidad("");
                        setModalEspecialidad(true);
                    }}
                >
                    <Text style={styles.crearEspecialidadTexto}>
                        + Crear especialidad
                    </Text>
                </Pressable>

                <Pressable
                style={[
                    styles.saveButton,
                    guardando && styles.disabledButton,
                ]}
                disabled={guardando}
                onPress={guardarCambios}
                >
                {guardando ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.saveButtonText}>
                    Guardar cambios
                    </Text>
                )}
                </Pressable>
            </View>
            </>
        )}

        <Modal
            visible={modalEspecialidad}
            transparent
            animationType="fade"
            onRequestClose={() => setModalEspecialidad(false)}
            statusBarTranslucent
        >
            <View style={styles.alertaOverlay}>
                <View style={styles.modalEspecialidadCaja}>
                    <Text style={styles.alertaTitulo}>
                        Nueva especialidad
                    </Text>

                    <Text style={styles.alertaMensaje}>
                        Escribe el nombre de la especialidad que deseas agregar
                        a tu perfil profesional.
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={nuevaEspecialidad}
                        onChangeText={setNuevaEspecialidad}
                        placeholder="Ej. Cardiología"
                        autoCapitalize="words"
                        maxLength={100}
                        editable={!creandoEspecialidad}
                        onSubmitEditing={crearEspecialidad}
                    />

                    <Text style={styles.label}>Descripción</Text>

                    <TextInput
                        style={[styles.input, styles.descripcionInput]}
                        value={descripcionEspecialidad}
                        onChangeText={setDescripcionEspecialidad}
                        placeholder="Describe la especialidad"
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                        editable={!creandoEspecialidad}
                    />

                    <Text style={styles.label}>Código</Text>

                    <TextInput
                        style={styles.input}
                        value={codigoEspecialidad}
                        onChangeText={setCodigoEspecialidad}
                        placeholder="Ej. CARD"
                        autoCapitalize="characters"
                        maxLength={20}
                        editable={!creandoEspecialidad}
                    />

                    <Pressable
                        style={[
                            styles.saveButton,
                            creandoEspecialidad && styles.disabledButton,
                        ]}
                        onPress={crearEspecialidad}
                        disabled={creandoEspecialidad}
                    >
                        {creandoEspecialidad ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>
                                Crear y agregar
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.cancelarEspecialidad}
                        onPress={() => setModalEspecialidad(false)}
                        disabled={creandoEspecialidad}
                    >
                        <Text style={styles.cancelarEspecialidadTexto}>
                            Cancelar
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },
  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4FAF8",
  },
  loadingText: {
    marginTop: 12,
    color: "#58716C",
  },
  back: {
    color: "#247F76",
    fontWeight: "700",
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#173F3A",
  },
  subtitle: {
    fontSize: 14,
    color: "#82938F",
    marginTop: 6,
    marginBottom: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E4EEEB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#31534D",
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE8E4",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: "#173F3A",
  },
  readOnly: {
    backgroundColor: "#F0F5F3",
    color: "#71837E",
  },
  status: {
    color: "#247F76",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  helper: {
    color: "#82938F",
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  specialty: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderWidth: 1,
    borderColor: "#E4EEEB",
    borderRadius: 12,
    marginBottom: 9,
  },
  specialtySelected: {
    backgroundColor: "#EAF7F4",
    borderColor: "#73B9AE",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#B9CBC5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  checkboxSelected: {
    backgroundColor: "#247F76",
    borderColor: "#247F76",
  },
  checkmark: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  specialtyText: {
    color: "#49625C",
    flex: 1,
  },
  specialtyTextSelected: {
    color: "#17685F",
    fontWeight: "700",
  },
  saveButton: {
    marginTop: 22,
    backgroundColor: "#247F76",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: "#FFF0EF",
    borderColor: "#F2C7C3",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  errorText: {
    color: "#A83228",
  },
  retry: {
    color: "#247F76",
    fontWeight: "800",
    marginTop: 10,
  },
  notificationBox: {
    backgroundColor: "#EAF7F4",
    borderWidth: 1,
    borderColor: "#73B9AE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    },

    notificationError: {
    backgroundColor: "#FFF0EF",
    borderColor: "#F2C7C3",
    },

    notificationTitle: {
    color: "#17685F",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    },

    notificationMessage: {
    color: "#31534D",
    fontSize: 14,
    lineHeight: 20,
    },

    notificationClose: {
    color: "#247F76",
    fontWeight: "800",
    textAlign: "right",
    marginTop: 12,
    },
    
    alertaOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 35, 32, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    },

    alertaCaja: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5F0ED",
    elevation: 15,
    shadowColor: "#173F3A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    },

    alertaIconoContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#E5F6F1",
    borderWidth: 1,
    borderColor: "#C7EAE0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    },

    alertaIconoError: {
    backgroundColor: "#FFF0EF",
    borderColor: "#F4D0CC",
    },

    alertaIcono: {
    fontSize: 34,
    fontWeight: "700",
    color: "#247F76",
    },

    alertaIconoTextoError: {
    color: "#C94D43",
    },

    alertaTitulo: {
    fontSize: 21,
    fontWeight: "800",
    color: "#173F3A",
    textAlign: "center",
    marginBottom: 10,
    },

    alertaMensaje: {
    fontSize: 15,
    color: "#687D77",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 26,
    },

    alertaBoton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#247F76",
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    },

    alertaBotonPresionado: {
    backgroundColor: "#1B675F",
    opacity: 0.9,
    },

    alertaBotonTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    },
    crearEspecialidadButton: {
        borderWidth: 1,
        borderColor: "#247F76",
        borderStyle: "dashed",
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        marginTop: 6,
        marginBottom: 12,
        backgroundColor: "#F0FAF7",
    },

    crearEspecialidadTexto: {
        color: "#247F76",
        fontSize: 14,
        fontWeight: "800",
    },

    modalEspecialidadCaja: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        alignSelf: "center",
    },

    cancelarEspecialidad: {
        paddingVertical: 14,
        alignItems: "center",
    },

    cancelarEspecialidadTexto: {
        color: "#687D77",
        fontSize: 14,
        fontWeight: "700",
    },

    descripcionInput: {
        minHeight: 90,
        textAlignVertical: "top",
    },
});