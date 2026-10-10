
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Rol {
    id_PK: number;
    nombre: string;
    descripcion: string | null;
    esta_activo: boolean;
}

export default function RolesScreen() {
    const router = useRouter();
    const { token } = useAuth();

    const [roles, setRoles] = useState<Rol[]>([]);
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [editando, setEditando] = useState<number | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitulo, setModalTitulo] = useState("");
    const [modalMensaje, setModalMensaje] = useState("");
    const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
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
        setAlerta({ visible: true, titulo, mensaje, tipo });
    };

    const cerrarAlerta = () => {
        setAlerta((actual) => ({
            ...actual,
            visible: false,
        }));
    };
    
    const headers = {
        Authorization: `Bearer ${token}`,
    };

    const cargarRoles = useCallback(async () => {
        if (!token) {
            setCargando(false);
            return;
        }

        try {
        setCargando(true);

        const response = await api.get(
            "/api/roles/?incluir_inactivos=true",
            { headers }
        );

        setRoles(response.data);
        } catch (error: any) {
        mostrarAlerta(
            "Error al cargar los roles",
            error.response?.data?.detail ||
                "No se pudieron cargar los roles.",
            "error"
        );
        } finally {
        setCargando(false);
        }
    }, [token]);

    useFocusEffect(
        useCallback(() => {
            cargarRoles();
        }, [cargarRoles])
    );

    
    const limpiar = () => {
        setEditando(null);
        setNombre("");
        setDescripcion("");
        setModalEdicionVisible(false);
    };

    const guardar = async () => {
        if (!token) {
            return;
        }

        if (nombre.trim().length < 2) {
            mostrarAlerta(
                "Dato requerido",
                "Escribe un nombre de rol de al menos 2 caracteres.",
                "error"
            );
            return;
        }

        const estabaEditando = editando !== null;

        try {
            setGuardando(true);

            const body = {
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
            };

            if (estabaEditando) {
                await api.patch(
                    `/api/roles/${editando}`,
                    body,
                    { headers }
                );
            } else {
                await api.post("/api/roles/", body, { headers });
            }

            setModalEdicionVisible(false);
            setEditando(null);
            setNombre("");
            setDescripcion("");

            await cargarRoles();

            mostrarAlerta(
                estabaEditando
                    ? "¡Rol actualizado!"
                    : "¡Rol creado!",
                estabaEditando
                    ? "Los cambios del rol se guardaron correctamente."
                    : "El rol se creó correctamente.",
                "exito"
            );
        } catch (error: any) {
            mostrarAlerta(
                "No se pudo guardar",
                error.response?.data?.detail ||
                    "Revisa los datos e intenta de nuevo.",
                "error"
            );
        } finally {
            setGuardando(false);
        }
    };

    const seleccionarEdicion = (rol: Rol) => {
        setEditando(rol.id_PK);
        setNombre(rol.nombre);
        setDescripcion(rol.descripcion || "");
        setModalEdicionVisible(true);
    };
    
    const cambiarEstado = async (rol: Rol) => {
        try {
            await api.patch(
            `/api/roles/${rol.id_PK}`,
            { esta_activo: !rol.esta_activo },
            { headers }
            );

            await cargarRoles();
        } catch (error: any) {
            const codigo = error.response?.status;
            const mensaje = String(
            error.response?.data?.detail ?? ""
            );

            if (codigo === 409 && !rol.esta_activo) {
            setModalTitulo("No se puede desactivar");
            setModalMensaje(
                `El rol "${rol.nombre}" tiene usuarios activos asignados.\n\n` +
                "Para desactivarlo, primero debes desactivar las cuentas de esos usuarios."
            );
            setModalVisible(true);
            return;
            }

            setModalTitulo("No se pudo cambiar el estado");
            setModalMensaje(
            mensaje || "Ocurrió un problema. Intenta nuevamente."
            );
            setModalVisible(true);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            >
            <Pressable onPress={() => router.back()}>
                <Text style={styles.back}>← Volver </Text>
            </Pressable>

            <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>

            <Text style={styles.title}>Roles y accesos</Text>

            <Text style={styles.subtitle}>
                Administra los roles disponibles para las cuentas de VITALIA.
            </Text>

            <View style={styles.form}>
                <Text style={styles.formTitle}>
                {editando === null
                    ? "Crear rol"
                    : `Editar rol #${editando}`}
                </Text>

                <Text style={styles.label}>Nombre del rol</Text>

                <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Coordinación"
                style={styles.input}
                maxLength={100}
                />

                <Text style={styles.label}>Descripción</Text>

                <TextInput
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Responsabilidades del rol"
                style={[styles.input, styles.textarea]}
                multiline
                />

                <Pressable
                disabled={guardando}
                onPress={guardar}
                style={[
                    styles.primary,
                    guardando && styles.disabled,
                ]}
                >
                {guardando ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.primaryText}>
                    {editando === null
                        ? "Crear rol"
                        : "Guardar cambios"}
                    </Text>
                )}
                </Pressable>

                {editando !== null && (
                <Pressable
                    onPress={limpiar}
                    style={styles.cancel}
                >
                    <Text style={styles.cancelText}>
                    Cancelar edición
                    </Text>
                </Pressable>
                )}
            </View>

            <Text style={styles.listTitle}>
                Roles registrados ({roles.length})
            </Text>

            {cargando ? (
                <ActivityIndicator
                size="large"
                color="#247F76"
                />
            ) : roles.length === 0 ? (
                <Text style={styles.note}>
                No hay roles registrados.
                </Text>
            ) : (
                roles.map((rol) => (
                <View key={rol.id_PK} style={styles.card}>
                    <View style={styles.cardTop}>
                    <View style={styles.roleIcon}>
                        <Text style={styles.roleIconText}>
                        {rol.nombre.charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.roleInfo}>
                        <Text style={styles.roleName}>
                        {rol.nombre}
                        </Text>

                        <Text style={styles.roleDescription}>
                        {rol.descripcion || "Sin descripción"}
                        </Text>

                        <Text
                        style={[
                            styles.status,
                            rol.esta_activo
                            ? styles.active
                            : styles.inactive,
                        ]}
                        >
                        {rol.esta_activo ? "Activo" : "Inactivo"}
                        </Text>
                    </View>
                    </View>

                    <View style={styles.actions}>
                    <Pressable
                        style={styles.secondary}
                        onPress={() => seleccionarEdicion(rol)}
                    >
                        <Text style={styles.secondaryText}>
                        Editar
                        </Text>
                    </Pressable>

                    {rol.id_PK !== 1 && (
                        <Pressable
                        style={styles.secondary}
                        onPress={() => cambiarEstado(rol)}
                        >
                        <Text style={styles.secondaryText}>
                            {rol.esta_activo
                            ? "Desactivar"
                            : "Activar"}
                        </Text>
                        </Pressable>
                    )}
                    </View>
                </View>
                ))
            )}

            <Text style={styles.note}>
                Los roles con usuarios activos asignados no pueden
                desactivarse. El rol Administrador está protegido.
            </Text>

            
            <Modal
                visible={modalEdicionVisible}
                transparent
                animationType="fade"
                onRequestClose={limpiar}
            >
                <View style={styles.editModalOverlay}>
                    <View style={styles.editModalCard}>
                        <View style={styles.editModalHeader}>
                            <View style={styles.editModalIcon}>
                                <Text style={styles.editModalIconText}>
                                    ✎
                                </Text>
                            </View>

                            <View style={styles.editModalHeaderInfo}>
                                <Text style={styles.editModalEyebrow}>
                                    ADMINISTRACIÓN
                                </Text>

                                <Text style={styles.editModalTitle}>
                                    Editar rol
                                </Text>

                                <Text style={styles.editModalSubtitle}>
                                    Modifica el nombre y las responsabilidades del rol.
                                </Text>
                            </View>

                            <Pressable
                                onPress={limpiar}
                                disabled={guardando}
                                style={styles.editModalClose}
                            >
                                <Text style={styles.editModalCloseText}>
                                    ×
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.editModalDivider} />

                        <Text style={styles.label}>
                            Nombre del rol
                        </Text>

                        <TextInput
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Ej. Coordinación"
                            placeholderTextColor="#A2B0AD"
                            style={styles.editModalInput}
                            maxLength={100}
                            editable={!guardando}
                        />

                        <Text style={styles.label}>
                            Descripción
                        </Text>

                        <TextInput
                            value={descripcion}
                            onChangeText={setDescripcion}
                            placeholder="Responsabilidades del rol"
                            placeholderTextColor="#A2B0AD"
                            style={[
                                styles.editModalInput,
                                styles.textarea,
                            ]}
                            multiline
                            editable={!guardando}
                        />

                        <View style={styles.editModalActions}>
                            <Pressable
                                onPress={limpiar}
                                disabled={guardando}
                                style={styles.editModalCancel}
                            >
                                <Text style={styles.editModalCancelText}>
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={guardar}
                                disabled={guardando}
                                style={[
                                    styles.editModalSave,
                                    guardando && styles.disabled,
                                ]}
                            >
                                {guardando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.editModalSaveText}>
                                        Guardar cambios
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
      
            <Modal
            transparent
            visible={modalVisible}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                    <View style={styles.modalIcon}>
                        <Text style={styles.modalIconText}>!</Text>
                    </View>

                    <Text style={styles.modalTitle}>
                        {modalTitulo}
                    </Text>

                    <Text style={styles.modalMessage}>
                        {modalMensaje}
                    </Text>

                    <View style={styles.modalInfo}>
                        <Text style={styles.modalInfoText}>
                        Los roles con usuarios activos no se pueden desactivar.
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => setModalVisible(false)}
                        style={styles.modalButton}
                    >
                        <Text style={styles.modalButtonText}>
                        Entendido
                        </Text>
                    </Pressable>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={alerta.visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                presentationStyle="overFullScreen"
                onRequestClose={cerrarAlerta}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View
                            style={[
                                styles.modalIcon,
                                alerta.tipo === "exito" && {
                                    backgroundColor: "#E0F2EE",
                                    borderColor: "#CDE9E2",
                                },
                                alerta.tipo === "error" && {
                                    backgroundColor: "#FCECEC",
                                    borderColor: "#F5D0D0",
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.modalIconText,
                                    alerta.tipo === "exito" && {
                                        color: "#247F76",
                                    },
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

                        <Pressable
                            onPress={cerrarAlerta}
                            style={styles.modalButton}
                        >
                            <Text style={styles.modalButtonText}>
                                Entendido
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
        backgroundColor: "#F3F7F6",
    },
    content: {
        padding: 24,
        paddingBottom: 50,
        maxWidth: 1120,
        width: "100%",
        alignSelf: "center",
    },
    back: {
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 10,
        alignSelf: "flex-start",
        color: "#247F76",
        fontWeight: "700",
        marginBottom: 20,
    },
    eyebrow: {
        color: "#247F76",
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    title: {
        color: "#173F3A",
        fontSize: 30,
        fontWeight: "800",
        marginTop: 6,
    },
    subtitle: {
        color: "#71817D",
        fontSize: 14,
        marginTop: 8,
        marginBottom: 24,
    },
    form: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E4EEEB",
        marginBottom: 28,
    },
    formTitle: {
        color: "#173F3A",
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 16,
    },
    label: {
        color: "#52645F",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 7,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: "#D8E5E1",
        borderRadius: 10,
        backgroundColor: "#FBFDFC",
        padding: 12,
        color: "#173F3A",
    },
    textarea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    primary: {
        backgroundColor: "#247F76",
        padding: 13,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 16,
    },
    primaryText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
    disabled: {
        opacity: 0.6,
    },
    cancel: {
        padding: 12,
        alignItems: "center",
    },
    cancelText: {
        color: "#6B7B76",
        fontWeight: "700",
    },
    listTitle: {
        color: "#173F3A",
        fontSize: 19,
        fontWeight: "800",
        marginBottom: 12,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 15,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E4EEEB",
        marginBottom: 12,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "center",
    },
    roleIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: "#E2F4F0",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    roleIconText: {
        color: "#247F76",
        fontSize: 18,
        fontWeight: "800",
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        color: "#26443F",
        fontSize: 15,
        fontWeight: "800",
    },
    roleDescription: {
        color: "#879691",
        fontSize: 12,
        marginTop: 4,
    },
    status: {
        fontSize: 11,
        fontWeight: "800",
        marginTop: 7,
    },
    active: {
        color: "#16805D",
    },
    inactive: {
        color: "#B45309",
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 14,
    },
    secondary: {
        borderWidth: 1,
        borderColor: "#CDE2DD",
        borderRadius: 9,
        paddingVertical: 9,
        paddingHorizontal: 13,
    },
    secondaryText: {
        color: "#247F76",
        fontSize: 12,
        fontWeight: "800",
    },
    note: {
        color: "#71817D",
        fontSize: 12,
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 30,
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

    editModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 42, 38, 0.58)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    editModalCard: {
        width: "100%",
        maxWidth: 540,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 26,
        borderWidth: 1,
        borderColor: "#E2EEEB",
        shadowColor: "#173F3A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
    },

    editModalHeader: {
        flexDirection: "row",
        alignItems: "center",
    },

    editModalIcon: {
        width: 48,
        height: 48,
        borderRadius: 15,
        backgroundColor: "#DDF3EF",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 13,
    },

    editModalIconText: {
        color: "#247F76",
        fontSize: 25,
        fontWeight: "800",
    },

    editModalHeaderInfo: {
        flex: 1,
    },

    editModalEyebrow: {
        color: "#2A8C82",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1.4,
    },

    editModalTitle: {
        color: "#173F3A",
        fontSize: 23,
        fontWeight: "900",
        marginTop: 3,
    },

    editModalSubtitle: {
        color: "#82938F",
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
    },

    editModalClose: {
        width: 34,
        height: 34,
        borderRadius: 11,
        backgroundColor: "#F1F6F4",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },

    editModalCloseText: {
        color: "#536A65",
        fontSize: 25,
        lineHeight: 28,
    },

    editModalDivider: {
        height: 1,
        backgroundColor: "#EDF3F1",
        marginVertical: 23,
    },

    editModalInput: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: "#DDE8E5",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: "#173F3A",
        backgroundColor: "#FBFDFC",
        marginBottom: 12,
    },

    editModalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 14,
    },

    editModalCancel: {
        minHeight: 46,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D8E4E1",
        alignItems: "center",
        justifyContent: "center",
    },

    editModalCancelText: {
        color: "#536A65",
        fontSize: 12,
        fontWeight: "800",
    },

    editModalSave: {
        minHeight: 46,
        minWidth: 145,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: "#247F76",
        alignItems: "center",
        justifyContent: "center",
    },

    editModalSaveText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },
});