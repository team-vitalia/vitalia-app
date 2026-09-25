import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
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
  const { token } = useAuth();
  const { width } = useWindowDimensions();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  const esMovil = width < 700;

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
    obtenerUsuarios();
  }, []);

  const usuariosActivos = usuarios.filter(
    (item) => item.estado === "activo"
  ).length;

  const usuariosInactivos = usuarios.filter(
    (item) => item.estado !== "activo"
  ).length;

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

          {!esMovil && (
            <View style={styles.estadoContainer}>
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
                  styles.estadoTexto,
                  activo
                    ? styles.estadoTextoActivo
                    : styles.estadoTextoInactivo,
                ]}
              >
                {item.estado || "Sin estado"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.usuarioDetalles}>
          <View style={styles.detalle}>
            <Text style={styles.detalleLabel}>
              ROL
            </Text>

            <View style={styles.rolBadge}>
              <Text style={styles.rolText}>
                {item.rol || "Sin rol"}
              </Text>
            </View>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.detalleLabel}>
              ESTADO
            </Text>

            <View
              style={[
                styles.estadoBadge,
                activo
                  ? styles.estadoBadgeActivo
                  : styles.estadoBadgeInactivo,
              ]}
            >
              <Text
                style={[
                  styles.estadoBadgeText,
                  activo
                    ? styles.estadoBadgeTextActivo
                    : styles.estadoBadgeTextInactivo,
                ]}
              >
                {item.estado || "Sin estado"}
              </Text>
            </View>
          </View>

          {!esMovil && (
            <View style={styles.detalle}>
              <Text style={styles.detalleLabel}>
                ÚLTIMO ACCESO
              </Text>

              <Text style={styles.detalleValue}>
                {item.ultimo_acceso
                  ? item.ultimo_acceso
                  : "Sin acceso registrado"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={usuarios}
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
                  Lista de usuarios
                </Text>

                <Text style={styles.listSubtitle}>
                  Usuarios registrados en el sistema
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.refreshButtonPressed,
                ]}
                onPress={obtenerUsuarios}
              >
                <Text style={styles.refreshIcon}>
                  ↻
                </Text>

                {!esMovil && (
                  <Text style={styles.refreshText}>
                    Actualizar
                  </Text>
                )}
              </Pressable>
            </View>
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
          usuarios.length > 0 && !cargando ? (
            <View style={styles.footer}>
              <View style={styles.footerLine} />

              <Text style={styles.footerText}>
                VITALIA · Gestión clínica inteligente
              </Text>
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
    </View>
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
  },

  subtitle: {
    marginTop: 5,
    color: "#82938F",
    fontSize: 14,
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
    gap: 14,
    marginBottom: 30,
  },

  summaryRowMovil: {
    flexDirection: "column",
  },

  summaryCard: {
    flex: 1,
    minHeight: 92,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2EEEB",
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
    marginBottom: 14,
  },

  listTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#173F3A",
  },

  listSubtitle: {
    fontSize: 12,
    color: "#8A9B98",
    marginTop: 3,
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
    borderRadius: 20,
    padding: 19,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2EEEB",
  },

  usuarioPrincipal: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#247F76",
    fontSize: 17,
    fontWeight: "900",
  },

  usuarioInfo: {
    flex: 1,
  },

  nombre: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173F3A",
  },

  correo: {
    fontSize: 12,
    color: "#8A9B98",
    marginTop: 4,
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
    borderRadius: 4,
    marginRight: 6,
  },

  estadoDotActivo: {
    backgroundColor: "#36A35C",
  },

  estadoDotInactivo: {
    backgroundColor: "#D86B6B",
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
    backgroundColor: "#EDF3F1",
    marginVertical: 15,
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
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#9AA9A6",
    marginBottom: 5,
  },

  detalleValue: {
    fontSize: 11,
    color: "#536A65",
    fontWeight: "600",
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
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  estadoBadgeActivo: {
    backgroundColor: "#E4F6EA",
  },

  estadoBadgeInactivo: {
    backgroundColor: "#FCE9E9",
  },

  estadoBadgeText: {
    fontSize: 10,
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
});