import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useNotifications } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

interface NotificacionBD {
  id_PK: number;
  usuario_id_FK: number | null;
  mensaje: string | null;
  tipo: string | null;
  estado: string | null;
  creado_en: string | null;
  enlace: string | null;
  leido_en: string | null;
}

type FiltroEstado = "todos" | "no_leido" | "leido";

/**
 * Pantalla del centro de notificaciones con persistencia en base de datos,
 * selección múltiple, marcado como leído y eliminación individual o en lote.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { messages, status } = useNotifications();

  const [notificaciones, setNotificaciones] = useState<NotificacionBD[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  /**
   * Carga las notificaciones del usuario autenticado directamente desde la base de datos.
   */
  const cargarNotificaciones = async () => {
    if (!token) return;

    try {
      setCargando(true);
      const res = await api.get<NotificacionBD[]>("/api/notificaciones/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificaciones(res.data);
    } catch (err: any) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarNotificaciones();
    }
  }, [token]);

  useEffect(() => {
    if (messages.length > 0 && token) {
      cargarNotificaciones();
    }
  }, [messages.length, token]);

  /**
   * Filtra las notificaciones según el estado seleccionado (todos, no_leido, leido).
   */
  const notificacionesFiltradas = useMemo(() => {
    if (filtro === "todos") return notificaciones;
    return notificaciones.filter((n) => n.estado === filtro);
  }, [notificaciones, filtro]);

  const totalNoLeidas = useMemo(() => {
    return notificaciones.filter((n) => n.estado === "no_leido").length;
  }, [notificaciones]);

  /**
   * Alterna la selección de una notificación individual.
   */
  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  /**
   * Alterna la selección de la totalidad de las notificaciones visibles.
   */
  const toggleSeleccionarTodos = () => {
    const idsVisibles = notificacionesFiltradas.map((n) => n.id_PK);
    const todosSeleccionados = idsVisibles.every((id) =>
      seleccionados.includes(id)
    );

    if (todosSeleccionados) {
      setSeleccionados((prev) =>
        prev.filter((id) => !idsVisibles.includes(id))
      );
    } else {
      setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])));
    }
  };

  /**
   * Marca las notificaciones seleccionadas como leídas en la base de datos.
   */
  const marcarSeleccionadasComoLeidas = async () => {
    if (!token || seleccionados.length === 0) return;

    try {
      setProcesandoAccion(true);
      await api.post(
        "/api/notificaciones/marcar-leidas-lote",
        { ids: seleccionados },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSeleccionados([]);
      await cargarNotificaciones();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudieron marcar como leídas."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  /**
   * Marca la totalidad de las notificaciones no leídas como leídas.
   */
  const marcarTodasComoLeidas = async () => {
    if (!token) return;

    try {
      setProcesandoAccion(true);
      await api.put(
        "/api/notificaciones/marcar-todas-leidas",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSeleccionados([]);
      await cargarNotificaciones();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No fue posible actualizar las notificaciones."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  /**
   * Elimina de la base de datos las notificaciones seleccionadas.
   */
  const eliminarSeleccionadas = async () => {
    if (!token || seleccionados.length === 0) return;

    try {
      setProcesandoAccion(true);
      await api.post(
        "/api/notificaciones/eliminar-lote",
        { ids: seleccionados },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSeleccionados([]);
      await cargarNotificaciones();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudieron eliminar las notificaciones."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  /**
   * Elimina individualmente una notificación específica.
   */
  const eliminarIndividual = async (id: number) => {
    if (!token) return;

    try {
      await api.delete(`/api/notificaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSeleccionados((prev) => prev.filter((item) => item !== id));
      await cargarNotificaciones();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo eliminar la notificación."
      );
    }
  };

  /**
   * Marca una notificación individual como leída.
   */
  const marcarIndividualLeida = async (id: number) => {
    if (!token) return;

    try {
      await api.put(`/api/notificaciones/${id}/leer`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await cargarNotificaciones();
    } catch (err: any) {
      console.error(err);
    }
  };

  /**
   * Da formato legible a la fecha y hora de recepción de la notificación.
   */
  const formatearFecha = (fechaStr: string | null): string => {
    if (!fechaStr) return "";
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString("es-MX", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return fechaStr;
    }
  };

  const renderNotificacionItem = ({ item }: { item: NotificacionBD }) => {
    const isSelected = seleccionados.includes(item.id_PK);
    const isNoLeido = item.estado === "no_leido";

    return (
      <View
        style={[
          styles.notifCard,
          isNoLeido && styles.notifCardUnread,
          isSelected && styles.notifCardSelected,
        ]}
      >
        <TouchableOpacity
          style={styles.checkboxTouchArea}
          onPress={() => toggleSeleccion(item.id_PK)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome
            name={isSelected ? "check-square" : "square-o"}
            size={18}
            color={isSelected ? "#247F76" : "#8FA19D"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notifContentTouchArea}
          activeOpacity={item.enlace ? 0.7 : 1}
          onPress={() => {
            if (isNoLeido) {
              marcarIndividualLeida(item.id_PK);
            }
            if (item.enlace) {
              router.push(item.enlace as any);
            }
          }}
        >
          <View style={styles.notifHeaderRow}>
            <View style={styles.tagBadge}>
              <FontAwesome
                name="tag"
                size={10}
                color="#247F76"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.tagText}>
                {(item.tipo || "general").replace("_", " ").toUpperCase()}
              </Text>
            </View>

            <View style={styles.timeContainer}>
              <FontAwesome
                name="clock-o"
                size={11}
                color="#82938F"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.timeText}>
                {formatearFecha(item.creado_en)}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.mensajeText,
              isNoLeido && styles.mensajeTextBold,
            ]}
          >
            {item.mensaje || "Sin contenido"}
          </Text>

          {item.enlace && (
            <View style={styles.enlaceRow}>
              <Text style={styles.enlaceText}>Ver detalle en el sistema</Text>
              <FontAwesome
                name="arrow-right"
                size={10}
                color="#247F76"
                style={{ marginLeft: 5 }}
              />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemActionButtons}>
          {isNoLeido && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => marcarIndividualLeida(item.id_PK)}
              accessibilityLabel="Marcar leída"
            >
              <FontAwesome name="check" size={13} color="#247F76" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => eliminarIndividual(item.id_PK)}
            accessibilityLabel="Eliminar"
          >
            <FontAwesome name="trash" size={13} color="#D65A5A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const idsVisibles = notificacionesFiltradas.map((n) => n.id_PK);
  const todosSeleccionados =
    idsVisibles.length > 0 &&
    idsVisibles.every((id) => seleccionados.includes(id));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FAF8" />

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FontAwesome
            name="bell"
            size={22}
            color="#247F76"
            style={{ marginRight: 10 }}
          />
          <Text style={styles.appTitle}>Centro de Notificaciones</Text>
        </View>
        <Text style={styles.subtitle}>
          Avisos reactivos en tiempo real y registro histórico de actividad
        </Text>
      </View>

      {/* ESTADO DE CONEXIÓN Y RESUMEN */}
      <View style={styles.statusBarCard}>
        <View style={styles.channelStatusRow}>
          <Text style={styles.statusLabel}>Canal en tiempo real:</Text>
          <View
            style={[
              styles.statusBadge,
              status === "CONNECTED"
                ? styles.statusBadgeConnected
                : styles.statusBadgeDisconnected,
            ]}
          >
            <FontAwesome
              name={status === "CONNECTED" ? "check-circle" : "exclamation-circle"}
              size={12}
              color="#FFFFFF"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.statusBadgeText}>{status}</Text>
          </View>
        </View>

        <View style={styles.unreadCounterRow}>
          <FontAwesome
            name="envelope"
            size={13}
            color="#247F76"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.unreadCounterText}>
            {totalNoLeidas}{" "}
            {totalNoLeidas === 1 ? "notificación no leída" : "notificaciones no leídas"}
          </Text>
        </View>
      </View>

      {/* BARRA DE FILTROS Y ACCIONES EN LOTE */}
      <View style={styles.toolbarCard}>
        <View style={styles.filterChipsRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filtro === "todos" && styles.filterChipActive,
            ]}
            onPress={() => setFiltro("todos")}
          >
            <Text
              style={[
                styles.filterChipText,
                filtro === "todos" && styles.filterChipTextActive,
              ]}
            >
              Todas ({notificaciones.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filtro === "no_leido" && styles.filterChipActive,
            ]}
            onPress={() => setFiltro("no_leido")}
          >
            <Text
              style={[
                styles.filterChipText,
                filtro === "no_leido" && styles.filterChipTextActive,
              ]}
            >
              No leídas ({totalNoLeidas})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filtro === "leido" && styles.filterChipActive,
            ]}
            onPress={() => setFiltro("leido")}
          >
            <Text
              style={[
                styles.filterChipText,
                filtro === "leido" && styles.filterChipTextActive,
              ]}
            >
              Leídas ({notificaciones.length - totalNoLeidas})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bulkActionsRow}>
          <TouchableOpacity
            style={styles.selectToggleBtn}
            onPress={toggleSeleccionarTodos}
          >
            <FontAwesome
              name={todosSeleccionados ? "check-square" : "square-o"}
              size={15}
              color="#247F76"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.selectToggleText}>
              {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
            </Text>
          </TouchableOpacity>

          {seleccionados.length > 0 && (
            <View style={styles.selectedActionsGroup}>
              <TouchableOpacity
                style={styles.bulkActionBtn}
                onPress={marcarSeleccionadasComoLeidas}
                disabled={procesandoAccion}
              >
                <FontAwesome
                  name="check"
                  size={12}
                  color="#247F76"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.bulkActionText}>
                  Marcar leídas ({seleccionados.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bulkActionBtn, styles.deleteBulkBtn]}
                onPress={eliminarSeleccionadas}
                disabled={procesandoAccion}
              >
                <FontAwesome
                  name="trash"
                  size={12}
                  color="#D65A5A"
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.bulkActionText, styles.deleteBulkText]}>
                  Eliminar ({seleccionados.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {seleccionados.length === 0 && totalNoLeidas > 0 && (
            <TouchableOpacity
              style={styles.bulkActionBtn}
              onPress={marcarTodasComoLeidas}
              disabled={procesandoAccion}
            >
              <FontAwesome
                name="check-circle"
                size={12}
                color="#247F76"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.bulkActionText}>Marcar todas leídas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LISTADO DE NOTIFICACIONES */}
      {cargando ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.centerText}>Cargando notificaciones...</Text>
        </View>
      ) : notificacionesFiltradas.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome
            name="inbox"
            size={38}
            color="#9DB0AC"
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.emptyTitle}>Bandeja al día</Text>
          <Text style={styles.emptySubtitle}>
            {filtro === "no_leido"
              ? "No tienes notificaciones pendientes de lectura."
              : "No se encontraron notificaciones en este filtro."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificacionesFiltradas}
          keyExtractor={(item) => item.id_PK.toString()}
          renderItem={renderNotificacionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  appTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#173F3A",
  },

  subtitle: {
    fontSize: 13,
    color: "#748884",
    marginTop: 3,
  },

  statusBarCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E1EDE9",
    flexWrap: "wrap",
    gap: 8,
  },

  channelStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusLabel: {
    fontSize: 12,
    color: "#566C68",
    fontWeight: "600",
    marginRight: 8,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  statusBadgeConnected: {
    backgroundColor: "#247F76",
  },

  statusBadgeDisconnected: {
    backgroundColor: "#D65A5A",
  },

  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  unreadCounterRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  unreadCounterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#247F76",
  },

  toolbarCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E1EDE9",
  },

  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F1F7F5",
    borderWidth: 1,
    borderColor: "#DCEAE6",
  },

  filterChipActive: {
    backgroundColor: "#247F76",
    borderColor: "#247F76",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#57706B",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  bulkActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EEF5F3",
    flexWrap: "wrap",
    gap: 8,
  },

  selectToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },

  selectToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#247F76",
  },

  selectedActionsGroup: {
    flexDirection: "row",
    gap: 8,
  },

  bulkActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: "#E8F5F2",
    borderWidth: 1,
    borderColor: "#BEE2D9",
  },

  bulkActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#247F76",
  },

  deleteBulkBtn: {
    backgroundColor: "#FFF0EF",
    borderColor: "#F0B8B8",
  },

  deleteBulkText: {
    color: "#D65A5A",
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E1EDE9",
    alignItems: "flex-start",
  },

  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#247F76",
    backgroundColor: "#FCFFFE",
  },

  notifCardSelected: {
    backgroundColor: "#F2F9F7",
    borderColor: "#247F76",
  },

  checkboxTouchArea: {
    paddingRight: 10,
    paddingTop: 2,
  },

  notifContentTouchArea: {
    flex: 1,
  },

  notifHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 6,
  },

  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5F2",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  tagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#247F76",
  },

  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    fontSize: 11,
    color: "#82938F",
  },

  mensajeText: {
    fontSize: 13,
    color: "#3F5651",
    lineHeight: 18,
  },

  mensajeTextBold: {
    fontWeight: "700",
    color: "#183F3A",
  },

  enlaceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  enlaceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#247F76",
  },

  itemActionButtons: {
    flexDirection: "row",
    gap: 4,
    paddingLeft: 8,
    alignItems: "center",
  },

  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F4FAF8",
    justifyContent: "center",
    alignItems: "center",
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  centerText: {
    marginTop: 10,
    fontSize: 13,
    color: "#748884",
  },

  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E1EDE9",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#254842",
  },

  emptySubtitle: {
    fontSize: 12,
    color: "#7E938F",
    marginTop: 5,
    textAlign: "center",
  },
});
