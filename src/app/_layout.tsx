import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, usePathname, useRouter } from "expo-router";
import { ComponentProps, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthProvider, useAuth, type PlanActual } from "../context/AuthContext";
import { CalendarProvider } from "../context/CalendarContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { OfflineBanner } from "../components/OfflineBanner";
import { InstallPrompt } from "../components/InstallPrompt";
import { ModalPlanSuscripcion } from "../components/ModalPlanSuscripcion";
import { UpgradeModal, CrownSvg } from "../components/UpgradeModal";
import {
  BP_DESKTOP,
  BP_MOBILE,
  useTheme as useThemeBase,
  type Theme,
} from "../theme/theme";

function useDarkTheme(): Theme {
  const base = useThemeBase();
  return {
    ...base,
    mode: "dark",
    bg: "#0B1220",
    card: "#111A2C",
    border: "#1F2A44",
    text: "#E6EDF7",
    muted: "#8FA3BF",
    primary: "#22D3EE",
    onPrimary: "#04222B",
    activeBg: "rgba(34,211,238,0.14)",
    activeFg: "#22D3EE",
    hoverBg: "rgba(255,255,255,0.04)",
    tileBg: "rgba(255,255,255,0.06)",
    errorBg: "rgba(248,113,113,0.14)",
    error: "#F87171",
    info: "#60A5FA",
    success: "#34D399",
    warning: "#FBBF24",
    glass: "rgba(17,26,44,0.72)",
    glassBorder: "rgba(255,255,255,0.08)",
    glassShadow: "#000000",
    glow: "#22D3EE",
    gradFrom: "#0EA5E9",
    gradTo: "#22D3EE",
  } as Theme;
}

const ND = Platform.OS !== "web";

type IconName = ComponentProps<typeof Ionicons>["name"];
type PState = { pressed: boolean; hovered?: boolean };

type NavItem = {
  key: string;
  label: string;
  short: string;
  icon: IconName;
  iconActive: IconName;
  ruta: string;
  roles: number[];
  activo: (pathname: string) => boolean;
};

const RUTAS_INICIO: Record<number, string> = {
  1: "/admin",
  2: "/doctor",
  3: "/paciente",
  4: "/recepcion",
  5: "/coordinador",
  6: "/almacen",
};

const ROLES: Record<number, string> = {
  1: "Administrador",
  2: "Doctor",
  3: "Paciente",
  4: "Recepción",
  5: "Coordinador",
  6: "Almacén",
};

