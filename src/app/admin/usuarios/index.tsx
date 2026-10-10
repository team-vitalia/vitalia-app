import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Usuario {
  id_PK: number;
  nombre: string;
  correo_electronico: string;
  rol_id_FK: number | null;
  rol: string | null;
  estado: string | null;
  creado_en: string;
  ultimo_acceso: string | null;
}

export default function UsuariosScreen() {
  const router = useRouter();
  const { token, usuario } = useAuth();
  const { width } = useWindowDimensions();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  type CampoOrden =
    | "nombre"
    | "correo_electronico"
    | "rol"
    | "creado_en";

  const [filtroRol, setFiltroRol] = useState("Todos");
  const [ordenCampo, setOrdenCampo] = useState<CampoOrden>("nombre");
  const [ordenDireccion, setOrdenDireccion] = useState<"asc" | "desc">("asc");
  const [paginaActual, setPaginaActual] = useState(1);

  const usuariosPorPagina = 10;
  const esMovil = width < 700;

  const [alerta, setAlerta] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "exito" as "exito" | "error",
    alCerrar: undefined as (() => void) | undefined,
  });

  const mostrarAlerta = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" = "exito",
    alCerrar?: () => void
  ) => {
    setAlerta({
      visible: true,
      titulo,
      mensaje,
      tipo,
      alCerrar,
    });
  };

  const cerrarAlerta = () => {
    const accion = alerta.alCerrar;

    setAlerta((actual) => ({
      ...actual,
      visible: false,
      alCerrar: undefined,
    }));

    accion?.();
  };

  const obtenerUsuarios = async () => {
    try {
      setCargando(true);

      const respuesta = await api.get("/api/usuarios/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsuarios(respuesta.data);
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "No se pudieron cargar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    obtenerUsuarios();
  }, [token]);

  
  const iniciarEdicion = (item: Usuario) => {
    setEditandoId(item.id_PK);
    setEditNombre(item.nombre);
    setEditCorreo(item.correo_electronico);
  };

  const guardarEdicion = async () => {
    if (
      editandoId === null ||
      !editNombre.trim() ||
      !editCorreo.trim()
    ) {
      mostrarAlerta(
        "Datos incompletos",
        "El nombre y el correo son obligatorios.",
        "error"
      );
      return;
    }

    try {
      setGuardandoEdicion(true);

      const respuesta = await api.patch(
        `/api/usuarios/${editandoId}`,
        {
          nombre: editNombre.trim(),
          correo_electronico: editCorreo.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsuarios((actuales) =>
        actuales.map((usuario) =>
          usuario.id_PK === editandoId
            ? { ...usuario, ...respuesta.data }
            : usuario
        )
      );

      setEditandoId(null);

      mostrarAlerta(
        "¡Usuario actualizado!",
        "Los datos del usuario se actualizaron correctamente.",
        "exito"
      );
    } catch (error: any) {
      mostrarAlerta(
        "No se pudo actualizar",
        error.response?.data?.detail ||
          "Revisa los datos e intenta nuevamente.",
        "error"
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const cambiarEstado = async (item: Usuario) => {
    const nuevoEstado =
      item.estado === "activo" ? "inactivo" : "activo";

    try {
      await api.patch(
        `/api/usuarios/${item.id_PK}`,
        { estado: nuevoEstado },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsuarios((actuales) =>
        actuales.map((usuario) =>
          usuario.id_PK === item.id_PK
            ? { ...usuario, estado: nuevoEstado }
            : usuario
        )
      );

      Alert.alert(
        "Usuarios",
        `La cuenta se marcó como ${nuevoEstado}.`
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo actualizar",
        error.response?.data?.detail ||
          "Intenta nuevamente."
      );
    }
  };

  const usuariosActivos = usuarios.filter(
    (item) => item.estado === "activo"
  ).length;

  const usuariosInactivos = usuarios.filter(
    (item) => item.estado !== "activo"
  ).length;

  const rolesDisponibles = [
    "Todos",
    ...Array.from(
      new Set(
        usuarios
          .map((item) => item.rol?.trim())
          .filter((rol): rol is string => Boolean(rol))
      )
    ).sort((a, b) => a.localeCompare(b, "es")),
  ];

  const usuariosFiltrados = usuarios.filter((item) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      item.nombre.toLowerCase().includes(texto) ||
      item.correo_electronico.toLowerCase().includes(texto) ||
      (item.rol || "").toLowerCase().includes(texto);

    const coincideRol =
      filtroRol === "Todos" || item.rol === filtroRol;

    return coincideBusqueda && coincideRol;
  });

  const usuariosOrdenados = [...usuariosFiltrados].sort((a, b) => {
    let comparacion = 0;

    if (ordenCampo === "creado_en") {
      const fechaA = new Date(a.creado_en).getTime();
      const fechaB = new Date(b.creado_en).getTime();

      comparacion =
        (Number.isNaN(fechaA) ? 0 : fechaA) -
        (Number.isNaN(fechaB) ? 0 : fechaB);
    } else {
      let valorA = "";
      let valorB = "";

      switch (ordenCampo) {
        case "nombre":
          valorA = a.nombre;
          valorB = b.nombre;
          break;

        case "correo_electronico":
          valorA = a.correo_electronico;
          valorB = b.correo_electronico;
          break;

        case "rol":
          valorA = a.rol || "";
          valorB = b.rol || "";
          break;
      }

      comparacion = valorA.localeCompare(valorB, "es", {
        sensitivity: "base",
        numeric: true,
      });
    }

    return ordenDireccion === "asc" ? comparacion : -comparacion;
  });

  const totalPaginas = Math.ceil(
    usuariosOrdenados.length / usuariosPorPagina
  );

  const paginaSegura = Math.min(
    paginaActual,
    Math.max(1, totalPaginas)
  );

  const usuariosPaginados = usuariosOrdenados.slice(
    (paginaSegura - 1) * usuariosPorPagina,
    paginaSegura * usuariosPorPagina
  );

  const obtenerIniciales = (nombre: string) => {
    const partes = nombre.trim().split(" ");

    if (partes.length === 1) {
      return partes[0].charAt(0).toUpperCase();
    }

    return (
      partes[0].charAt(0) +
      partes[1].charAt(0)
    ).toUpperCase();
  };

  
  const renderUsuario = ({ item }: { item: Usuario }) => {
    const activo = item.estado === "activo";
    const esMiPerfil = item.id_PK === usuario?.id;

    return (
      <View style={styles.usuarioCard}>
        <View style={styles.usuarioPrincipal}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {obtenerIniciales(item.nombre)}
            </Text>
          </View>

          <View style={styles.usuarioInfo}>
            <Text style={styles.nombre} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.correo} numberOfLines={1}>
              {item.correo_electronico}
            </Text>
          </View>

          <View
            style={[
              styles.estadoBadge,
              activo
                ? styles.estadoBadgeActivo
                : styles.estadoBadgeInactivo,
            ]}
          >
            <View
              style={[
                styles.estadoDot,
                activo
                  ? styles.estadoDotActivo
                  : styles.estadoDotInactivo,
              ]}
            />
            <Text
              style={[
                styles.estadoBadgeText,
                activo
                  ? styles.estadoBadgeTextActivo
                  : styles.estadoBadgeTextInactivo,
              ]}
            >
              {activo ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoFila}>
          <View style={styles.infoColumna}>
            <Text style={styles.detalleLabel}>ROL</Text>
            <Text style={styles.detalleValue}>
              {item.rol || "Sin rol"}
            </Text>
          </View>

          <View style={styles.infoColumna}>
            <Text style={styles.detalleLabel}>ÚLTIMO ACCESO</Text>
            <Text style={styles.detalleValue}>
              {item.ultimo_acceso || "Sin registro"}
            </Text>
          </View>
        </View>

        <View style={styles.accionesUsuario}>
          <Pressable
            style={({ pressed }) => [
              styles.editAction,
              pressed && styles.botonPresionado,
            ]}
            onPress={() => iniciarEdicion(item)}
          >
            <Text style={styles.editActionText}>
              ✎  Editar
            </Text>
          </Pressable>

          {!esMiPerfil && (
            <Pressable
              style={({ pressed }) => [
                styles.estadoAction,
                activo
                  ? styles.estadoActionOff
                  : styles.estadoActionOn,
                pressed && styles.botonPresionado,
              ]}
              onPress={() => cambiarEstado(item)}
            >
              <Text style={styles.estadoActionText}>
                {activo ? "Desactivar cuenta" : "Activar cuenta"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contenedorVolver}>
        <Pressable
          onPress={() => router.back()}
          style={styles.botonVolver}
        >
          <Text style={styles.textoVolver}>← Volver</Text>
        </Pressable>
      </View>

      <FlatList
        data={usuariosPaginados}
        keyExtractor={(item) => item.id_PK.toString()}
        renderItem={renderUsuario}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* ENCABEZADO */}
            <View
              style={[
                styles.header,
                esMovil && styles.headerMovil,
              ]}
            >
              <View style={styles.headerInfo}>
                <Text style={styles.overline}>
                  ADMINISTRACIÓN
                </Text>

                <Text style={styles.title}>
                  Usuarios
                </Text>

                <Text style={styles.subtitle}>
                  Gestiona los usuarios y accesos de VITALIA
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.newButton,
                  pressed && styles.newButtonPressed,
                  esMovil && styles.newButtonMovil,
                ]}
                onPress={() =>
                  router.push("/admin/usuarios/crear")
                }
              >
                <Text style={styles.newButtonIcon}>
                  +
                </Text>

                <Text style={styles.newButtonText}>
                  Nuevo usuario
                </Text>
              </Pressable>
            </View>

            {/* MODAL PARA EDITAR USUARIO */}
            <Modal
              visible={editandoId !== null}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setEditandoId(null)}
            >
              <View style={styles.modalOverlay}>
                <Pressable
                  style={styles.modalBackdrop}
                  onPress={() => {
                    if (!guardandoEdicion) {
                      setEditandoId(null);
                    }
                  }}
                />

                <View style={styles.modalContainer}>
                  {/* Encabezado */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalOverline}>
                        ADMINISTRACIÓN
                      </Text>

                      <Text style={styles.modalTitle}>
                        Editar usuario
                      </Text>

                      <Text style={styles.modalSubtitle}>
                        Actualiza los datos de la cuenta seleccionada.
                      </Text>
                    </View>

                    <Pressable
                      disabled={guardandoEdicion}
                      onPress={() => setEditandoId(null)}
                      style={styles.modalCloseButton}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </Pressable>
                  </View>

                  {/* Identificador */}
                  <View style={styles.modalUserBadge}>
                    <Text style={styles.modalUserBadgeText}>
                      ID de usuario: #{editandoId}
                    </Text>
                  </View>

                  {/* Nombre */}
                  <Text style={styles.modalLabel}>
                    Nombre completo
                  </Text>

                  <TextInput
                    value={editNombre}
                    onChangeText={setEditNombre}
                    style={styles.modalInput}
                    placeholder="Ingresa el nombre completo"
                    placeholderTextColor="#91A39E"
                    autoCapitalize="words"
                    editable={!guardandoEdicion}
                  />

                  {/* Correo */}
                  <Text style={styles.modalLabel}>
                    Correo electrónico
                  </Text>

                  <TextInput
                    value={editCorreo}
                    onChangeText={setEditCorreo}
                    style={styles.modalInput}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#91A39E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!guardandoEdicion}
                  />

                  {/* Acciones */}
                  <View style={styles.modalButtons}>
                    <Pressable
                      disabled={guardandoEdicion}
                      onPress={() => setEditandoId(null)}
                      style={({ pressed }) => [
                        styles.modalCancelButton,
                        pressed && styles.botonPresionado,
                      ]}
                    >
                      <Text style={styles.modalCancelText}>
                        Cancelar
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={guardandoEdicion}
                      onPress={guardarEdicion}
                      style={({ pressed }) => [
                        styles.modalSaveButton,
                        (pressed || guardandoEdicion) &&
                          styles.botonPresionado,
                      ]}
                    >
                      {guardandoEdicion ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <Text style={styles.modalSaveText}>
                          Guardar cambios
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
            {/* RESUMEN */}
            <View
              style={[
                styles.summaryRow,
                esMovil && styles.summaryRowMovil,
              ]}
            >
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Text style={styles.summaryIconText}>
                    ◎
                  </Text>
                </View>

                <View>
                  <Text style={styles.summaryNumber}>
                    {usuarios.length}
                  </Text>

                  <Text style={styles.summaryLabel}>
                    Usuarios registrados
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    styles.summaryIconActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryIconText,
                      styles.summaryIconTextActive,
                    ]}
                  >
                    ✓
                  </Text>
                </View>

                <View>
                  <Text style={styles.summaryNumber}>
                    {usuariosActivos}
                  </Text>

                  <Text style={styles.summaryLabel}>
                    Usuarios activos
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    styles.summaryIconInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryIconText,
                      styles.summaryIconTextInactive,
                    ]}
                  >
                    !
                  </Text>
                </View>

                <View>
                  <Text style={styles.summaryNumber}>
                    {usuariosInactivos}
                  </Text>

                  <Text style={styles.summaryLabel}>
                    Usuarios inactivos
                  </Text>
                </View>
              </View>
            </View>

            {/* TITULO DE LISTA */}
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>
                  Directorio de usuarios
                </Text>
                <Text style={styles.listSubtitle}>
                  Consulta y administra los accesos de VITALIA
                </Text>
              </View>

              <Pressable
                style={styles.refreshButton}
                onPress={obtenerUsuarios}
              >
                <Text style={styles.refreshIcon}>↻</Text>
                {!esMovil && (
                  <Text style={styles.refreshText}>Actualizar</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={busqueda}
                onChangeText={(texto) => {
                  setBusqueda(texto);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por nombre, correo o rol..."
                placeholderTextColor="#91A39E"
                style={styles.searchInput}
                autoCapitalize="none"
              />
              {busqueda.length > 0 && (
                <Pressable onPress={() => {
                    setBusqueda("");
                    setPaginaActual(1);
                  }}>
                  <Text style={styles.clearSearch}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* FILTRO POR ROL */}
            <Text style={styles.filterTitle}>
              Filtrar por tipo de usuario
            </Text>

            <View style={styles.filterOptions}>
              {rolesDisponibles.map((rol) => (
                <Pressable
                  key={rol}
                  onPress={() => {
                    setFiltroRol(rol);
                    setPaginaActual(1);
                  }}
                  style={[
                    styles.filterChip,
                    filtroRol === rol && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filtroRol === rol && styles.filterChipTextActive,
                    ]}
                  >
                    {rol}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ORDENAMIENTO */}
            <View style={styles.sortContainer}>
              <View style={styles.sortFieldContainer}>
                <Text style={styles.sortLabel}>
                  Ordenar por
                </Text>

                <View style={styles.sortOptions}>
                  {(
                    [
                      ["nombre", "Nombre"],
                      ["correo_electronico", "Correo"],
                      ["rol", "Rol"],
                      ["creado_en", "Registro"],
                    ] as [CampoOrden, string][]
                  ).map(([campo, etiqueta]) => (
                    <Pressable
                      key={campo}
                      onPress={() => {
                        setOrdenCampo(campo);
                        setPaginaActual(1);
                      }}
                      style={[
                        styles.sortChip,
                        ordenCampo === campo && styles.sortChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          ordenCampo === campo &&
                            styles.sortChipTextActive,
                        ]}
                      >
                        {etiqueta}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setOrdenDireccion((actual) =>
                    actual === "asc" ? "desc" : "asc"
                  );
                  setPaginaActual(1);
                }}
                style={styles.directionButton}
              >
                <Text style={styles.directionButtonText}>
                  {ordenDireccion === "asc" ? "↑" : "↓"}{" "}
                  {ordenDireccion === "asc" ? "Ascendente" : "Descendente"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.resultados}>
              {usuariosOrdenados.length} usuarios encontrados
              {" · "}
              Página {usuariosOrdenados.length === 0 ? 0 : paginaSegura} de {totalPaginas}
            </Text>
          </>
        }
        ListEmptyComponent={
          cargando ? (
            <View style={styles.loading}>
              <View style={styles.loadingCircle}>
                <ActivityIndicator
                  size="small"
                  color="#247F76"
                />
              </View>

              <Text style={styles.loadingTitle}>
                Cargando usuarios
              </Text>

              <Text style={styles.loadingText}>
                Estamos obteniendo la información...
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>
                  ◎
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                No hay usuarios registrados
              </Text>

              <Text style={styles.emptyText}>
                Cuando registres usuarios aparecerán
                aquí.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() =>
                  router.push("/admin/usuarios/crear")
                }
              >
                <Text style={styles.emptyButtonText}>
                  + Crear usuario
                </Text>
              </Pressable>
            </View>
          )
        }

        ListFooterComponent={
          usuariosOrdenados.length > 0 && !cargando ? (
            <View>
              <View style={styles.pagination}>
                <Pressable
                  disabled={paginaSegura <= 1}
                  onPress={() =>
                    setPaginaActual((actual) => Math.max(1, actual - 1))
                  }
                  style={[
                    styles.pageButton,
                    paginaSegura <= 1 && styles.pageButtonDisabled,
                  ]}
                >
                  <Text style={styles.pageButtonText}>
                    ← Anterior
                  </Text>
                </Pressable>

                <Text style={styles.pageInfo}>
                  { (paginaSegura - 1) * usuariosPorPagina + 1}
                  {"–"}
                  {Math.min(
                    paginaSegura * usuariosPorPagina,
                    usuariosOrdenados.length
                  )}
                  {" de "}
                  {usuariosOrdenados.length}
                </Text>

                <Pressable
                  disabled={paginaSegura >= totalPaginas}
                  onPress={() =>
                    setPaginaActual((actual) =>
                      Math.min(totalPaginas, actual + 1)
                    )
                  }
                  style={[
                    styles.pageButton,
                    paginaSegura >= totalPaginas &&
                      styles.pageButtonDisabled,
                  ]}
                >
                  <Text style={styles.pageButtonText}>
                    Siguiente →
                  </Text>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <View style={styles.footerLine} />
                <Text style={styles.footerText}>
                  VITALIA · Gestión clínica inteligente
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {cargando && usuarios.length > 0 && (
        <View style={styles.refreshLoading}>
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />

          <Text style={styles.refreshLoadingText}>
            Actualizando...
          </Text>
        </View>
      )}
      <Modal
            visible={alerta.visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={cerrarAlerta}
          >
            <View style={styles.alertaOverlay}>
              <View style={styles.alertaCaja}>
                <View
                  style={[
                    styles.alertaIconoContainer,
                    alerta.tipo === "error" &&
                      styles.alertaIconoError,
                  ]}
                >
                  <Text
                    style={[
                      styles.alertaIcono,
                      alerta.tipo === "error" &&
                        styles.alertaIconoTextoError,
                    ]}
                  >
                    {alerta.tipo === "exito" ? "✓" : "!"}
                  </Text>
                </View>

                <Text style={styles.alertaTitulo}>
                  {alerta.titulo}
                </Text>

                <Text style={styles.alertaMensaje}>
                  {alerta.mensaje}
                </Text>

                <Pressable
                  onPress={cerrarAlerta}
                  style={styles.alertaBoton}
                >
                  <Text style={styles.alertaBotonTexto}>
                    Aceptar
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
    </View>
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

  /* HEADER */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 25,
    gap: 20,
  },

  headerMovil: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  headerInfo: {
    flex: 1,
  },

  overline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#2A8C82",
    marginBottom: 5,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#173F3A",
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 7,
    color: "#718780",
    fontSize: 14,
    lineHeight: 21,
  },

  newButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#247F76",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#247F76",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  newButtonMovil: {
    width: "100%",
  },

  newButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  newButtonIcon: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "400",
    marginRight: 7,
    marginTop: -2,
  },

  newButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* RESUMEN */

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 32,
  },

  summaryRowMovil: {
    flexDirection: "column",
  },

  summaryCard: {
    flex: 1,
    minWidth: 190,
    minHeight: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4ECE9",
    shadowColor: "#173F3A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  summaryIconActive: {
    backgroundColor: "#E4F6EA",
  },

  summaryIconInactive: {
    backgroundColor: "#FFF1E5",
  },

  summaryIconText: {
    color: "#247F76",
    fontSize: 20,
    fontWeight: "800",
  },

  summaryIconTextActive: {
    color: "#27864A",
  },

  summaryIconTextInactive: {
    color: "#C66D25",
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#173F3A",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#899995",
    marginTop: 2,
  },

  /* LIST HEADER */

  
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  listTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#173F3A",
  },

  listSubtitle: {
    fontSize: 12,
    color: "#81938D",
    marginTop: 5,
  },

  refreshButton: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDEAE7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: "#F0F8F6",
  },

  refreshIcon: {
    color: "#247F76",
    fontSize: 20,
    fontWeight: "600",
  },

  refreshText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  /* USUARIO */

  usuarioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E3ECE8",
    shadowColor: "#173F3A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
  },

  
  usuarioPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#E0F2EE",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#247F76",
    fontSize: 17,
    fontWeight: "900",
  },

  usuarioInfo: {
    flex: 1,
    minWidth: 0,
  },

  nombre: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173F3A",
  },

  correo: {
    fontSize: 12,
    color: "#84958F",
    marginTop: 5,
  },

  estadoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F4FAF8",
  },

  estadoDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
  },

  estadoDotActivo: {
    backgroundColor: "#2F9B59",
  },

  estadoDotInactivo: {
    backgroundColor: "#D35F5F",
  },

  estadoTexto: {
    fontSize: 11,
    fontWeight: "700",
  },

  estadoTextoActivo: {
    color: "#27864A",
  },

  estadoTextoInactivo: {
    color: "#B54B4B",
  },

  divider: {
    height: 1,
    backgroundColor: "#EDF2F0",
    marginVertical: 18,
  },

  usuarioDetalles: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 22,
  },

  detalle: {
    minWidth: 110,
  },

  detalleLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#91A19C",
    marginBottom: 7,
  },

  detalleValue: {
    fontSize: 12,
    color: "#36564E",
    fontWeight: "700",
  },

  rolBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E2F4F0",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  rolText: {
    color: "#247F76",
    fontSize: 10,
    fontWeight: "800",
  },

  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  estadoBadgeActivo: {
    backgroundColor: "#E7F6EC",
  },

  estadoBadgeInactivo: {
    backgroundColor: "#FCEDEC",
  },

  estadoBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  estadoBadgeTextActivo: {
    color: "#27864A",
  },

  estadoBadgeTextInactivo: {
    color: "#B54B4B",
  },

  /* LOADING */

  loading: {
    minHeight: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EEEB",
  },

  loadingCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingTitle: {
    marginTop: 15,
    fontSize: 15,
    fontWeight: "800",
    color: "#31534D",
  },

  loadingText: {
    marginTop: 5,
    fontSize: 11,
    color: "#8A9B98",
  },

  /* EMPTY */

  empty: {
    minHeight: 330,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2EEEB",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyIconText: {
    color: "#247F76",
    fontSize: 27,
    fontWeight: "700",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "800",
    color: "#31534D",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: "#8A9B98",
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: "#247F76",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* FOOTER */

  footer: {
    alignItems: "center",
    marginTop: 35,
  },

  footerLine: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CDE8E3",
    marginBottom: 10,
  },

  footerText: {
    fontSize: 10,
    color: "#9AA9A6",
    letterSpacing: 0.5,
  },

  /* ACTUALIZANDO */

  refreshLoading: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    backgroundColor: "#173F3A",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
  },

  refreshLoadingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 7,
  },

  
  editForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DCEBE7",
  },

  editFormTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 16,
  },

  editLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#26443F",
    marginBottom: 6,
    marginTop: 10,
  },

  editInput: {
    borderWidth: 1,
    borderColor: "#DCEBE7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FAFCFB",
    color: "#173F3A",
  },

  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },

  editCancel: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#EDF3F1",
  },

  editCancelText: {
    color: "#45615B",
    fontWeight: "700",
  },

  editSave: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#247F76",
  },

  editSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  editAction: {
    flex: 1,
    minWidth: 110,
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: "#E5F4F0",
    alignItems: "center",
    justifyContent: "center",
  },

  editActionText: {
    color: "#247F76",
    fontSize: 12,
    fontWeight: "800",
  },

  estadoAction: {
    flex: 1,
    minWidth: 145,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  estadoActionOff: {
    backgroundColor: "#FCEDEC",
  },

  estadoActionOn: {
    backgroundColor: "#E4F5E9",
  },

  estadoActionText: {
    color: "#36564E",
    fontSize: 12,
    fontWeight: "800",
  },

  accionesUsuario: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#EDF2F0",
  },

  searchContainer: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFEAE6",
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  searchIcon: {
    fontSize: 25,
    color: "#2A8C82",
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: "#173F3A",
    outlineStyle: "none",
  } as any,

  clearSearch: {
    padding: 8,
    color: "#718780",
    fontSize: 16,
    fontWeight: "700",
  },

  resultados: {
    color: "#81938D",
    fontSize: 12,
    marginBottom: 16,
  },

  infoFila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 28,
  },

  infoColumna: {
    flex: 1,
    minWidth: 130,
  },

  botonPresionado: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  /* MODAL DE EDICIÓN */

  modalOverlay: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  backgroundColor: "rgba(15, 40, 36, 0.48)",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },

  modalContainer: {
  width: "100%",
  maxWidth: 500,
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  padding: 26,
  borderWidth: 1,
  borderColor: "#E1ECE8",
  shadowColor: "#173F3A",
  shadowOffset: {
  width: 0,
  height: 12,
  },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 12,
  },

  modalHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 20,
  },

  modalTitleContainer: {
  flex: 1,
  },

  modalOverline: {
  color: "#2A8C82",
  fontSize: 10,
  fontWeight: "900",
  letterSpacing: 1.5,
  marginBottom: 7,
  },

  modalTitle: {
  fontSize: 24,
  fontWeight: "900",
  color: "#173F3A",
  },

  modalSubtitle: {
  marginTop: 7,
  color: "#718780",
  fontSize: 13,
  lineHeight: 19,
  },

  modalCloseButton: {
  width: 36,
  height: 36,
  borderRadius: 12,
  backgroundColor: "#F0F6F4",
  justifyContent: "center",
  alignItems: "center",
  },

  modalCloseText: {
  color: "#45615B",
  fontSize: 16,
  fontWeight: "800",
  },

  modalUserBadge: {
  alignSelf: "flex-start",
  paddingHorizontal: 12,
  paddingVertical: 8,
  backgroundColor: "#E5F4F0",
  borderRadius: 10,
  marginBottom: 22,
  },

  modalUserBadgeText: {
  color: "#247F76",
  fontSize: 12,
  fontWeight: "800",
  },

  modalLabel: {
  fontSize: 12,
  fontWeight: "800",
  color: "#36564E",
  marginBottom: 8,
  marginTop: 14,
  },

  modalInput: {
  minHeight: 48,
  borderWidth: 1,
  borderColor: "#DCE9E5",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#FAFCFB",
  color: "#173F3A",
  fontSize: 14,
  },

  modalButtons: {
  flexDirection: "row",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 28,
  },

  modalCancelButton: {
  minHeight: 46,
  paddingHorizontal: 18,
  borderRadius: 12,
  backgroundColor: "#EDF3F1",
  justifyContent: "center",
  alignItems: "center",
  },

  modalCancelText: {
  color: "#45615B",
  fontSize: 12,
  fontWeight: "800",
  },

  modalSaveButton: {
  minHeight: 46,
  minWidth: 145,
  paddingHorizontal: 18,
  borderRadius: 12,
  backgroundColor: "#247F76",
  justifyContent: "center",
  alignItems: "center",
  },

  modalSaveText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "800",
  },

  /* FILTROS Y ORDENAMIENTO */

  filterTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#36564E",
    marginBottom: 10,
  },

  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },

  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFEAE6",
  },

  filterChipActive: {
    backgroundColor: "#247F76",
    borderColor: "#247F76",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#58736B",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  sortContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  sortFieldContainer: {
    flex: 1,
    minWidth: 220,
  },

  sortLabel: {
    color: "#81938D",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
  },

  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFEAE6",
  },

  sortChipActive: {
    backgroundColor: "#E2F4F0",
    borderColor: "#A8D8CE",
  },

  sortChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#58736B",
  },

  sortChipTextActive: {
    color: "#247F76",
  },

  directionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDEAE7",
    justifyContent: "center",
  },

  directionButtonText: {
    color: "#247F76",
    fontSize: 11,
    fontWeight: "800",
  },

  /* PAGINACIÓN */

  pagination: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    marginTop: 6,
  },

  pageButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: "#247F76",
    alignItems: "center",
    justifyContent: "center",
  },

  pageButtonDisabled: {
    backgroundColor: "#DCE7E3",
  },

  pageButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  pageInfo: {
    color: "#58736B",
    fontSize: 12,
    fontWeight: "700",
  },

  contenedorVolver: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 0,
  },

  botonVolver: {
    alignSelf: "flex-start",
    paddingHorizontal: 24,
  },

  textoVolver: {
    color: "#247F76",
    fontWeight: "700",
    marginBottom: 4,
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
    borderColor: "#E2EEEB",
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
    padding: 13,
  },

  alertaBotonTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});