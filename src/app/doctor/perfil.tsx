import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; // SDK <= 53: "expo-file-system"
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useTheme, type Theme } from "../../theme/theme";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

/* ============================================================
   TIPOS
============================================================ */

type Especialidad = {
  id_PK: number;
  nombre: string;
  cedula_profesional?: string | null;
  documento_validez?: string | null;
};

type PerfilDoctor = {
  id_PK: number;
  usuario_id_FK: number;
  nombre: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  correo_electronico: string;
  numero_licencia: string | null;
  estado: string | null;
  costo_consulta: number | string | null;
  especialidades: Especialidad[];
};

type ArchivoPendiente = {
  especialidad: Especialidad;
  archivo: DocumentPicker.DocumentPickerAsset;
};

type Notificacion = {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: "exito" | "error";
};

const BP_TABLA = 720;

/* ============================================================
   COMPONENTES
============================================================ */

function Avatar({ nombre, size = 64 }: { nombre: string; size?: number }) {
  const c = useTheme();
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.tileBg,
        borderWidth: 1,
        borderColor: c.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: c.primary, fontWeight: "800", fontSize: size * 0.36 }}
      >
        {iniciales || "?"}
      </Text>
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = useTheme();
  const color = danger ? c.error : c.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      ref={(el) => {
        // Tooltip al pasar el cursor (solo web)
        if (Platform.OS === "web" && el) {
          (el as any).setAttribute?.("title", label);
        }
      }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: pressed ? c.activeBg : c.hoverBg,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

function AlertaPersonalizada({
  visible,
  titulo,
  mensaje,
  tipo,
  onCerrar,
}: Notificacion & { onCerrar: () => void }) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const esError = tipo === "error";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View
            style={[
              styles.dialogIcon,
              { backgroundColor: esError ? c.errorBg : c.tileBg },
            ]}
          >
            <Ionicons
              name={esError ? "alert" : "checkmark"}
              size={32}
              color={esError ? c.error : c.primary}
            />
          </View>
          <Text style={styles.dialogTitle}>{titulo}</Text>
          <Text style={styles.dialogMessage}>{mensaje}</Text>
          <Pressable
            onPress={onCerrar}
            style={({ pressed }) => [
              styles.primaryButton,
              { width: "100%" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryButtonText}>Aceptar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type TablaProps = {
  items: Especialidad[];
  subiendoId: number | null;
  onVerPdf: (e: Especialidad) => void;
  onSubir: (e: Especialidad) => void;
  onEditarCedula: (e: Especialidad) => void;
  onEliminar: (e: Especialidad) => void;
};

function EspecialidadesTabla({
  items,
  subiendoId,
  onVerPdf,
  onSubir,
  onEditarCedula,
  onEliminar,
}: TablaProps) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { width } = useWindowDimensions();
  const esAncho = width >= BP_TABLA;

  const Estado = ({ ok }: { ok: boolean }) => (
    <View style={[styles.docBadge, ok ? styles.docBadgeOk : styles.docBadgePend]}>
      <Ionicons
        name={ok ? "checkmark-circle" : "time-outline"}
        size={14}
        color={ok ? c.success : c.warning}
      />
      <Text
        style={{
          color: ok ? c.success : c.warning,
          fontSize: 12,
          fontWeight: "800",
        }}
      >
        {ok ? "Cargado" : "Pendiente"}
      </Text>
    </View>
  );

  const Acciones = ({ e }: { e: Especialidad }) => {
    const tieneDoc = Boolean(e.documento_validez);
    return (
      <View style={styles.accionesRow}>
        {tieneDoc && (
          <IconAction
            icon="eye-outline"
            label="Ver PDF"
            onPress={() => onVerPdf(e)}
          />
        )}
        <IconAction
          icon="cloud-upload-outline"
          label={tieneDoc ? "Reemplazar" : "Subir PDF"}
          onPress={() => onSubir(e)}
          disabled={subiendoId === e.id_PK}
        />
        <IconAction
          icon="create-outline"
          label="Editar cédula"
          onPress={() => onEditarCedula(e)}
        />
        <IconAction
          icon="trash-outline"
          label="Eliminar"
          onPress={() => onEliminar(e)}
          danger
        />
      </View>
    );
  };

  if (esAncho) {
    return (
      <View style={styles.tabla}>
        <View style={[styles.fila, styles.filaHeader]}>
          <Text style={[styles.th, { flex: 2 }]}>Especialidad</Text>
          <Text style={[styles.th, { flex: 1.3 }]}>Cédula</Text>
          <Text style={[styles.th, { flex: 1 }]}>Documento</Text>
          <Text style={[styles.th, { flex: 1.8, textAlign: "right" }]}>
            Acciones
          </Text>
        </View>

        {items.map((e, i) => (
          <View
            key={e.id_PK}
            style={[styles.fila, i % 2 === 1 && styles.filaAlterna]}
          >
            <Text
              style={[styles.td, { flex: 2, fontWeight: "800" }]}
              numberOfLines={2}
            >
              {e.nombre}
            </Text>
            <Text style={[styles.td, { flex: 1.3 }]} numberOfLines={1}>
              {e.cedula_profesional || "—"}
            </Text>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Estado ok={Boolean(e.documento_validez)} />
            </View>
            <View style={{ flex: 1.8, alignItems: "flex-end" }}>
              <Acciones e={e} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      {items.map((e) => (
        <View key={e.id_PK} style={styles.specialtyCard}>
          <View style={styles.cardTop}>
            <Text style={[styles.specialtyTitle, { flex: 1 }]}>{e.nombre}</Text>
            <Estado ok={Boolean(e.documento_validez)} />
          </View>
          <Text style={styles.cedulaLinea}>
            Cédula:{" "}
            <Text style={{ color: c.text, fontWeight: "700" }}>
              {e.cedula_profesional || "—"}
            </Text>
          </Text>
          <View style={styles.divider} />
          <Acciones e={e} />
        </View>
      ))}
    </View>
  );
}

/* ============================================================
   PANTALLA
============================================================ */

export default function PerfilDoctorScreen() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const router = useRouter();
  const { token } = useAuth();

  const [perfil, setPerfil] = useState<PerfilDoctor | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  const [licencia, setLicencia] = useState("");
  const [costo, setCosto] = useState("");

  const [cedulas, setCedulas] = useState<Record<number, string>>({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [modalEspecialidad, setModalEspecialidad] = useState(false);
  const [agregandoEspecialidad, setAgregandoEspecialidad] = useState<
    number | null
  >(null);

  const [modalEliminar, setModalEliminar] = useState(false);
  const [especialidadEliminar, setEspecialidadEliminar] =
    useState<Especialidad | null>(null);
  const [eliminandoEspecialidad, setEliminandoEspecialidad] = useState(false);

  const [especialidadCedula, setEspecialidadCedula] =
    useState<Especialidad | null>(null);
  const [cedulaTemp, setCedulaTemp] = useState("");

  const [modalVistaPrevia, setModalVistaPrevia] = useState(false);
  const [archivoPendiente, setArchivoPendiente] =
    useState<ArchivoPendiente | null>(null);
  const [subiendoDocumento, setSubiendoDocumento] = useState<number | null>(
    null
  );

  const [notificacion, setNotificacion] = useState<Notificacion>({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "exito",
  });

  const headers = { Authorization: `Bearer ${token}` };

  const mostrarNotificacion = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" = "exito"
  ) => setNotificacion({ visible: true, titulo, mensaje, tipo });

  /* ---------- Carga ---------- */

  const cargarDatos = async () => {
    if (!token) return;
    setCargando(true);
    setError("");

    try {
      const [rPerfil, rEsp] = await Promise.all([
        api.get("/api/doctores/perfil", { headers }),
        api.get("/api/especialidades/", { headers }),
      ]);

      const datos: PerfilDoctor = rPerfil.data;
      setPerfil(datos);
      setEspecialidades(rEsp.data as Especialidad[]);

      setLicencia(datos.numero_licencia ?? "");
      setCosto(datos.costo_consulta != null ? String(datos.costo_consulta) : "");

      const asignadas = datos.especialidades ?? [];
      setCedulas(
        Object.fromEntries(
          asignadas.map((e) => [e.id_PK, e.cedula_profesional ?? ""])
        )
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          "No fue posible cargar tu perfil profesional."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) cargarDatos();
  }, [token]);

  /* ---------- Utilidades ---------- */

  const nombreCompleto = perfil
    ? [perfil.nombre, perfil.apellido_paterno, perfil.apellido_materno]
        .filter(Boolean)
        .join(" ")
    : "";

  const idsAsignados = perfil?.especialidades.map((e) => e.id_PK) ?? [];

  const construirEspecialidades = (
    ids: number[],
    sobrescribir?: Record<number, string>
  ) =>
    ids.map((id) => {
      const existente = perfil?.especialidades.find((e) => e.id_PK === id);
      return {
        id_PK: id,
        cedula_profesional:
          sobrescribir?.[id]?.trim() ||
          cedulas[id]?.trim() ||
          existente?.cedula_profesional ||
          null,
      };
    });

  const costoNumerico = costo.trim() === "" ? null : Number(costo);

  const guardarPerfil = (
    ids: number[],
    sobrescribir?: Record<number, string>
  ) =>
    api.put(
      "/api/doctores/perfil",
      {
        numero_licencia: licencia.trim() || null,
        costo_consulta: costoNumerico,
        especialidad_ids: ids,
        especialidades: construirEspecialidades(ids, sobrescribir),
      },
      { headers }
    );

  /* ---------- Agregar especialidad ---------- */

  const agregarEspecialidad = async (id: number) => {
    if (!perfil || !token) return;

    if (idsAsignados.includes(id)) {
      mostrarNotificacion(
        "Especialidad existente",
        "Esta especialidad ya está asignada a tu perfil.",
        "error"
      );
      return;
    }

    const especialidad = especialidades.find((e) => e.id_PK === id);
    if (!especialidad) return;

    setAgregandoEspecialidad(id);
    try {
      await guardarPerfil([...idsAsignados, id]);
      setModalEspecialidad(false);
      await cargarDatos();
      mostrarNotificacion(
        "Especialidad agregada",
        `${especialidad.nombre} se agregó a tu perfil profesional.`
      );
    } catch (err: any) {
      mostrarNotificacion(
        "No fue posible agregar la especialidad",
        err?.response?.data?.detail ?? "Ocurrió un error al guardar.",
        "error"
      );
    } finally {
      setAgregandoEspecialidad(null);
    }
  };

  /* ---------- Cédula ---------- */

  const abrirEditarCedula = (e: Especialidad) => {
    setCedulaTemp(cedulas[e.id_PK] ?? e.cedula_profesional ?? "");
    setEspecialidadCedula(e);
  };

  const guardarCedula = async () => {
    if (!perfil || !token || !especialidadCedula) return;

    const id = especialidadCedula.id_PK;
    const cedula = cedulaTemp.trim();

    if (!cedula) {
      mostrarNotificacion(
        "Cédula requerida",
        "Ingresa la cédula profesional de esta especialidad.",
        "error"
      );
      return;
    }

    setGuardando(true);
    try {
      await guardarPerfil(idsAsignados, { [id]: cedula });
      const nombre = especialidadCedula.nombre;
      setEspecialidadCedula(null);
      await cargarDatos();
      mostrarNotificacion(
        "Cédula actualizada",
        `La cédula de ${nombre} se guardó correctamente.`
      );
    } catch (err: any) {
      mostrarNotificacion(
        "Error al guardar la cédula",
        err?.response?.data?.detail ??
          "No fue posible actualizar la cédula profesional.",
        "error"
      );
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Eliminar ---------- */

  const cancelarEliminar = () => {
    if (eliminandoEspecialidad) return;
    setModalEliminar(false);
    setEspecialidadEliminar(null);
  };

  const eliminarEspecialidad = async () => {
    if (!perfil || !especialidadEliminar || !token) return;

    const idEliminar = especialidadEliminar.id_PK;
    const nuevosIds = idsAsignados.filter((id) => id !== idEliminar);

    setEliminandoEspecialidad(true);
    try {
      await guardarPerfil(nuevosIds);
      setModalEliminar(false);
      setEspecialidadEliminar(null);
      await cargarDatos();
      mostrarNotificacion(
        "Especialidad eliminada",
        "La especialidad se quitó de tu perfil profesional."
      );
    } catch (err: any) {
      mostrarNotificacion(
        "No fue posible eliminar la especialidad",
        err?.response?.data?.detail ?? "Ocurrió un error al eliminar.",
        "error"
      );
    } finally {
      setEliminandoEspecialidad(false);
    }
  };

  /* ---------- Seleccionar PDF ---------- */

  const seleccionarDocumento = async (especialidad: Especialidad) => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (resultado.canceled || !resultado.assets?.[0]) return;
      const archivo = resultado.assets[0];

      const esPDF =
        archivo.name?.toLowerCase().endsWith(".pdf") ||
        archivo.mimeType === "application/pdf";

      if (!esPDF) {
        mostrarNotificacion(
          "Archivo no válido",
          "El documento debe estar en formato PDF.",
          "error"
        );
        return;
      }

      if (archivo.size != null && archivo.size > 10 * 1024 * 1024) {
        mostrarNotificacion(
          "Archivo demasiado grande",
          "El PDF no debe superar los 10 MB.",
          "error"
        );
        return;
      }

      setArchivoPendiente({ especialidad, archivo });
      setModalVistaPrevia(true);
    } catch (err: any) {
      mostrarNotificacion(
        "Error al seleccionar el archivo",
        err?.message ?? "No fue posible seleccionar el documento.",
        "error"
      );
    }
  };

  /* ---------- Vista previa antes de subir ---------- */

  const abrirVistaPrevia = async () => {
    if (!archivoPendiente) return;
    const { archivo } = archivoPendiente;

    try {
      if (Platform.OS === "web") {
        const archivoWeb: File | undefined = (archivo as any).file;
        const url = archivoWeb ? URL.createObjectURL(archivoWeb) : archivo.uri;
        window.open(url, "_blank");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(archivo.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        throw new Error("Visor no disponible");
      }
    } catch {
      mostrarNotificacion(
        "No se pudo abrir el PDF",
        "No fue posible abrir el archivo en el visor del dispositivo.",
        "error"
      );
    }
  };

  /* ---------- Ver PDF ya subido ---------- */

  const abrirDocumentoCargado = async (e: Especialidad) => {
    if (!e.documento_validez) return;

    const base = (api.defaults.baseURL ?? "").replace(/\/$/, "");
    const url = `${base}/api/doctores/perfil/especialidades/${e.id_PK}/documento`;

    try {
      if (Platform.OS === "web") {
        // fetch con Authorization -> blob -> pestaña nueva
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(String(resp.status));
        const blob = await resp.blob();
        window.open(URL.createObjectURL(blob), "_blank");
      } else {
        const destino = `${FileSystem.cacheDirectory}doc-${e.id_PK}.pdf`;
        const descarga = await FileSystem.downloadAsync(url, destino, {
          headers,
        });
        if (descarga.status !== 200) throw new Error(String(descarga.status));
        await Sharing.shareAsync(descarga.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      }
    } catch {
      mostrarNotificacion(
        "No se pudo abrir el PDF",
        "El documento no está disponible o no tienes permiso para verlo.",
        "error"
      );
    }
  };

  /* ---------- Subir PDF ---------- */

  const confirmarSubidaDocumento = async () => {
    if (!archivoPendiente || !token) return;
    const { especialidad, archivo } = archivoPendiente;

    try {
      const datos = new FormData();
      const archivoWeb = (archivo as any).file;

      if (archivoWeb) {
        datos.append("archivo", archivoWeb, archivo.name);
      } else {
        datos.append("archivo", {
          uri: archivo.uri,
          name: archivo.name || "documento.pdf",
          type: "application/pdf",
        } as any);
      }

      setSubiendoDocumento(especialidad.id_PK);

      await api.post(
        `/api/doctores/perfil/especialidades/${especialidad.id_PK}/documento`,
        datos,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setModalVistaPrevia(false);
      setArchivoPendiente(null);
      await cargarDatos();
      mostrarNotificacion(
        "Documento cargado",
        `El documento de validez de ${especialidad.nombre} se guardó correctamente.`
      );
    } catch (err: any) {
      mostrarNotificacion(
        "Error al subir el documento",
        err?.response?.data?.detail ?? "No fue posible cargar el documento PDF.",
        "error"
      );
    } finally {
      setSubiendoDocumento(null);
    }
  };

  /* ---------- Guardar datos generales ---------- */

  const guardarCambios = async () => {
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
      await guardarPerfil(idsAsignados);
      await cargarDatos();
      mostrarNotificacion(
        "Cambios guardados",
        "Tu perfil profesional se actualizó correctamente."
      );
    } catch (err: any) {
      const mensaje =
        err?.response?.data?.detail ??
        "No fue posible guardar los cambios. Revisa la conexión con el servidor.";
      setError(mensaje);
      mostrarNotificacion("Error al guardar", mensaje, "error");
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Render ---------- */

  if (cargando && !perfil) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={styles.loadingText}>Cargando perfil profesional...</Text>
      </View>
    );
  }

  const disponibles = especialidades.filter(
    (e) => !idsAsignados.includes(e.id_PK)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={16} color={c.primary} />
          <Text style={styles.back}>Volver al panel</Text>
        </Pressable>

        <Text style={styles.heading}>Mi perfil profesional</Text>
        <Text style={styles.subtitle}>
          Consulta y actualiza tu información profesional.
        </Text>

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
            {/* CABECERA */}
            <View style={[styles.card, styles.profileHeader]}>
              <Avatar nombre={nombreCompleto} />
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={styles.profileName}>{nombreCompleto}</Text>
                <Text style={styles.profileEmail}>
                  {perfil.correo_electronico}
                </Text>
              </View>
              <View style={styles.estadoBadge}>
                <Text style={styles.estadoBadgeText}>
                  {perfil.estado ?? "Sin estado"}
                </Text>
              </View>
            </View>

            {/* INFORMACIÓN PROFESIONAL */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Información profesional</Text>

              <Text style={styles.label}>Número de licencia profesional</Text>
              <TextInput
                style={styles.input}
                value={licencia}
                onChangeText={setLicencia}
                placeholder="Ej. LIC-001"
                placeholderTextColor={c.muted}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Costo de consulta (MXN)</Text>
              <TextInput
                style={styles.input}
                value={costo}
                onChangeText={setCosto}
                placeholder="Ej. 500"
                placeholderTextColor={c.muted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* ESPECIALIDADES */}
            <View style={styles.card}>
              <View style={styles.seccionEspecialidades}>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>
                    Especialidades
                  </Text>
                  <Text style={styles.helper}>
                    Administra tus especialidades, cédulas y documentos de
                    validez. Formato PDF, máximo 10 MB.
                  </Text>
                </View>

                <Pressable
                  style={styles.outlineButton}
                  onPress={() => setModalEspecialidad(true)}
                >
                  <Ionicons name="add" size={16} color={c.primary} />
                  <Text style={styles.outlineButtonText}>
                    Agregar especialidad
                  </Text>
                </Pressable>
              </View>

              {perfil.especialidades.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>
                    Aún no tienes especialidades
                  </Text>
                  <Text style={styles.helper}>
                    Agrega una especialidad para completar tu perfil.
                  </Text>
                </View>
              ) : (
                <EspecialidadesTabla
                  items={perfil.especialidades}
                  subiendoId={subiendoDocumento}
                  onVerPdf={abrirDocumentoCargado}
                  onSubir={seleccionarDocumento}
                  onEditarCedula={abrirEditarCedula}
                  onEliminar={(e) => {
                    setEspecialidadEliminar(e);
                    setModalEliminar(true);
                  }}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* BARRA FIJA DE GUARDADO */}
      {perfil && (
        <View style={styles.saveBar}>
          <View style={styles.saveBarInner}>
            <Pressable
              style={[styles.primaryButton, guardando && styles.disabled]}
              disabled={guardando}
              onPress={guardarCambios}
            >
              {guardando ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Guardar cambios del perfil
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <AlertaPersonalizada
        {...notificacion}
        onCerrar={() => setNotificacion((a) => ({ ...a, visible: false }))}
      />

      {/* MODAL: AGREGAR ESPECIALIDAD */}
      <Modal
        visible={modalEspecialidad}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEspecialidad(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Agregar especialidad</Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona la especialidad que deseas agregar a tu perfil.
                </Text>
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={() => setModalEspecialidad(false)}
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={18} color={c.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {disponibles.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>
                    No hay especialidades disponibles
                  </Text>
                  <Text style={styles.helper}>
                    Ya tienes asignadas todas las especialidades del catálogo.
                  </Text>
                </View>
              ) : (
                disponibles.map((e) => {
                  const agregando = agregandoEspecialidad === e.id_PK;
                  return (
                    <Pressable
                      key={e.id_PK}
                      style={({ pressed }) => [
                        styles.listItem,
                        pressed && { backgroundColor: c.hoverBg },
                        agregando && styles.disabled,
                      ]}
                      onPress={() => agregarEspecialidad(e.id_PK)}
                      disabled={agregandoEspecialidad !== null}
                    >
                      <Text style={styles.listItemText}>{e.nombre}</Text>
                      {agregando ? (
                        <ActivityIndicator color={c.primary} />
                      ) : (
                        <Ionicons name="add-circle-outline" size={22} color={c.primary} />
                      )}
                    </Pressable>
                  );
                })
              )}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={c.info} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>
                    ¿No encuentras tu especialidad?
                  </Text>
                  <Text style={styles.infoText}>
                    Comunícate con coordinación para que la agreguen al
                    catálogo de Vitalia.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              style={styles.textButton}
              onPress={() => setModalEspecialidad(false)}
              disabled={agregandoEspecialidad !== null}
            >
              <Text style={styles.textButtonLabel}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDITAR CÉDULA */}
      <Modal
        visible={especialidadCedula !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !guardando && setEspecialidadCedula(null)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Editar cédula profesional</Text>
            <Text style={styles.modalSubtitle}>
              {especialidadCedula?.nombre}
            </Text>

            <TextInput
              style={styles.input}
              value={cedulaTemp}
              onChangeText={setCedulaTemp}
              placeholder="Ingresa tu cédula profesional"
              placeholderTextColor={c.muted}
              maxLength={100}
              autoFocus
            />

            <Pressable
              style={[
                styles.primaryButton,
                { marginTop: 18 },
                guardando && styles.disabled,
              ]}
              onPress={guardarCedula}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar cédula</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.textButton}
              onPress={() => setEspecialidadCedula(null)}
              disabled={guardando}
            >
              <Text style={styles.textButtonLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      <Modal
        visible={modalEliminar}
        transparent
        animationType="fade"
        onRequestClose={cancelarEliminar}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={[styles.dialogIcon, { backgroundColor: c.errorBg }]}>
              <Ionicons name="trash-outline" size={28} color={c.error} />
            </View>
            <Text style={styles.dialogTitle}>Eliminar especialidad</Text>
            <Text style={styles.dialogMessage}>
              ¿Seguro que deseas eliminar{" "}
              <Text style={{ color: c.text, fontWeight: "800" }}>
                {especialidadEliminar?.nombre}
              </Text>{" "}
              de tu perfil profesional?
            </Text>

            <Pressable
              style={[
                styles.primaryButton,
                { width: "100%", backgroundColor: c.error },
                eliminandoEspecialidad && styles.disabled,
              ]}
              onPress={eliminarEspecialidad}
              disabled={eliminandoEspecialidad}
            >
              {eliminandoEspecialidad ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: "#FFFFFF" }]}>
                  Sí, eliminar
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.textButton}
              onPress={cancelarEliminar}
              disabled={eliminandoEspecialidad}
            >
              <Text style={styles.textButtonLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: REVISAR PDF ANTES DE SUBIR */}
      <Modal
        visible={modalVistaPrevia}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (subiendoDocumento === null) {
            setModalVistaPrevia(false);
            setArchivoPendiente(null);
          }
        }}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Revisar documento</Text>
            <Text style={styles.modalSubtitle}>
              Verifica que seleccionaste el documento correcto antes de
              subirlo.
            </Text>

            {archivoPendiente && (
              <>
                <View style={styles.fileBox}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="document-text" size={26} color={c.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={2}>
                      {archivoPendiente.archivo.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {archivoPendiente.archivo.size != null
                        ? `${(archivoPendiente.archivo.size / (1024 * 1024)).toFixed(2)} MB`
                        : "Tamaño no disponible"}
                      {" · "}
                      {archivoPendiente.especialidad.nombre}
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.outlineButton} onPress={abrirVistaPrevia}>
                  <Ionicons name="eye-outline" size={16} color={c.primary} />
                  <Text style={styles.outlineButtonText}>
                    Ver PDF seleccionado
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={[
                styles.primaryButton,
                { marginTop: 18 },
                subiendoDocumento !== null && styles.disabled,
              ]}
              onPress={confirmarSubidaDocumento}
              disabled={subiendoDocumento !== null || !archivoPendiente}
            >
              {subiendoDocumento !== null ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Confirmar y subir PDF</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.textButton}
              onPress={() => {
                setModalVistaPrevia(false);
                setArchivoPendiente(null);
              }}
              disabled={subiendoDocumento !== null}
            >
              <Text style={styles.textButtonLabel}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ============================================================
   ESTILOS (solo tokens del theme)
============================================================ */

const sombra = (c: Theme, alpha = 0.12) =>
  Platform.select({
    web: { boxShadow: `0 8px 24px rgba(0,0,0,${alpha})` } as any,
    default: {
      shadowColor: c.glassShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: alpha,
      shadowRadius: 20,
      elevation: 12,
    },
  });

const createStyles = (c: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: {
      width: "100%",
      maxWidth: 900,
      alignSelf: "center",
      padding: 24,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.bg,
    },
    loadingText: { marginTop: 12, color: c.muted },

    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 20,
      alignSelf: "flex-start",
    },
    back: { color: c.primary, fontWeight: "700" },
    heading: { fontSize: 28, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 14, color: c.muted, marginTop: 6, marginBottom: 22 },

    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      marginBottom: 10,
    },

    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
    },
    profileName: { fontSize: 18, fontWeight: "800", color: c.text },
    profileEmail: { fontSize: 13, color: c.muted, marginTop: 2 },
    estadoBadge: {
      backgroundColor: c.activeBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    estadoBadgeText: {
      color: c.activeFg,
      fontWeight: "800",
      fontSize: 12,
      textTransform: "capitalize",
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginBottom: 7,
      marginTop: 14,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingVertical: 12,
      fontSize: 14,
      color: c.text,
    },
    helper: { color: c.muted, fontSize: 12, lineHeight: 18 },

    errorBox: {
      backgroundColor: c.errorBg,
      borderColor: c.error,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 18,
    },
    errorText: { color: c.error },
    retry: { color: c.primary, fontWeight: "800", marginTop: 10 },

    /* Botones */
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    primaryButtonText: { color: c.onPrimary, fontWeight: "800", fontSize: 15 },
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.tileBg,
      borderRadius: 11,
      paddingHorizontal: 15,
      paddingVertical: 11,
    },
    outlineButtonText: { color: c.primary, fontSize: 13, fontWeight: "800" },
    textButton: { paddingVertical: 13, alignItems: "center", marginTop: 4 },
    textButtonLabel: { color: c.primary, fontSize: 14, fontWeight: "800" },
    disabled: { opacity: 0.55 },

    /* Barra fija */
    saveBar: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 28 : 14,
    },
    saveBarInner: { width: "100%", maxWidth: 900, alignSelf: "center" },

    /* Especialidades */
    seccionEspecialidades: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    },
    emptyBox: {
      padding: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgSoft,
      marginTop: 12,
    },
    emptyTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 5,
    },

    tabla: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      overflow: "hidden",
      marginTop: 14,
    },
    fila: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: 10,
    },
    filaHeader: { backgroundColor: c.tileBg, borderTopWidth: 0 },
    filaAlterna: { backgroundColor: c.hoverBg },
    th: { color: c.muted, fontSize: 12, fontWeight: "800" },
    td: { color: c.text, fontSize: 13 },

    docBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    docBadgeOk: { backgroundColor: c.successBg },
    docBadgePend: { backgroundColor: c.warningBg },
    accionesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 8,
    },

    specialtyCard: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 16,
      backgroundColor: c.card,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    specialtyTitle: { color: c.text, fontSize: 16, fontWeight: "800" },
    cedulaLinea: { color: c.muted, fontSize: 12, marginTop: 8 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },

    /* Modales */
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 35, 32, 0.58)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    dialog: {
      width: "100%",
      maxWidth: 390,
      backgroundColor: c.card,
      borderRadius: 24,
      paddingHorizontal: 28,
      paddingTop: 30,
      paddingBottom: 22,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      ...sombra(c, 0.18),
    },
    dialogIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    dialogTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      marginBottom: 10,
    },
    dialogMessage: {
      fontSize: 15,
      color: c.muted,
      textAlign: "center",
      lineHeight: 23,
      marginBottom: 24,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
      maxHeight: "85%",
      backgroundColor: c.card,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: c.border,
      ...sombra(c, 0.18),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 10,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginBottom: 7,
    },
    modalSubtitle: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 19,
      marginBottom: 14,
    },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.hoverBg,
      alignItems: "center",
      justifyContent: "center",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      marginBottom: 9,
      gap: 12,
    },
    listItemText: { flex: 1, color: c.text, fontSize: 14, fontWeight: "700" },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
      backgroundColor: c.bgSoft,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 13,
      padding: 14,
      marginTop: 12,
    },
    infoTitle: { color: c.text, fontSize: 13, fontWeight: "800", marginBottom: 4 },
    infoText: { color: c.muted, fontSize: 12, lineHeight: 19 },

    fileBox: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgSoft,
      marginBottom: 14,
      gap: 12,
    },
    fileIcon: {
      width: 48,
      height: 52,
      borderRadius: 9,
      backgroundColor: c.errorBg,
      alignItems: "center",
      justifyContent: "center",
    },
    fileName: { color: c.text, fontSize: 13, fontWeight: "800" },
    fileMeta: { color: c.muted, fontSize: 11, marginTop: 5 },
  });