const NAV: NavItem[] = [
  { key: "inicio", label: "Inicio", short: "Inicio", icon: "home-outline", iconActive: "home", ruta: "inicio", roles: [1, 2, 3, 4, 5, 6], activo: (p) => Object.values(RUTAS_INICIO).includes(p) },
  { key: "citas", label: "Citas médicas", short: "Citas", icon: "calendar-outline", iconActive: "calendar", ruta: "/recepcion/citas", roles: [4], activo: (p) => p.includes("/recepcion/citas") },
  { key: "cola", label: "Lista de espera", short: "Espera", icon: "list-outline", iconActive: "list", ruta: "/recepcion/cola", roles: [4], activo: (p) => p.includes("/recepcion/cola") },
  { key: "espera-citas", label: "Espera de citas", short: "Pendientes", icon: "hourglass-outline", iconActive: "hourglass", ruta: "/recepcion/espera", roles: [4], activo: (p) => p.includes("/recepcion/espera") },
  { key: "consultas", label: "Mis consultas", short: "Consultas", icon: "clipboard-outline", iconActive: "clipboard", ruta: "/doctor/consultas", roles: [2], activo: (p) => p.includes("/doctor/consultas") },
  { key: "pacientes", label: "Mis pacientes", short: "Pacientes", icon: "people-outline", iconActive: "people", ruta: "/doctor/pacientes", roles: [2], activo: (p) => p.includes("/doctor/pacientes") },
  { key: "mis-recetas", label: "Mis recetas", short: "Recetas", icon: "medkit-outline", iconActive: "medkit", ruta: "/paciente/recetas", roles: [3], activo: (p) => p.includes("/paciente/recetas") },
  { key: "mi-expediente", label: "Mi expediente", short: "Expediente", icon: "folder-open-outline", iconActive: "folder-open", ruta: "/paciente/expediente", roles: [3], activo: (p) => p.includes("/paciente/expediente") },
  { key: "usuarios", label: "Gestionar usuarios", short: "Usuarios", icon: "people-outline", iconActive: "people", ruta: "/admin/usuarios", roles: [1, 5], activo: (p) => p.includes("/admin/usuarios") },
  { key: "plan-suscripcion", label: "Plan y suscripción", short: "Suscripción", icon: "card-outline", iconActive: "card", ruta: "plan-modal", roles: [1], activo: () => false },
  { key: "contratos", label: "Contratos médicos", short: "Contratos", icon: "document-text-outline", iconActive: "document-text", ruta: "/admin/doctores", roles: [1], activo: (p) => p === "/admin/doctores" },
  { key: "inventario", label: "Almacén e inventario", short: "Inventario", icon: "cube-outline", iconActive: "cube", ruta: "/admin/inventario", roles: [1, 6], activo: (p) => p.includes("/admin/inventario") },
  { key: "alm-dispensacion", label: "Dispensación de recetas", short: "Dispensar", icon: "medkit-outline", iconActive: "medkit", ruta: "/almacen/dispensacion", roles: [6], activo: (p) => p.includes("/almacen/dispensacion") },
  { key: "alm-analitica", label: "Analítica y predicción", short: "Analítica", icon: "stats-chart-outline", iconActive: "stats-chart", ruta: "/almacen/analitica", roles: [6], activo: (p) => p.includes("/almacen/analitica") },
  { key: "alm-consumo", label: "Registrar consumo", short: "Consumo", icon: "remove-circle-outline", iconActive: "remove-circle", ruta: "/almacen/consumo", roles: [6], activo: (p) => p.includes("/almacen/consumo") },
  { key: "alm-caducidades", label: "Caducidades", short: "Caducidad", icon: "alarm-outline", iconActive: "alarm", ruta: "/almacen/caducidades", roles: [6], activo: (p) => p.includes("/almacen/caducidades") },
  { key: "alm-movimientos", label: "Movimientos de inventario", short: "Movimientos", icon: "swap-vertical-outline", iconActive: "swap-vertical", ruta: "/almacen/movimientos", roles: [6], activo: (p) => p.includes("/almacen/movimientos") },
  { key: "reportes", label: "Reportes", short: "Reportes", icon: "bar-chart-outline", iconActive: "bar-chart", ruta: "/admin/reportes", roles: [1, 5], activo: (p) => p.includes("/admin/reportes") },
  { key: "salas", label: "Salas y equipamiento", short: "Salas", icon: "business-outline", iconActive: "business", ruta: "/admin/salas", roles: [1, 5], activo: (p) => p.includes("/admin/salas") },
  { key: "auditoria", label: "Auditoría", short: "Auditoría", icon: "receipt-outline", iconActive: "receipt", ruta: "/admin/auditoria", roles: [1, 5], activo: (p) => p.includes("/admin/auditoria") },
];

const NOTIF: NavItem = {
  key: "notificaciones",
  label: "Notificaciones",
  short: "Avisos",
  icon: "notifications-outline",
  iconActive: "notifications",
  ruta: "/notificaciones",
  roles: [1, 2, 3, 4, 5, 6],
  activo: (p) => p === "/notificaciones",
};

function Inicial({ c, nombre, size }: { c: Theme; nombre?: string; size: number }) {
  return (
    <LinearGradient
      colors={[c.gradFrom, c.gradTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.4, fontWeight: "800" }}>
        {nombre?.charAt(0)?.toUpperCase() || "U"}
      </Text>
    </LinearGradient>
  );
}


function obtenerRestriccionPlan(
  itemKey: string,
  planActual?: PlanActual
): { bloqueado: boolean; planRequerido: string } {
  const normalizar = (nombre?: string) =>
    (nombre || "basico")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const plan = normalizar(planActual?.nombre_plan);

  if (itemKey === "inventario" || itemKey.startsWith("alm-")) {
    const permitido = plan === "profesional" || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Profesional" };
  }
  if (itemKey === "reportes") {
    const permitido = plan === "profesional" || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Profesional" };
  }
  if (itemKey === "auditoria") {
    const permitido = plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Empresarial" };
  }
  if (itemKey === "contratos") {
    const permitido = !!planActual?.incluye_contratos || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Empresarial" };
  }
  return { bloqueado: false, planRequerido: "" };
}

