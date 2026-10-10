
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

type Especialidad = {
    id_PK: number;
    nombre: string;
    descripcion: string | null;
    codigo: string | null;
    esta_activo: boolean;
};

type FormularioEspecialidad = {
    nombre: string;
    descripcion: string;
    codigo: string;
};

const FORMULARIO_VACIO: FormularioEspecialidad = {
    nombre: "",
    descripcion: "",
    codigo: "",
};


export default function EspecialidadesScreen() {
    const router = useRouter();
    const { token } = useAuth();

    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [especialidadEditar, setEspecialidadEditar] =
        useState<Especialidad | null>(null);
    const [formulario, setFormulario] =
        useState<FormularioEspecialidad>(FORMULARIO_VACIO);
    const [modalEliminar, setModalEliminar] = useState(false);
    const [especialidadEliminar, setEspecialidadEliminar] =
        useState<Especialidad | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState("");
    const [modalBloqueo, setModalBloqueo] = useState(false);
    const [mensajeBloqueo, setMensajeBloqueo] = useState("");
    const [alerta, setAlerta] = useState({
    visible: false,
        titulo: "",
        mensaje: "",
        tipo: "exito" as "exito" | "error",
    });

    const mostrarAlerta = (
        titulo: string,
        mensaje: string,
        tipo: "exito" | "error" = "exito"
    ) => {
        setAlerta({
            visible: true,
            titulo,
            mensaje,
            tipo,
        });
    };

    const cerrarAlerta = () => {
        setAlerta((actual) => ({
            ...actual,
            visible: false,
        }));
    };
    const cargarEspecialidades = useCallback(async () => {
        if (!token) {
            mostrarAlerta(
                "Sesión expirada",
                "Inicia sesión nuevamente.",
                "error"
            );
            return;
        }

        try {
            setCargando(true);
            setError("");

            const respuesta = await api.get("/api/especialidades/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setEspecialidades(respuesta.data);
        } catch (e: any) {
            const mensaje =
                e?.response?.data?.detail ||
                "No se pudieron cargar las especialidades.";

            setError(mensaje);
        } finally {
            setCargando(false);
        }
    }, [token]);

    useEffect(() => {
        cargarEspecialidades();
    }, [cargarEspecialidades]);

    const abrirNueva = () => {
        setEspecialidadEditar(null);
        setFormulario(FORMULARIO_VACIO);
        setModalVisible(true);
    };

    const abrirEdicion = (especialidad: Especialidad) => {
        setEspecialidadEditar(especialidad);
        setFormulario({
            nombre: especialidad.nombre,
            descripcion: especialidad.descripcion || "",
            codigo: especialidad.codigo || "",
        });
        setModalVisible(true);
    };

    const guardarEspecialidad = async () => {
        if (!token) {
            mostrarAlerta(
                "Sesión expirada",
                "Inicia sesión nuevamente.",
                "error"
            );
            return;
        }

        if (!formulario.nombre.trim()) {
            mostrarAlerta(
                "Dato obligatorio",
                "Escribe el nombre de la especialidad.",
                "error"
            );
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            descripcion: formulario.descripcion.trim() || null,
            codigo: formulario.codigo.trim() || null,
        };

        try {
            setGuardando(true);

            const estabaEditando = Boolean(especialidadEditar);

            if (especialidadEditar) {
                await api.put(
                    `/api/especialidades/${especialidadEditar.id_PK}`,
                    datos,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            } else {
                await api.post("/api/especialidades/", datos, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }

            setModalVisible(false);
            setFormulario(FORMULARIO_VACIO);
            setEspecialidadEditar(null);

            await cargarEspecialidades();

            mostrarAlerta(
                estabaEditando
                    ? "¡Especialidad actualizada!"
                    : "¡Especialidad creada!",
                estabaEditando
                    ? "Los cambios de la especialidad se guardaron correctamente."
                    : "La especialidad se registró correctamente.",
                "exito"
            );
        } catch (e: any) {
            mostrarAlerta(
                "No se pudo guardar",
                e?.response?.data?.detail ||
                    "Ocurrió un error al guardar la especialidad.",
                "error"
            );
        } finally {
            setGuardando(false);
        }
    };

    const eliminarEspecialidad = async (
        especialidad: Especialidad
    ) => {
        if (!token) {
            Alert.alert("Sesión", "Inicia sesión nuevamente.");
            return;
        }

        try {
            const respuesta = await api.get(
                `/api/especialidades/${especialidad.id_PK}/doctores-asignados`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Revisa qué datos está recibiendo React
            console.log(
                "Respuesta de doctores asignados:",
                respuesta.data
            );

            const tieneDoctores =
                respuesta.data?.tiene_doctores === true;

            if (tieneDoctores) {
                setMensajeBloqueo(
                    "No se puede eliminar esta especialidad porque hay uno o más doctores que la tienen asignada."
                );
                setModalBloqueo(true);
                return;
            }

            // Solo permite confirmar si no hay doctores asignados
            setEspecialidadEliminar(especialidad);
            setModalEliminar(true);

        } catch (e: any) {
            console.error(
                "Error al verificar doctores:",
                e?.response?.data || e
            );

            Alert.alert(
                "Error",
                e?.response?.data?.detail ||
                    "No se pudo verificar si hay doctores asignados."
            );
        }
    };

    const confirmarEliminar = async () => {
        if (!token || !especialidadEliminar || eliminando) {
            return;
        }

        try {
            setEliminando(true);

            await api.delete(
                `/api/especialidades/${especialidadEliminar.id_PK}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setModalEliminar(false);
            setEspecialidadEliminar(null);

            await cargarEspecialidades();

            mostrarAlerta(
                "¡Especialidad eliminada!",
                "La especialidad se eliminó correctamente.",
                "exito"
            );
        } catch (e: any) {
            const estado = e?.response?.status;
            const mensaje = e?.response?.data?.detail;

            if (estado === 409) {
                mostrarAlerta(
                    "No se puede eliminar",
                    mensaje ||
                        "Esta especialidad está asignada a uno o más doctores.",
                    "error"
                );
            } else {
                mostrarAlerta(
                    "Error",
                    mensaje || "No se pudo eliminar la especialidad.",
                    "error"
                );
            }
        } finally {
            setEliminando(false);
        }
    };

    const actualizarCampo = (
        campo: keyof FormularioEspecialidad,
        valor: string
    ) => {
        setFormulario((actual) => ({
            ...actual,
            [campo]: valor,
        }));
    };

    return (
        <ScrollView
            style={styles.pantalla}
            contentContainerStyle={styles.contenido}
        >
            <TouchableOpacity
                style={styles.botonVolver}
                onPress={() => router.back()}
                activeOpacity={0.7}
            >
                <Text style={styles.textoVolver}>← Volver</Text>
            </TouchableOpacity>
            <View style={styles.encabezado}>
                <View style={styles.encabezadoTexto}>
                    <Text style={styles.etiquetaSeccion}>
                        ADMINISTRACIÓN
                    </Text>

                    <Text style={styles.titulo}>
                        Especialidades
                    </Text>

                    <Text style={styles.subtitulo}>
                        Administra las especialidades médicas de VITALIA.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.botonPrincipal}
                    onPress={abrirNueva}
                    activeOpacity={0.8}
                >
                    <Text style={styles.botonPrincipalTexto}>
                        + Agregar especialidad
                    </Text>
                </TouchableOpacity>
            </View>

            {cargando ? (
                <ActivityIndicator
                    size="large"
                    color="#2A8C82"
                    style={styles.carga}
                />
            ) : error ? (
                <View style={styles.estado}>
                    <Text style={styles.errorTexto}>{error}</Text>

                    <TouchableOpacity
                        style={styles.botonSecundario}
                        onPress={cargarEspecialidades}
                    >
                        <Text style={styles.botonSecundarioTexto}>
                            Reintentar
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : especialidades.length === 0 ? (
                <View style={styles.estado}>
                    <Text style={styles.estadoTitulo}>
                        No hay especialidades registradas
                    </Text>
                    <Text style={styles.estadoTexto}>
                        Agrega una especialidad para comenzar.
                    </Text>
                </View>
            ) : (
                <View style={styles.lista}>
                    {especialidades.map((especialidad) => (
                        <View
                            key={especialidad.id_PK}
                            style={styles.tarjeta}
                        >
                            <View style={styles.tarjetaEncabezado}>
                                <View style={styles.iconoEspecialidad}>
                                    <Text style={styles.iconoEspecialidadTexto}>
                                        ✚
                                    </Text>
                                </View>

                                <View style={styles.detalles}>
                                    <Text style={styles.nombre}>
                                        {especialidad.nombre}
                                    </Text>

                                    <View style={styles.badgeCodigo}>
                                        <Text style={styles.badgeCodigoTexto}>
                                            {especialidad.codigo
                                                ? `Código: ${especialidad.codigo}`
                                                : "Sin código"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {especialidad.descripcion ? (
                                <Text style={styles.descripcion}>
                                    {especialidad.descripcion}
                                </Text>
                            ) : (
                                <Text style={styles.descripcionVacia}>
                                    Sin descripción registrada.
                                </Text>
                            )}

                            <View style={styles.divisorTarjeta} />

                            <View style={styles.acciones}>
                                <TouchableOpacity
                                    style={styles.botonEditar}
                                    onPress={() => abrirEdicion(especialidad)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.botonEditarTexto}>
                                        ✎  Editar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.botonEliminar}
                                    onPress={() => eliminarEspecialidad(especialidad)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.botonEliminarTexto}>
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.fondoModal}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitulo}>
                            {especialidadEditar
                                ? "Editar especialidad"
                                : "Nueva especialidad"}
                        </Text>

                        <Text style={styles.etiqueta}>Nombre *</Text>
                        <TextInput
                            style={styles.input}
                            value={formulario.nombre}
                            onChangeText={(v) =>
                                actualizarCampo("nombre", v)
                            }
                            placeholder="Ej. Cardiología"
                            maxLength={100}
                        />

                        <Text style={styles.etiqueta}>Descripción</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultilinea]}
                            value={formulario.descripcion}
                            onChangeText={(v) =>
                                actualizarCampo("descripcion", v)
                            }
                            placeholder="Descripción de la especialidad"
                            multiline
                            numberOfLines={3}
                        />

                        <Text style={styles.etiqueta}>Código</Text>
                        <TextInput
                            style={styles.input}
                            value={formulario.codigo}
                            onChangeText={(v) =>
                                actualizarCampo("codigo", v)
                            }
                            placeholder="Ej. CARD"
                        />

                        <View style={styles.botonesModal}>
                            <TouchableOpacity
                                style={styles.botonCancelar}
                                onPress={() => setModalVisible(false)}
                                disabled={guardando}
                            >
                                <Text style={styles.botonCancelarTexto}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.botonPrincipal,
                                    guardando && styles.deshabilitado,
                                ]}
                                onPress={guardarEspecialidad}
                                disabled={guardando}
                            >
                                <Text style={styles.botonPrincipalTexto}>
                                    {guardando
                                        ? "Guardando..."
                                        : "Guardar"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal
                transparent
                visible={modalEliminar}
                animationType="fade"
                onRequestClose={() => {
                    if (!eliminando) {
                        setModalEliminar(false);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconEliminar}>
                            <Text style={styles.modalIconEliminarTexto}>!</Text>
                        </View>

                        <Text style={styles.modalTitle}>
                            Confirmar eliminación
                        </Text>

                        <Text style={styles.modalMessage}>
                            ¿Deseas eliminar la especialidad?
                        </Text>

                        <View style={styles.especialidadResaltada}>
                            <Text style={styles.nombreEspecialidadModal}>
                                {especialidadEliminar?.nombre}
                            </Text>
                        </View>

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalInfoText}>
                                Esta acción eliminará el registro de la especialidad.
                                Solo puedes continuar si no tiene doctores asignados.
                            </Text>
                        </View>

                        <View style={styles.botonesEliminarModal}>
                            <TouchableOpacity
                                style={styles.modalCancelar}
                                onPress={() => setModalEliminar(false)}
                                disabled={eliminando}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalCancelarTexto}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalEliminarBoton,
                                    eliminando && styles.deshabilitado,
                                ]}
                                onPress={confirmarEliminar}
                                disabled={eliminando}
                                activeOpacity={0.8}
                            >
                                {eliminando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalEliminarTexto}>
                                        Sí, eliminar
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                transparent
                visible={modalBloqueo}
                animationType="fade"
                onRequestClose={() => setModalBloqueo(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIcon}>
                            <Text style={styles.modalIconText}>!</Text>
                        </View>

                        <Text style={styles.modalTitle}>
                            No se puede eliminar
                        </Text>

                        <Text style={styles.modalMessage}>
                            {mensajeBloqueo}
                        </Text>

                        <View style={styles.modalInfo}>
                            <Text style={styles.modalInfoText}>
                                Para eliminar esta especialidad, primero debes
                                asegurarte de que ningún doctor la tenga asignada.
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setModalBloqueo(false)}
                            style={styles.modalButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalButtonText}>
                                Entendido
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={alerta.visible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                presentationStyle="overFullScreen"
                onRequestClose={cerrarAlerta}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View
                            style={[
                                styles.modalIcon,
                                alerta.tipo === "error" && {
                                    backgroundColor: "#FCECEC",
                                    borderColor: "#F5D0D0",
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.modalIconText,
                                    alerta.tipo === "error" && {
                                        color: "#B42318",
                                    },
                                ]}
                            >
                                {alerta.tipo === "exito" ? "✓" : "!"}
                            </Text>
                        </View>

                        <Text style={styles.modalTitle}>
                            {alerta.titulo}
                        </Text>

                        <Text style={styles.modalMessage}>
                            {alerta.mensaje}
                        </Text>

                        <TouchableOpacity
                            onPress={cerrarAlerta}
                            style={styles.modalButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalButtonText}>
                                Entendido
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    
    pantalla: {
        flex: 1,
        backgroundColor: "#F3F7F6",
    },

    contenido: {
        padding: 24,
        paddingBottom: 50,
        maxWidth: 1120,
        width: "100%",
        alignSelf: "center",
    },
    encabezado: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        marginBottom: 25,
        gap: 20,
    },

    encabezadoTexto: {
        flex: 1,
        minWidth: 220,
    },
    titulo: {
        fontSize: 32,
        fontWeight: "900",
        color: "#173F3A",
        letterSpacing: -0.7,
    },

    subtitulo: {
        marginTop: 7,
        color: "#718780",
        fontSize: 14,
        lineHeight: 21,
    },

    botonPrincipal: {
        minHeight: 48,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: "#247F76",
        alignItems: "center",
        justifyContent: "center",
    },

    botonPrincipalTexto: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
    },
    
    lista: {
        gap: 14,
        marginTop: 4,
    },

    tarjeta: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 20,
        marginBottom: 0,
        borderWidth: 1,
        borderColor: "#E3ECE8",
        shadowColor: "#173F3A",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 9,
        elevation: 2,
    },
    detalles: {
        flex: 1,
        minWidth: 0,
        gap: 5,
    },
    nombre: {
        color: "#173F3A",
        fontSize: 16,
        fontWeight: "800",
    },
    metadato: {
        color: "#2A8C82",
        fontSize: 13,
    },
    descripcion: {
        color: "#36564E",
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 16,
    },
    acciones: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    
    botonEditar: {
        flex: 1,
        minWidth: 110,
        minHeight: 42,
        paddingHorizontal: 15,
        borderRadius: 11,
        backgroundColor: "#E5F4F0",
        alignItems: "center",
        justifyContent: "center",
    },

    botonEditarTexto: {
        color: "#247F76",
        fontSize: 12,
        fontWeight: "800",
    },

    botonEliminar: {
        flex: 1,
        minWidth: 110,
        minHeight: 42,
        paddingHorizontal: 15,
        borderRadius: 11,
        backgroundColor: "#FCEDEC",
        alignItems: "center",
        justifyContent: "center",
    },

    botonEliminarTexto: {
        color: "#B42318",
        fontSize: 12,
        fontWeight: "800",
    },
    carga: {
        marginTop: 50,
    },
    estado: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E2EEEB",
        padding: 30,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 4,
    },

    estadoTitulo: {
        fontSize: 17,
        fontWeight: "800",
        color: "#31534D",
        textAlign: "center",
    },

    estadoTexto: {
        color: "#8A9B98",
        fontSize: 12,
        lineHeight: 18,
        textAlign: "center",
    },

    errorTexto: {
        color: "#B42318",
        fontSize: 13,
        lineHeight: 20,
        textAlign: "center",
    },

    botonSecundario: {
        borderWidth: 1,
        borderColor: "#D3E2DE",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
    },

    botonSecundarioTexto: {
        color: "#247F76",
        fontWeight: "800",
    },
    
    fondoModal: {
        flex: 1,
        backgroundColor: "rgba(15, 40, 36, 0.48)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    modal: {
        width: "100%",
        maxWidth: 500,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 26,
        borderWidth: 1,
        borderColor: "#E1ECE8",
    },

    modalTitulo: {
        fontSize: 24,
        fontWeight: "900",
        color: "#173F3A",
        marginBottom: 14,
    },

    etiqueta: {
        color: "#36564E",
        fontSize: 12,
        fontWeight: "800",
        marginTop: 12,
        marginBottom: 8,
    },

    input: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: "#DCE9E5",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: "#173F3A",
        backgroundColor: "#FAFCFB",
        fontSize: 14,
    },

    inputMultilinea: {
        minHeight: 90,
        textAlignVertical: "top",
    },

    botonesModal: {
        flexDirection: "row",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 26,
    },

    botonCancelar: {
        minHeight: 46,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D3E2DE",
        backgroundColor: "#EDF3F1",
        alignItems: "center",
        justifyContent: "center",
    },

    botonCancelarTexto: {
        color: "#45615B",
        fontSize: 12,
        fontWeight: "800",
    },
    deshabilitado: {
        opacity: 0.6,
    },
    textoConfirmacion: {
        fontSize: 15,
        lineHeight: 23,
        color: "#365B54",
    },

    textoAdvertencia: {
        fontSize: 13,
        lineHeight: 20,
        color: "#B42318",
        marginTop: 8,
    },

    botonVolver: {
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 10,
        alignSelf: "flex-start",
    },

    textoVolver: {
        color: "#247F76",
        fontWeight: "700",
        marginBottom: 20,
    },
    
    etiquetaSeccion: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.8,
        color: "#2A8C82",
        marginBottom: 5,
    },

    tarjetaEncabezado: {
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        marginBottom: 16,
    },

    iconoEspecialidad: {
        width: 52,
        height: 52,
        borderRadius: 17,
        backgroundColor: "#E0F2EE",
        alignItems: "center",
        justifyContent: "center",
    },

    iconoEspecialidadTexto: {
        color: "#247F76",
        fontSize: 25,
        fontWeight: "800",
    },

    badgeCodigo: {
        alignSelf: "flex-start",
        backgroundColor: "#E2F4F0",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginTop: 3,
    },

    badgeCodigoTexto: {
        color: "#247F76",
        fontSize: 10,
        fontWeight: "800",
    },

    
    descripcionVacia: {
        color: "#84958F",
        fontSize: 12,
        fontStyle: "italic",
        marginBottom: 16,
    },

    divisorTarjeta: {
        height: 1,
        backgroundColor: "#EDF2F0",
        marginBottom: 15,
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "rgba(15, 40, 36, 0.48)",
    },
    modalCard: {
        width: "100%",
        maxWidth: 500,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 26,
        borderWidth: 1,
        borderColor: "#E1ECE8",
        alignItems: "center",
        shadowColor: "#173F3A",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },

    modalIcon: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#FFF0E7",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        borderWidth: 1,
        borderColor: "#F8D9C5",
    },

    modalIconText: {
        color: "#C66A32",
        fontSize: 38,
        fontWeight: "800",
    },

    modalTitle: {
        color: "#173F3A",
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 12,
    },

    modalMessage: {
        color: "#647570",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },

    modalInfo: {
        width: "100%",
        backgroundColor: "#F4F8F7",
        borderRadius: 12,
        padding: 14,
        marginTop: 20,
        borderWidth: 1,
        borderColor: "#E4EEEB",
    },

    modalInfoText: {
        color: "#52645F",
        fontSize: 12,
        lineHeight: 19,
        textAlign: "center",
    },

    modalButton: {
        width: "100%",
        backgroundColor: "#247F76",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 22,
    },

    modalButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
    },

    modalIconEliminar: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#FCECEC",
        borderWidth: 1,
        borderColor: "#F5D0D0",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },

    modalIconEliminarTexto: {
        color: "#B42318",
        fontSize: 38,
        fontWeight: "800",
    },

    especialidadResaltada: {
        width: "100%",
        backgroundColor: "#E8F5F2",
        borderWidth: 1,
        borderColor: "#D2EAE4",
        borderRadius: 12,
        padding: 14,
        marginTop: 18,
        alignItems: "center",
    },

    nombreEspecialidadModal: {
        color: "#247F76",
        fontSize: 16,
        fontWeight: "800",
        textAlign: "center",
    },

    botonesEliminarModal: {
        width: "100%",
        flexDirection: "row",
        gap: 10,
        marginTop: 22,
    },

    modalCancelar: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D3E2DE",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    modalCancelarTexto: {
        color: "#52645F",
        fontSize: 13,
        fontWeight: "800",
    },

    modalEliminarBoton: {
        flex: 1,
        backgroundColor: "#B42318",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    modalEliminarTexto: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
    },
});