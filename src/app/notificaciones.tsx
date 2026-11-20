import { useTheme, type Theme } from "../theme/theme";
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
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

export default function NotificationsScreen() {
  const c = useTheme();
  const isDark = c.mode === "dark";
  const styles = useMemo(() => createStyles(c), [c]);
  const router = useRouter();
  const { token } = useAuth();
  const { messages, status, pushSupported, subscribeToPush, refetchUnreadCount } = useNotifications();
  const [pushActivo, setPushActivo] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushActivo(Notification.permission === "granted");
    }
  }, []);

  const habilitarPush = async () => {
    if (subscribeToPush) {
      const sub = await subscribeToPush();
      if (sub) {
        setPushActivo(true);
      }
    }
  };

  const [notificaciones, setNotificaciones] = useState<NotificacionBD[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    if (!token) return;

    try {
      setCargando(true);
      const res = await api.get<NotificacionBD[]>("/api/notificaciones/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificaciones(res.data);
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setCargando(false);
    }
  }, [token, refetchUnreadCount]);

  useEffect(() => {
    if (token) {
      void cargarNotificaciones();
    }
  }, [token, cargarNotificaciones]);

  useEffect(() => {
    if (messages.length > 0 && token) {
      void cargarNotificaciones();
    }
  }, [messages.length, token, cargarNotificaciones]);

  const notificacionesFiltradas = useMemo(() => {
    if (filtro === "todos") return notificaciones;
    return notificaciones.filter((n) => n.estado === filtro);
  }, [notificaciones, filtro]);

  const totalNoLeidas = useMemo(() => {
    return notificaciones.filter((n) => n.estado === "no_leido").length;
  }, [notificaciones]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudieron marcar como leídas."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

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
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No fue posible actualizar las notificaciones."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

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
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudieron eliminar las notificaciones."
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  const eliminarIndividual = async (id: number) => {
    if (!token) return;

    try {
      await api.delete(`/api/notificaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSeleccionados((prev) => prev.filter((item) => item !== id));
      await cargarNotificaciones();
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.detail || "No se pudo eliminar la notificación."
      );
    }
  };

  const marcarIndividualLeida = async (id: number) => {
    if (!token) return;

    try {
      await api.put(`/api/notificaciones/${id}/leer`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await cargarNotificaciones();
      if (refetchUnreadCount) {
        void refetchUnreadCount();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const formatearFecha = (fechaStr: string | null): string => {
    if (!fechaStr) return "";
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
      const ahora = new Date();
      const esHoy =
        d.getDate() === ahora.getDate() &&
        d.getMonth() === ahora.getMonth() &&
        d.getFullYear() === ahora.getFullYear();

      const hora = d.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (esHoy) {
        return `Hoy, ${hora}`;
      }

      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const esAyer =
        d.getDate() === ayer.getDate() &&
        d.getMonth() === ayer.getMonth() &&
        d.getFullYear() === ayer.getFullYear();

      if (esAyer) {
        return `Ayer, ${hora}`;
      }

      return `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${hora}`;
    } catch {
      return fechaStr;
    }
  };

  const parsearMensaje = (raw: string | null) => {
    if (!raw) return { titulo: null, cuerpo: "Sin contenido" };
    const bracketMatch = raw.match(/^\[(.*?)\]\s*(.*)$/s);
    if (bracketMatch) {
      return {
        titulo: bracketMatch[1].trim(),
        cuerpo: bracketMatch[2].trim() || bracketMatch[1].trim(),
      };
    }
    const colonMatch = raw.match(/^([A-Za-zÁ-ÿ\s]{3,30}):\s*(.*)$/s);
    if (colonMatch && colonMatch[2].trim().length > 0) {
      return {
        titulo: colonMatch[1].trim(),
        cuerpo: colonMatch[2].trim(),
      };
    }
    return {
      titulo: null,
      cuerpo: raw.trim(),
    };
  };

  const getBadgeInfo = (tipo: string | null) => {
    const t = (tipo || "general").toLowerCase().trim();
    if (t.includes("urgent") || t.includes("alerta") || t.includes("critico")) {
      return {
        label: "URGENTE",
        icon: "alert-circle" as const,
        bg: isDark ? "rgba(248, 113, 113, 0.16)" : "#FEF2F2",
        fg: isDark ? "#F87171" : "#DC2626",
        border: isDark ? "rgba(248, 113, 113, 0.35)" : "#FECACA",
      };
    }
    if (t.includes("info") || t.includes("informacion")) {
      return {
        label: "INFORMATIVO",
        icon: "information-circle" as const,
        bg: isDark ? "rgba(56, 189, 248, 0.16)" : "#F0F9FF",
        fg: isDark ? "#38BDF8" : "#0284C7",
        border: isDark ? "rgba(56, 189, 248, 0.35)" : "#BAE6FD",
      };
    }
    if (t.includes("sist") || t.includes("segurid")) {
      return {
        label: "SISTEMA",
        icon: "shield-checkmark" as const,
        bg: isDark ? "rgba(168, 85, 247, 0.16)" : "#FAF5FF",
        fg: isDark ? "#C084FC" : "#7E22CE",
        border: isDark ? "rgba(168, 85, 247, 0.35)" : "#E9D5FF",
      };
    }
    return {
      label: (tipo || "AVISO").replace("_", " ").toUpperCase(),
      icon: "notifications" as const,
      bg: isDark ? "rgba(8, 191, 164, 0.15)" : "#F0FDF4",
      fg: isDark ? "#08BFA4" : "#15803D",
      border: isDark ? "rgba(8, 191, 164, 0.32)" : "#BBF7D0",
    };
  };

  const renderNotificacionItem = ({ item }: { item: NotificacionBD }) => {
    const isSelected = seleccionados.includes(item.id_PK);
    const isNoLeido = item.estado === "no_leido";
    const badge = getBadgeInfo(item.tipo);
    const { titulo, cuerpo } = parsearMensaje(item.mensaje);
    const tieneEnlace = !!item.enlace && item.enlace !== "/notificaciones";

    return (
      <View
        style={[
          styles.notifCard,
          isNoLeido ? styles.notifCardUnread : styles.notifCardRead,
          isSelected && styles.notifCardSelected,
        ]}
      >
        <TouchableOpacity
          style={styles.checkboxTouchArea}
          onPress={() => toggleSeleccion(item.id_PK)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View
            style={[
              styles.checkboxBox,
              isSelected && styles.checkboxBoxSelected,
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notifContentTouchArea}
          activeOpacity={tieneEnlace ? 0.7 : 1}
          onPress={() => {
            if (isNoLeido) {
              void marcarIndividualLeida(item.id_PK);
            }
            if (tieneEnlace) {
              router.push(item.enlace as any);
            }
          }}
        >
          <View style={styles.notifHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={[
                  styles.tagBadge,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Ionicons
                  name={badge.icon}
                  size={11}
                  color={badge.fg}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tagText, { color: badge.fg }]}>
                  {badge.label}
                </Text>
              </View>

              {isNoLeido && (
                <View style={styles.newPill}>
                  <Text style={styles.newPillText}>Nuevo</Text>
                </View>
              )}
            </View>

            <View style={styles.timeContainer}>
              <Ionicons
                name="time-outline"
                size={12}
                color={c.muted}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.timeText}>
                {formatearFecha(item.creado_en)}
              </Text>
            </View>
          </View>

          {titulo && (
            <Text style={[styles.tituloText, isNoLeido && styles.tituloTextUnread]}>
              {titulo}
            </Text>
          )}

          <Text
            style={[
              styles.mensajeText,
              isNoLeido && styles.mensajeTextUnread,
            ]}
          >
            {cuerpo}
          </Text>

          {tieneEnlace && (
            <View style={styles.enlaceBtn}>
              <Text style={styles.enlaceText}>Ir a la sección</Text>
              <Ionicons
                name="arrow-forward"
                size={11}
                color={c.primary}
                style={{ marginLeft: 4 }}
              />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemActionButtons}>
          {isNoLeido && (
            <TouchableOpacity
              style={styles.actionBtnRead}
              onPress={() => marcarIndividualLeida(item.id_PK)}
              accessibilityLabel="Marcar leída"
            >
              <Ionicons name="checkmark" size={15} color={c.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtnDelete}
            onPress={() => eliminarIndividual(item.id_PK)}
            accessibilityLabel="Eliminar"
          >
            <Ionicons name="trash-outline" size={15} color={c.error} />
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
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />

      <View style={styles.innerWrapper}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="notifications" size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appTitle}>Centro de Notificaciones</Text>
              <Text style={styles.subtitle}>
                Avisos reactivos en tiempo real y registro histórico de actividad
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statusBarCard}>
          <View style={styles.channelStatusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: status === "CONNECTED" ? c.success : c.error },
              ]}
            />
            <Text style={styles.statusLabel}>Canal en vivo:</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    status === "CONNECTED"
                      ? isDark
                        ? "rgba(74,222,128,0.18)"
                        : "#DCFCE7"
                      : isDark
                      ? "rgba(248,113,113,0.18)"
                      : "#FEE2E2",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: status === "CONNECTED" ? c.success : c.error },
                ]}
              >
                {status === "CONNECTED" ? "CONECTADO" : status}
              </Text>
            </View>
          </View>

          <View style={styles.unreadCounterRow}>
            <Ionicons
              name="mail-unread-outline"
              size={14}
              color={c.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.unreadCounterText}>
              {totalNoLeidas}{" "}
              {totalNoLeidas === 1 ? "notificación no leída" : "notificaciones no leídas"}
            </Text>
          </View>

          {pushSupported && (
            <TouchableOpacity
              style={[
                styles.pushBadge,
                pushActivo ? styles.pushBadgeActive : styles.pushBadgeInactive,
              ]}
              onPress={!pushActivo ? habilitarPush : undefined}
            >
              <Ionicons
                name={pushActivo ? "checkmark-circle" : "notifications-outline"}
                size={13}
                color={pushActivo ? c.success : c.muted}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.pushBadgeText,
                  { color: pushActivo ? c.success : c.muted },
                ]}
              >
                {pushActivo ? "Push activo" : "Activar Push"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
              <View
                style={[
                  styles.checkboxBox,
                  todosSeleccionados && styles.checkboxBoxSelected,
                ]}
              >
                {todosSeleccionados && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
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
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color={c.primary}
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
                  <Ionicons
                    name="trash-outline"
                    size={13}
                    color={c.error}
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
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={c.primary}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.bulkActionText}>Marcar todas leídas</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {cargando ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={styles.centerText}>Cargando notificaciones...</Text>
          </View>
        ) : notificacionesFiltradas.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="notifications-off-outline"
                size={34}
                color={c.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Bandeja al día</Text>
            <Text style={styles.emptySubtitle}>
              {filtro === "no_leido"
                ? "No tienes notificaciones pendientes de lectura en este momento."
                : "No se encontraron notificaciones en esta categoría."}
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
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    innerWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: 960,
      alignSelf: "center",
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.tileBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    appTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: c.text,
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 13,
      color: c.muted,
      marginTop: 2,
    },
    statusBarCard: {
      marginHorizontal: 20,
      marginBottom: 14,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: c.border,
      flexWrap: "wrap",
      gap: 10,
    },
    channelStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusLabel: {
      fontSize: 12,
      color: c.muted,
      fontWeight: "600",
    },
    statusBadge: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    unreadCounterRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.tileBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    unreadCounterText: {
      fontSize: 12,
      fontWeight: "800",
      color: c.primary,
    },
    pushBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    pushBadgeActive: {
      backgroundColor: isDark ? "rgba(8,191,164,0.16)" : "#F0FDF4",
      borderColor: isDark ? "rgba(8,191,164,0.3)" : "#BBF7D0",
    },
    pushBadgeInactive: {
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
      borderColor: c.border,
    },
    pushBadgeText: {
      fontSize: 11,
      fontWeight: "800",
    },
    toolbarCard: {
      marginHorizontal: 20,
      marginBottom: 14,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterChipsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    filterChip: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
      borderWidth: 1,
      borderColor: c.border,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.muted,
    },
    filterChipTextActive: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    bulkActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexWrap: "wrap",
      gap: 8,
    },
    selectToggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
    },
    selectToggleText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.text,
      marginLeft: 8,
    },
    selectedActionsGroup: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    bulkActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.tileBg,
      borderWidth: 1,
      borderColor: c.border,
    },
    bulkActionText: {
      fontSize: 12,
      fontWeight: "800",
      color: c.primary,
    },
    deleteBulkBtn: {
      backgroundColor: c.errorBg,
      borderColor: isDark ? "rgba(248,113,113,0.3)" : "#FECACA",
    },
    deleteBulkText: {
      color: c.error,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    notifCard: {
      flexDirection: "row",
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      alignItems: "flex-start",
    },
    notifCardRead: {
      backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
      borderColor: c.border,
      borderLeftWidth: 1,
      borderLeftColor: c.border,
    },
    notifCardUnread: {
      backgroundColor: isDark ? "#1A2624" : "#F6FBF9",
      borderColor: isDark ? "rgba(8,191,164,0.35)" : "rgba(15,76,69,0.22)",
      borderLeftWidth: 4,
      borderLeftColor: c.primary,
    },
    notifCardSelected: {
      backgroundColor: isDark ? "rgba(8,191,164,0.14)" : "rgba(15,76,69,0.08)",
      borderColor: c.primary,
    },
    checkboxTouchArea: {
      paddingRight: 12,
      paddingTop: 3,
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.muted,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    checkboxBoxSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    notifContentTouchArea: {
      flex: 1,
      paddingRight: 8,
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
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    tagText: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    newPill: {
      backgroundColor: c.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    newPillText: {
      color: "#FFFFFF",
      fontSize: 9.5,
      fontWeight: "800",
    },
    timeContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    timeText: {
      fontSize: 11.5,
      color: c.muted,
      fontWeight: "500",
    },
    tituloText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      marginBottom: 3,
    },
    tituloTextUnread: {
      fontWeight: "800",
      color: c.text,
    },
    mensajeText: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 19,
    },
    mensajeTextUnread: {
      color: isDark ? "#E2E8F0" : "#334155",
      fontWeight: "500",
    },
    enlaceBtn: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      alignSelf: "flex-start",
      backgroundColor: c.tileBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    enlaceText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: c.primary,
    },
    itemActionButtons: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      paddingTop: 2,
    },
    actionBtnRead: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.tileBg,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtnDelete: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.errorBg,
      alignItems: "center",
      justifyContent: "center",
    },
    centerBox: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 50,
    },
    centerText: {
      marginTop: 12,
      fontSize: 13,
      color: c.muted,
      fontWeight: "600",
    },
    emptyCard: {
      marginHorizontal: 20,
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 40,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 10,
    },
    emptyIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.tileBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: c.muted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 18,
      maxWidth: 320,
    },
  });
};