function SideItem({
  c,
  item,
  active,
  compact,
  bloqueado,
  onPress,
}: {
  c: Theme;
  item: NavItem;
  active: boolean;
  compact: boolean;
  bloqueado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={(s: PState) => ({
        height: 48,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        paddingHorizontal: compact ? 0 : 10,
        marginBottom: 6,
        opacity: bloqueado ? 0.7 : 1,
        backgroundColor: active ? c.activeBg : s.hovered || s.pressed ? c.hoverBg : "transparent",
      })}
    >
      {active && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: 2,
            backgroundColor: c.primary,
          }}
        />
      )}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          marginRight: compact ? 0 : 10,
          backgroundColor: active ? c.tileBg : "transparent",
        }}
      >
        <Ionicons name={active ? item.iconActive : item.icon} size={19} color={active ? c.activeFg : c.muted} />
      </View>
      {!compact && (
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: active ? "700" : "600",
            color: active ? c.activeFg : c.text,
          }}
        >
          {item.label}
        </Text>
      )}
      {!compact && bloqueado && (
        <View style={{ marginLeft: 6 }}>
          <CrownSvg size={16} color="#FBBF24" />
        </View>
      )}
      {compact && bloqueado && (
        <View style={{ position: "absolute", top: 6, right: 6 }}>
          <CrownSvg size={12} color="#FBBF24" />
        </View>
      )}
    </Pressable>
  );
}

