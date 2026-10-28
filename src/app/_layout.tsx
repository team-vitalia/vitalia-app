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

import { AuthProvider, useAuth } from "../context/AuthContext";
import { CalendarProvider } from "../context/CalendarContext";
import { NotificationsProvider } from "../context/NotificationsContext";
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
};

const ROLES: Record<number, string> = {
  1: "Administrador",
  2: "Doctor",
  3: "Paciente",
  4: "Recepción",
  5: "Coordinador",
};

const NAV: NavItem[] = [
  { key: "inicio", label: "Inicio", short: "Inicio", icon: "home-outline", iconActive: "home", ruta: "inicio", roles: [1, 2, 3, 4, 5], activo: (p) => Object.values(RUTAS_INICIO).includes(p) },
  { key: "citas", label: "Citas médicas", short: "Citas", icon: "calendar-outline", iconActive: "calendar", ruta: "/recepcion/citas", roles: [4], activo: (p) => p.includes("/recepcion/citas") },
  { key: "cola", label: "Lista de espera", short: "Espera", icon: "list-outline", iconActive: "list", ruta: "/recepcion/cola", roles: [4], activo: (p) => p.includes("/recepcion/cola") },
  { key: "consultas", label: "Mis consultas", short: "Consultas", icon: "clipboard-outline", iconActive: "clipboard", ruta: "/doctor/consultas", roles: [2], activo: (p) => p.includes("/doctor/consultas") },
  { key: "pacientes", label: "Mis pacientes", short: "Pacientes", icon: "people-outline", iconActive: "people", ruta: "/doctor/pacientes", roles: [2], activo: (p) => p.includes("/doctor/pacientes") },
  { key: "usuarios", label: "Gestionar usuarios", short: "Usuarios", icon: "people-outline", iconActive: "people", ruta: "/admin/usuarios", roles: [1, 5], activo: (p) => p.includes("/admin/usuarios") },
  { key: "inventario", label: "Almacén e inventario", short: "Inventario", icon: "cube-outline", iconActive: "cube", ruta: "/admin/inventario", roles: [1], activo: (p) => p.includes("/admin/inventario") },
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
  roles: [1, 2, 3, 4, 5],
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

function SideItem({
  c,
  item,
  active,
  compact,
  onPress,
}: {
  c: Theme;
  item: NavItem;
  active: boolean;
  compact: boolean;
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
  onSelect,
  onHome,
  onLogout,
}: {
  c: Theme;
  nombre?: string;
  correo?: string;
  rolId?: number;
  items: NavItem[];
  pathname: string;
  compact: boolean;
  onSelect: (item: NavItem) => void;
  onHome: () => void;
  onLogout: () => void;
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
        <View style={{ alignItems: "center", marginBottom: 20 }}>
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
            marginBottom: 20,
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
            <Text numberOfLines={1} style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {correo}
            </Text>
          </View>
        </LinearGradient>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {!compact && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: c.muted, letterSpacing: 1, marginLeft: 10, marginBottom: 10 }}>
            MENÚ PRINCIPAL
          </Text>
        )}
        {items.map((item) => (
          <SideItem
            key={item.key}
            c={c}
            item={item}
            active={item.activo(pathname)}
            compact={compact}
            onPress={() => onSelect(item)}
          />
        ))}
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
  onHome,
  onNotif,
}: {
  c: Theme;
  topInset: number;
  rolId?: number;
  notifActiva: boolean;
  onHome: () => void;
  onNotif: () => void;
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
  onClose,
  onSelect,
  onLogout,
}: {
  c: Theme;
  visible: boolean;
  bottomInset: number;
  nombre?: string;
  correo?: string;
  rolId?: number;
  items: NavItem[];
  pathname: string;
  onClose: () => void;
  onSelect: (item: NavItem) => void;
  onLogout: () => void;
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
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
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

            {items.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: c.muted, marginBottom: 8, marginLeft: 4 }}>
                  MÁS SECCIONES
                </Text>
                {items.map((item) => {
                  const active = item.activo(pathname);
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
  const { usuario, logout, cargando } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const c = useDarkTheme();

  const [masAbierto, setMasAbierto] = useState(false);
  const topInset = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0);

  const isMobile = width < BP_MOBILE;
  const isCompactRail = width >= BP_MOBILE && width < BP_DESKTOP;
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/recuperar" ||
    pathname === "/registro" ||
    pathname === "/politica-privacidad";
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
    if (item.key === "inicio") irInicio();
    else router.push(item.ruta as any);
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
          onSelect={seleccionar}
          onHome={irInicio}
          onLogout={cerrarSesion}
        />
      )}

      <View style={[styles.main, { backgroundColor: c.bg }]}>
        {mostrarMenu && isMobile && (
          <MobileHeader
            c={c}
            topInset={topInset}
            rolId={rolId}
            notifActiva={notifActiva}
            onHome={irInicio}
            onNotif={() => router.push("/notificaciones" as any)}
          />
        )}

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
          onClose={() => setMasAbierto(false)}
          onSelect={seleccionar}
          onLogout={cerrarSesion}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
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