function Sidebar({
  c,
  nombre,
  correo,
  rolId,
  items,
  pathname,
  compact,
  planActual,
  onSelect,
  onHome,
  onLogout,
  onAbrirPlan,
}: {
  c: Theme;
  nombre?: string;
  correo?: string;
  rolId?: number;
  items: NavItem[];
  pathname: string;
  compact: boolean;
  planActual?: PlanActual;
  onSelect: (item: NavItem) => void;
  onHome: () => void;
  onLogout: () => void;
  onAbrirPlan?: () => void;
}) {
  return (
    <View
      style={{
        width: compact ? 84 : 272,
        height: "100%",
        backgroundColor: c.card,
        borderRightWidth: 1,
        borderRightColor: c.border,
        paddingHorizontal: compact ? 12 : 18,
        paddingTop: 28,
        paddingBottom: 20,
      }}
    >
      <Pressable
        onPress={onHome}
        accessibilityRole="button"
        accessibilityLabel="Ir al inicio"
        style={{ alignItems: "center", marginBottom: 24 }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            backgroundColor: c.tileBg,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: compact ? 0 : 10,
            shadowColor: c.glow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
          }}
        >
          <Image source={require("../assets/images/logo.png")} style={{ width: 40, height: 40 }} resizeMode="contain" />
        </View>
        {!compact && (
          <>
            <Text style={{ fontSize: 21, fontWeight: "800", color: c.primary, letterSpacing: 1.5 }}>VITALIA</Text>
            <Text style={{ fontSize: 11, color: c.muted, marginTop: 3 }}>Gestión clínica inteligente</Text>
          </>
        )}
      </Pressable>

      {compact ? (
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Inicial c={c} nombre={nombre} size={44} />
        </View>
      ) : (
        <LinearGradient
          colors={[c.gradFrom, c.gradTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 16,
            shadowColor: c.glow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>
              {nombre?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>
              {nombre}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {correo}
            </Text>
          </View>
        </LinearGradient>
      )}

      {!compact && rolId === 1 && onAbrirPlan && (
        <Pressable
          onPress={onAbrirPlan}
          accessibilityRole="button"
          accessibilityLabel="Ver y actualizar plan de la clínica"
          style={(s: PState) => ({
            backgroundColor: "rgba(34, 211, 238, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(34, 211, 238, 0.28)",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            opacity: s.pressed ? 0.75 : 1,
          })}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="sparkles" size={13} color={c.primary} style={{ marginRight: 5 }} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: c.primary, letterSpacing: 0.6 }}>
                PLAN {planActual?.nombre_plan?.toUpperCase() || "BÁSICO"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={c.primary} />
          </View>
          <Text style={{ fontSize: 10.5, color: c.muted }}>
            Ver información o cambiar de plan
          </Text>
        </Pressable>
      )}

      {compact && rolId === 1 && onAbrirPlan && (
        <Pressable
          onPress={onAbrirPlan}
          accessibilityRole="button"
          accessibilityLabel="Plan"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: "rgba(34, 211, 238, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            alignSelf: "center",
          }}
        >
          <Ionicons name="sparkles" size={18} color={c.primary} />
        </Pressable>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {!compact && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1, marginLeft: 10, marginBottom: 10 }}>
            MENÚ PRINCIPAL
          </Text>
        )}
        {items.map((item) => {
          const res = obtenerRestriccionPlan(item.key, planActual);
          return (
            <SideItem
              key={item.key}
              c={c}
              item={item}
              active={item.activo(pathname)}
              compact={compact}
              bloqueado={res.bloqueado}
              onPress={() => onSelect(item)}
            />
          );
        })}
      </ScrollView>

      <View style={{ paddingTop: 10 }}>
        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          style={(s: PState) => ({
            height: 46,
            borderRadius: 13,
            backgroundColor: c.errorBg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: s.pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={18} color={c.error} style={{ marginRight: compact ? 0 : 8 }} />
          {!compact && <Text style={{ fontSize: 12.5, fontWeight: "700", color: c.error }}>Cerrar sesión</Text>}
        </Pressable>

        {!compact && (
          <View style={{ alignItems: "center", marginTop: 14, paddingHorizontal: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
              <Ionicons name="shield-checkmark-outline" size={11} color={c.muted} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 10, color: c.muted, fontWeight: "600", letterSpacing: 0.3 }}>
                Sistema seguro · Sesión protegida
              </Text>
            </View>
            <Text style={{ fontSize: 9.5, color: c.muted, opacity: 0.7 }}>
              VITALIA · v1.0
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MobileHeader({
  c,
  topInset,
  rolId,
  notifActiva,
  planActual,
  onHome,
  onNotif,
  onAbrirPlan,
}: {
  c: Theme;
  topInset: number;
  rolId?: number;
  notifActiva: boolean;
  planActual?: PlanActual;
  onHome: () => void;
  onNotif: () => void;
  onAbrirPlan?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        paddingTop: topInset + 6,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="Ir al inicio"
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: c.tileBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Image source={require("../assets/images/logo.png")} style={{ width: 26, height: 26 }} resizeMode="contain" />
          </View>
          <View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.primary, letterSpacing: 1.2 }}>VITALIA</Text>
            <Text style={{ fontSize: 10.5, color: c.muted, marginTop: 1 }}>{rolId ? ROLES[rolId] : ""}</Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {rolId === 1 && onAbrirPlan && (
            <Pressable
              onPress={onAbrirPlan}
              accessibilityRole="button"
              accessibilityLabel="Ver plan contratado"
              style={{
                backgroundColor: "rgba(34, 211, 238, 0.12)",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(34, 211, 238, 0.28)",
                paddingHorizontal: 8,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Ionicons name="sparkles" size={12} color={c.primary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: c.primary }}>
                {planActual?.nombre_plan || "Básico"}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onNotif}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
            style={(s: PState) => ({
              width: 42,
              height: 42,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: notifActiva ? c.activeBg : s.pressed ? c.hoverBg : "transparent",
            })}
          >
            <Ionicons
              name={notifActiva ? "notifications" : "notifications-outline"}
              size={22}
              color={notifActiva ? c.activeFg : c.muted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TabButton({
  c,
  label,
  icon,
  iconActive,
  active,
  onPress,
}: {
  c: Theme;
  label: string;
  icon: IconName;
  iconActive: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const a = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: ND,
    }).start();
  }, [active]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={{ flex: 1, alignItems: "center", paddingTop: 8, paddingBottom: 4, minHeight: 58 }}
    >
      <View style={{ width: 58, height: 30, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            width: 58,
            height: 30,
            borderRadius: 15,
            backgroundColor: c.activeBg,
            opacity: a,
            transform: [{ scaleX: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          }}
        />
        <Ionicons name={active ? iconActive : icon} size={21} color={active ? c.activeFg : c.muted} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, marginTop: 3, fontWeight: active ? "700" : "600", color: active ? c.activeFg : c.muted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BottomBar({
  c,
  bottomInset,
  tabs,
  pathname,
  masActivo,
  onSelect,
  onMore,
}: {
  c: Theme;
  bottomInset: number;
  tabs: NavItem[];
  pathname: string;
  masActivo: boolean;
  onSelect: (item: NavItem) => void;
  onMore: () => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingHorizontal: 6,
        paddingBottom: Math.max(bottomInset, 6),
        shadowColor: c.glow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      {tabs.map((item) => (
        <TabButton
          key={item.key}
          c={c}
          label={item.short}
          icon={item.icon}
          iconActive={item.iconActive}
          active={item.activo(pathname)}
          onPress={() => onSelect(item)}
        />
      ))}
      <TabButton c={c} label="Más" icon="grid-outline" iconActive="grid" active={masActivo} onPress={onMore} />
    </View>
  );
}

function MoreSheet({
  c,
  visible,
  bottomInset,
  nombre,
  correo,
  rolId,
  items,
  pathname,
  planActual,
  onClose,
  onSelect,
  onLogout,
  onAbrirPlan,
}: {
  c: Theme;
  visible: boolean;
  bottomInset: number;
  nombre?: string;
  correo?: string;
  rolId?: number;
  items: NavItem[];
  pathname: string;
  planActual?: PlanActual;
  onClose: () => void;
  onSelect: (item: NavItem) => void;
  onLogout: () => void;
  onAbrirPlan?: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: ND,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.65)" }]}
          onPress={onClose}
          accessibilityLabel="Cerrar menú"
        />

        <Animated.View
          style={{
            opacity: t,
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
            backgroundColor: c.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: Math.max(bottomInset, 16) + 8,
            maxHeight: "85%",
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.border,
              marginBottom: 16,
            }}
          />

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Inicial c={c} nombre={nombre} size={48} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "800", color: c.text }}>
                  {nombre}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: c.activeFg, marginTop: 2 }}>
                  {rolId ? ROLES[rolId] : ""}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                  {correo}
                </Text>
              </View>
            </View>

            {rolId === 1 && onAbrirPlan && (
              <Pressable
                onPress={() => {
                  onClose();
                  onAbrirPlan();
                }}
                accessibilityRole="button"
                accessibilityLabel="Información del plan"
                style={{
                  backgroundColor: "rgba(34, 211, 238, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(34, 211, 238, 0.28)",
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="sparkles" size={15} color={c.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: "800", color: c.primary, letterSpacing: 0.5 }}>
                      PLAN {planActual?.nombre_plan?.toUpperCase() || "BÁSICO"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>Actualizar</Text>
                </View>
                <Text style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
                  Consulta las características o pásate al siguiente nivel.
                </Text>
              </Pressable>
            )}

            {items.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: c.muted, marginBottom: 8, marginLeft: 4 }}>
                  MÁS SECCIONES
                </Text>
                {items.map((item) => {
                  const active = item.activo(pathname);
                  const res = obtenerRestriccionPlan(item.key, planActual);
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => onSelect(item)}
                      accessibilityRole="button"
                      style={(s: PState) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        minHeight: 56,
                        borderRadius: 14,
                        paddingHorizontal: 10,
                        marginBottom: 6,
                        opacity: res.bloqueado ? 0.7 : 1,
                        backgroundColor: active ? c.activeBg : s.pressed ? c.hoverBg : "transparent",
                      })}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: c.tileBg,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name={active ? item.iconActive : item.icon} size={20} color={c.activeFg} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: c.text }}>{item.label}</Text>
                      {res.bloqueado && (
                        <View style={{ marginRight: 8 }}>
                          <CrownSvg size={16} color="#FBBF24" />
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={c.muted} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              onPress={onLogout}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              style={(s: PState) => ({
                height: 52,
                borderRadius: 14,
                backgroundColor: c.errorBg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                opacity: s.pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="log-out-outline" size={20} color={c.error} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "800", color: c.error }}>Cerrar sesión</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, logout, cargando, planActual } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const c = useDarkTheme();

  const [masAbierto, setMasAbierto] = useState(false);
  const [modalPlanVisible, setModalPlanVisible] = useState(false);
  const [upgradeModalInfo, setUpgradeModalInfo] = useState<{
    visible: boolean;
    modulo: string;
    planRequerido: string;
  }>({
    visible: false,
    modulo: "",
    planRequerido: "Superior",
  });
  const topInset = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0);

  const isMobile = width < BP_MOBILE;
  const isCompactRail = width >= BP_MOBILE && width < BP_DESKTOP;
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/recuperar" ||
    pathname === "/registro" ||
    pathname === "/politica-privacidad" ||
    pathname === "/condiciones-servicio" ||
    pathname === "/eliminacion-cuenta";
  const rolId: number | undefined = usuario?.rol_id ?? usuario?.rol_id_FK;
  const mostrarMenu = !isAuthPage && !!usuario;

  const cerrarSesion = () => {
    setMasAbierto(false);
    logout();
    router.replace("/login");
  };

  const irInicio = () => {
    if (!usuario) return;
    const ruta = rolId ? RUTAS_INICIO[rolId] : undefined;
    if (ruta) router.replace(ruta as any);
  };

  useEffect(() => {
    if (!cargando && !usuario && !isAuthPage) {
      router.replace("/login");
    }
  }, [cargando, usuario, isAuthPage, pathname]);

  useEffect(() => {
    setMasAbierto(false);
  }, [pathname]);

  const itemsRol = NAV.filter((i) => !!rolId && i.roles.includes(rolId));
  const itemsLateral = itemsRol.length ? [itemsRol[0], NOTIF, ...itemsRol.slice(1)] : [];
  const tabs = itemsRol.slice(0, 4);
  const masItems = itemsRol.slice(4);
  const masActivo = masItems.some((i) => i.activo(pathname));
  const notifActiva = NOTIF.activo(pathname);

  const seleccionar = (item: NavItem) => {
    setMasAbierto(false);
    const restriccion = obtenerRestriccionPlan(item.key, planActual);
    if (restriccion.bloqueado) {
      setUpgradeModalInfo({
        visible: true,
        modulo: item.label,
        planRequerido: restriccion.planRequerido,
      });
      return;
    }
    if (item.key === "plan-suscripcion") {
      setModalPlanVisible(true);
    } else if (item.key === "inicio") {
      irInicio();
    } else {
      router.push(item.ruta as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.bg} />

      {mostrarMenu && !isMobile && (
        <Sidebar
          c={c}
          nombre={usuario?.nombre}
          correo={usuario?.correo || usuario?.correo_electronico}
          rolId={rolId}
          items={itemsLateral}
          pathname={pathname}
          compact={isCompactRail}
          planActual={planActual}
          onSelect={seleccionar}
          onHome={irInicio}
          onLogout={cerrarSesion}
          onAbrirPlan={() => setModalPlanVisible(true)}
        />
      )}

      <View style={[styles.main, { backgroundColor: c.bg }]}>
        {mostrarMenu && isMobile && (
          <MobileHeader
            c={c}
            topInset={topInset}
            rolId={rolId}
            notifActiva={notifActiva}
            planActual={planActual}
            onHome={irInicio}
            onNotif={() => router.push("/notificaciones" as any)}
            onAbrirPlan={() => setModalPlanVisible(true)}
          />
        )}

        <OfflineBanner />
        <InstallPrompt />
        <View style={styles.stackContainer}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
        </View>

        {mostrarMenu && isMobile && (
          <BottomBar
            c={c}
            bottomInset={insets.bottom}
            tabs={tabs}
            pathname={pathname}
            masActivo={masActivo}
            onSelect={seleccionar}
            onMore={() => setMasAbierto(true)}
          />
        )}
      </View>

      {mostrarMenu && isMobile && (
        <MoreSheet
          c={c}
          visible={masAbierto}
          bottomInset={insets.bottom}
          nombre={usuario?.nombre}
          correo={usuario?.correo || usuario?.correo_electronico}
          rolId={rolId}
          items={masItems}
          pathname={pathname}
          planActual={planActual}
          onClose={() => setMasAbierto(false)}
          onSelect={seleccionar}
          onLogout={cerrarSesion}
          onAbrirPlan={() => setModalPlanVisible(true)}
        />
      )}

      <ModalPlanSuscripcion
        visible={modalPlanVisible}
        onClose={() => setModalPlanVisible(false)}
      />

      <UpgradeModal
        visible={upgradeModalInfo.visible}
        modulo={upgradeModalInfo.modulo}
        planRequerido={upgradeModalInfo.planRequerido}
        onClose={() =>
          setUpgradeModalInfo((prev) => ({ ...prev, visible: false }))
        }
        onVerPlanes={() => {
          setUpgradeModalInfo((prev) => ({ ...prev, visible: false }));
          setModalPlanVisible(true);
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/" })
        .catch(() => {});
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const splash = document.getElementById("vitalia-splash");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => {
          splash.remove();
        }, 350);
      }
    }
  }, []);

  return (
    <AuthProvider>
      <NotificationsProvider>
        <CalendarProvider>
          <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
          <AppLayout />
        </CalendarProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  main: { flex: 1, minWidth: 0, height: "100%" },
  stackContainer: { flex: 1, minWidth: 0 },
});
