import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { HeroSaludo } from "../../components/DashboardUI";
import { useAuth } from "../../context/AuthContext";
import { useTheme, type Theme } from "../../theme/theme";

/* ============================================================
   DATOS
============================================================ */

const ND = Platform.OS !== "web";

type IconName = ComponentProps<typeof Ionicons>["name"];
type PState = { pressed: boolean; hovered?: boolean };
type ColorKey = "primary" | "info" | "success" | "warning";

type Acceso = {
  id: string;
  icon: IconName;
  titulo: string;
  descripcion: string;
  ruta: string;
  color: ColorKey;
};

const ACCESOS: Acceso[] = [
  { id: "crear-usuario", icon: "person-add-outline", titulo: "Crear usuario", descripcion: "Alta de médicos y personal", ruta: "/admin/usuarios", color: "info" },
  { id: "inventario", icon: "cube-outline", titulo: "Gestionar inventario", descripcion: "Existencias, lotes e insumos", ruta: "/admin/inventario", color: "warning" },
  { id: "contratos", icon: "document-text-outline", titulo: "Contratos médicos", descripcion: "Registro y consulta", ruta: "/admin/doctores", color: "primary" },
  { id: "salas", icon: "business-outline", titulo: "Salas y equipo", descripcion: "Estado y equipamiento", ruta: "/admin/salas", color: "success" },
  { id: "salas-doctor", icon: "calendar-outline", titulo: "Salas por doctor", descripcion: "Asignación y horarios", ruta: "/admin/doctores/salas", color: "info" },
  { id: "reportes", icon: "bar-chart-outline", titulo: "Reportes", descripcion: "Ocupación, citas y recetas", ruta: "/admin/reportes", color: "primary" },
  { id: "auditoria", icon: "receipt-outline", titulo: "Auditoría", descripcion: "Historial de cambios", ruta: "/admin/auditoria", color: "warning" },
  { id: "notificaciones", icon: "notifications-outline", titulo: "Notificaciones", descripcion: "Avisos del sistema", ruta: "/notificaciones", color: "info" },
];

const MODO_DEMO = true;

type Resumen = {
  citasHoy: number;
  enEspera: number;
  medicosActivos: number;
  stockBajo: number;
  citasSemana: { dia: string; total: number; hoy: boolean }[];
  salas: { nombre: string; ocupacion: number }[];
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fechaCorta = () => {
  const d = new Date();
  return `${DIAS_CORTOS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

const ultimosSieteDias = () => {
  const hoy = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (6 - i));
    return { dia: DIAS_CORTOS[d.getDay()], hoy: i === 6 };
  });
};

async function cargarResumen(): Promise<Resumen> {
  if (MODO_DEMO) {
    const valores = [18, 26, 22, 31, 28, 12, 24];
    return {
      citasHoy: 24,
      enEspera: 6,
      medicosActivos: 11,
      stockBajo: 3,
      citasSemana: ultimosSieteDias().map((d, i) => ({ ...d, total: valores[i] })),
      salas: [
        { nombre: "Consultorio 1", ocupacion: 82 },
        { nombre: "Consultorio 2", ocupacion: 64 },
        { nombre: "Laboratorio", ocupacion: 91 },
        { nombre: "Rayos X", ocupacion: 47 },
        { nombre: "Urgencias", ocupacion: 73 },
      ],
    };
  }
  throw new Error("Resumen no conectado");
}

/* ============================================================
   MEDIDAS RESPONSIVE
============================================================ */

type Medidas = ReturnType<typeof calcularMedidas>;

function calcularMedidas(ancho: number) {
  const bp: "xs" | "sm" | "md" | "lg" | "xl" | "xxl" =
    ancho < 380 ? "xs"
    : ancho < 560 ? "sm"
    : ancho < 820 ? "md"
    : ancho < 1024 ? "lg"
    : ancho < 1280 ? "xl"
    : "xxl";

  const esc = { xs: 0.94, sm: 1, md: 1.08, lg: 1.16, xl: 1.24, xxl: 1.32 }[bp];
  const pad = { xs: 10, sm: 14, md: 20, lg: 26, xl: 32, xxl: 40 }[bp];
  const maxW = { xs: 560, sm: 720, md: 1000, lg: 1120, xl: 1280, xxl: 1440 }[bp];

  return {
    bp,
    esc,
    pad,
    maxW,
    colsAcceso: { xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }[bp],
    colsKpi: { xs: 1, sm: 2, md: 2, lg: 4, xl: 4, xxl: 4 }[bp],
    dosColumnas: ancho >= 900,
    avatar: { xs: 40, sm: 46, md: 56, lg: 64, xl: 72, xxl: 80 }[bp],
    avatarFont: { xs: 16, sm: 18, md: 22, lg: 26, xl: 30, xxl: 34 }[bp],
    r: (n: number) => Math.round(n * esc),
  };
}

/* ============================================================
   UTILIDADES
============================================================ */

const withAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const pct = (n: number) => `${100 / n}%` as `${number}%`;

const WEB_BLUR: any =
  Platform.OS === "web" ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } : null;

function obtenerIdUsuario(u: any): string {
  return String(u?.id ?? u?.usuario_id ?? u?.correo ?? "admin");
}

/* ============================================================
   COMPONENTES BASE
============================================================ */

function Glass({
  c,
  radius = 20,
  style,
  children,
}: {
  c: Theme;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: c.glass,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: c.glassBorder,
          shadowColor: c.glassShadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 0,
        },
        WEB_BLUR,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function FondoLuces({ c }: { c: Theme }) {
  const dark = c.mode === "dark";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="luzMenta" cx="90%" cy="8%" r="60%">
            <Stop offset="0" stopColor="#2DD4BF" stopOpacity={dark ? 0.16 : 0.22} />
            <Stop offset="1" stopColor="#2DD4BF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="luzGris" cx="0%" cy="92%" r="65%">
            <Stop offset="0" stopColor="#94A3B8" stopOpacity={dark ? 0.16 : 0.26} />
            <Stop offset="1" stopColor="#94A3B8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={400} height={800} fill="url(#luzMenta)" />
        <Rect x={0} y={0} width={400} height={800} fill="url(#luzGris)" />
      </Svg>
    </View>
  );
}

function ChipDemo({ c, m }: { c: Theme; m: Medidas }) {
  if (!MODO_DEMO) return null;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 9,
        borderRadius: 999,
        backgroundColor: withAlpha(c.warning, 0.16),
        marginBottom: 12,
      }}
    >
      <Ionicons name="information-circle-outline" size={m.r(13)} color={c.warning} style={{ marginRight: 4 }} />
      <Text style={{ fontSize: 11 * m.esc, fontWeight: "700", color: c.warning }}>Datos de ejemplo</Text>
    </View>
  );
}

/* ---------- Tabs local ---------- */

const TABS: { label: string; icon: IconName }[] = [
  { label: "Accesos rápidos", icon: "flash-outline" },
  { label: "Contadores", icon: "speedometer-outline" },
  { label: "Tendencias", icon: "trending-up-outline" },
];

function TabsBar({
  c,
  m,
  activa,
  scrollX,
  anchoPagina,
  mostrarIconos,
  onSelect,
}: {
  c: Theme;
  m: Medidas;
  activa: number;
  scrollX: Animated.Value;
  anchoPagina: number;
  mostrarIconos: boolean;
  onSelect: (i: number) => void;
}) {
  const [barW, setBarW] = useState(0);
  const tabW = barW > 8 ? (barW - 8) / TABS.length : 0;

  return (
    <Glass c={c} radius={m.r(16)} style={{ padding: 4, flexDirection: "row" }}>
      <View
        style={{ flex: 1, flexDirection: "row" }}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width + 8)}
        accessibilityRole="tablist"
      >
        {tabW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: tabW,
              borderRadius: m.r(12),
              backgroundColor: c.primary,
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              transform: [
                {
                  translateX: scrollX.interpolate({
                    inputRange: [0, Math.max(anchoPagina, 1) * (TABS.length - 1)],
                    outputRange: [0, tabW * (TABS.length - 1)],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          />
        )}

        {TABS.map((t, i) => {
          const on = activa === i;
          return (
            <Pressable
              key={t.label}
              onPress={() => onSelect(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                minHeight: m.r(42),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              {mostrarIconos && (
                <Ionicons
                  name={t.icon}
                  size={m.r(15)}
                  color={on ? c.onPrimary : c.primary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontSize: 12.5 * m.esc, fontWeight: "800", color: on ? c.onPrimary : c.muted }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

/* ---------- Accesos ---------- */

function AccesoTile({
  c,
  m,
  acceso,
  frecuente,
  onPress,
}: {
  c: Theme;
  m: Medidas;
  acceso: Acceso;
  frecuente: boolean;
  onPress: () => void;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(s, { toValue: v, speed: 40, bounciness: 4, useNativeDriver: ND }).start();
  const color = c[acceso.color];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={acceso.titulo}
      style={{ flex: 1 }}
    >
      {(state: PState) => (
        <Animated.View style={{ flex: 1, transform: [{ scale: s }] }}>
          <Glass
            c={c}
            radius={m.r(20)}
            style={{
              flex: 1,
              minHeight: m.r(128),
              padding: m.r(14),
              borderColor: state.hovered ? color : c.glassBorder,
              shadowOpacity: state.hovered ? 0.16 : 0.08,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: m.r(12),
              }}
            >
              <View
                style={{
                  width: m.r(44),
                  height: m.r(44),
                  borderRadius: m.r(14),
                  backgroundColor: state.hovered ? color : withAlpha(color, 0.14),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={acceso.icon} size={m.r(22)} color={state.hovered ? "#FFFFFF" : color} />
              </View>

              {frecuente && (
                <View
                  accessibilityLabel="Acceso frecuente"
                  style={{
                    width: m.r(26),
                    height: m.r(26),
                    borderRadius: m.r(13),
                    backgroundColor: withAlpha(c.primary, 0.14),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="trending-up-outline" size={m.r(14)} color={c.primary} />
                </View>
              )}
            </View>

            <Text numberOfLines={2} style={{ fontSize: 14 * m.esc, fontWeight: "800", color: c.text }}>
              {acceso.titulo}
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontSize: 11.5 * m.esc, lineHeight: 16 * m.esc, color: c.muted, marginTop: 3 }}
            >
              {acceso.descripcion}
            </Text>
          </Glass>
        </Animated.View>
      )}
    </Pressable>
  );
}

/* ---------- KPIs ---------- */

function KpiCard({
  c,
  m,
  label,
  detalle,
  icon,
  color,
  valor,
}: {
  c: Theme;
  m: Medidas;
  label: string;
  detalle: string;
  icon: IconName;
  color: string;
  valor?: number;
}) {
  return (
    <Glass c={c} radius={m.r(20)} style={{ flex: 1, padding: m.r(16), minHeight: m.r(148) }}>
      <View
        style={{
          width: m.r(42),
          height: m.r(42),
          borderRadius: m.r(13),
          backgroundColor: withAlpha(color, 0.14),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={m.r(21)} color={color} />
      </View>
      <Text style={{ fontSize: 34 * m.esc, fontWeight: "800", color: c.text, marginTop: 12 }}>
        {valor === undefined ? "—" : valor}
      </Text>
      <Text numberOfLines={2} style={{ fontSize: 13 * m.esc, fontWeight: "700", color: c.text }}>
        {label}
      </Text>
      <Text numberOfLines={2} style={{ fontSize: 11.5 * m.esc, color: c.muted, marginTop: 2 }}>
        {detalle}
      </Text>
    </Glass>
  );
}

/* ---------- Tendencias ---------- */

function Panel({
  c,
  m,
  titulo,
  icon,
  color,
  onVerMas,
  children,
}: {
  c: Theme;
  m: Medidas;
  titulo: string;
  icon: IconName;
  color: string;
  onVerMas: () => void;
  children: ReactNode;
}) {
  return (
    <Glass c={c} radius={m.r(22)} style={{ flex: 1, padding: m.r(18), paddingBottom: m.r(24) }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: m.r(16) }}>
        <View
          style={{
            width: m.r(32),
            height: m.r(32),
            borderRadius: m.r(10),
            backgroundColor: withAlpha(color, 0.14),
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={m.r(17)} color={color} />
        </View>
        <Text style={{ flex: 1, fontSize: 15 * m.esc, fontWeight: "800", color: c.text }}>{titulo}</Text>
        <Pressable
          onPress={onVerMas}
          hitSlop={8}
          accessibilityRole="link"
          style={(s: PState) => ({ flexDirection: "row", alignItems: "center", opacity: s.pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 12 * m.esc, fontWeight: "700", color: c.primary }}>Ver reporte</Text>
          <Ionicons name="chevron-forward" size={m.r(14)} color={c.primary} />
        </Pressable>
      </View>
      {children}
    </Glass>
  );
}

function SinDatos({ c, m, error }: { c: Theme; m: Medidas; error: boolean }) {
  return (
    <View style={{ minHeight: m.r(150), alignItems: "center", justifyContent: "center" }}>
      <Ionicons
        name={error ? "cloud-offline-outline" : "hourglass-outline"}
        size={m.r(26)}
        color={error ? c.error : c.info}
        style={{ marginBottom: 8 }}
      />
      <Text style={{ fontSize: 13 * m.esc, color: c.muted }}>
        {error ? "No se pudieron cargar los datos." : "Cargando datos..."}
      </Text>
    </View>
  );
}

function CitasSemana({
  c,
  m,
  datos,
  grow,
}: {
  c: Theme;
  m: Medidas;
  datos: Resumen["citasSemana"];
  grow: Animated.Value;
}) {
  const ALTO = m.r(150);
  const max = Math.max(...datos.map((d) => d.total), 1);

  return (
    <View style={{ paddingBottom: 6 }}>
      <View style={{ flexDirection: "row", height: ALTO + m.r(22) }}>
        {datos.map((d) => (
          <View key={d.dia + d.total} style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 11 * m.esc,
                fontWeight: "700",
                color: d.hoy ? c.primary : c.muted,
                marginBottom: 4,
              }}
            >
              {d.total}
            </Text>
            <Animated.View
              style={{
                width: "58%",
                maxWidth: m.r(44),
                borderRadius: m.r(9),
                backgroundColor: d.hoy ? c.primary : withAlpha(c.info, 0.3),
                height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, (d.total / max) * ALTO] }),
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: c.glassBorder, marginBottom: 10 }} />

      <View style={{ flexDirection: "row", minHeight: m.r(22), paddingBottom: 4 }}>
        {datos.map((d) => (
          <Text
            key={d.dia + "-l"}
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11.5 * m.esc,
              lineHeight: 16 * m.esc,
              fontWeight: d.hoy ? "800" : "600",
              color: d.hoy ? c.primary : c.muted,
            }}
          >
            {d.dia}
          </Text>
        ))}
      </View>
    </View>
  );
}

function OcupacionSalas({
  c,
  m,
  salas,
  grow,
}: {
  c: Theme;
  m: Medidas;
  salas: Resumen["salas"];
  grow: Animated.Value;
}) {
  const alto = m.r(8);
  return (
    <View>
      {salas.map((s, i) => {
        const alta = s.ocupacion >= 85;
        const color = alta ? c.warning : c.success;
        return (
          <View key={s.nombre} style={{ marginBottom: i === salas.length - 1 ? 0 : m.r(16) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 13 * m.esc, fontWeight: "700", color: c.text }}>
                {s.nombre}
              </Text>
              <Text style={{ fontSize: 13 * m.esc, fontWeight: "800", color }}>{s.ocupacion}%</Text>
            </View>
            <View
              style={{
                height: alto,
                borderRadius: alto / 2,
                backgroundColor: withAlpha(color, 0.14),
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{
                  height: alto,
                  borderRadius: alto / 2,
                  backgroundColor: color,
                  width: grow.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${s.ocupacion}%`] }),
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================
   PANTALLA
============================================================ */

export default function AdminScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const c = useTheme();
  const { width } = useWindowDimensions();

  /* ---------- Medidas ---------- */
  const [pager, setPager] = useState({ w: 0, h: 0 });
  const ancho = pager.w || width;
  const m = useMemo(() => calcularMedidas(ancho), [ancho]);
  const pad = m.pad;

  /* ---------- Pestañas ---------- */
  const [tab, setTab] = useState(0);
  const tabRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<any>(null);

  const irATab = useCallback(
    (i: number) => {
      tabRef.current = i;
      setTab(i);
      pagerRef.current?.scrollTo({ x: i * pager.w, animated: true });
    },
    [pager.w]
  );

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: ND,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (!pager.w) return;
          const i = Math.round(e.nativeEvent.contentOffset.x / pager.w);
          if (i !== tabRef.current) {
            tabRef.current = i;
            setTab(i);
          }
        },
      }),
    [pager.w]
  );

  useEffect(() => {
    if (pager.w) pagerRef.current?.scrollTo({ x: tabRef.current * pager.w, animated: false });
  }, [pager.w]);

  /* ---------- Accesos por frecuencia ---------- */
  const idUsuario = obtenerIdUsuario(usuario);
  const claveClics = `vitalia_admin_accesos_${idUsuario}`;
  const [clics, setClics] = useState<Record<string, number>>({});
  const clicsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(claveClics)
      .then((v) => {
        if (!vivo || !v) return;
        const guardado = JSON.parse(v);
        clicsRef.current = guardado;
        setClics(guardado);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [claveClics]);

  const abrirAcceso = useCallback(
    (a: Acceso) => {
      const siguiente = { ...clicsRef.current, [a.id]: (clicsRef.current[a.id] || 0) + 1 };
      clicsRef.current = siguiente;
      setClics(siguiente);
      AsyncStorage.setItem(claveClics, JSON.stringify(siguiente)).catch(() => {});
      router.push(a.ruta as any);
    },
    [claveClics, router]
  );

  const ordenados = useMemo(
    () =>
      [...ACCESOS].sort(
        (a, b) => (clics[b.id] || 0) - (clics[a.id] || 0) || ACCESOS.indexOf(a) - ACCESOS.indexOf(b)
      ),
    [clics]
  );
  const frecuentes = new Set(
    ordenados.filter((a) => (clics[a.id] || 0) >= 3).slice(0, 2).map((a) => a.id)
  );
  const hayUso = Object.values(clics).some((n) => n > 0);

  /* ---------- Datos ---------- */
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [errorDatos, setErrorDatos] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarResumen()
      .then((r) => vivo && setResumen(r))
      .catch(() => vivo && setErrorDatos(true));
    return () => {
      vivo = false;
    };
  }, []);

  /* ---------- Animaciones ---------- */
  const fade = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
  }, []);

  useEffect(() => {
    if (tab !== 2 || !resumen) return;
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: 700,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [tab, resumen]);

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const kpis: { label: string; detalle: string; icon: IconName; color: string; valor?: number }[] = [
    { label: "Citas de hoy", detalle: "Programadas para hoy", icon: "calendar-outline", color: c.info, valor: resumen?.citasHoy },
    { label: "Pacientes en espera", detalle: "Esperando atención", icon: "time-outline", color: c.warning, valor: resumen?.enEspera },
    { label: "Médicos activos", detalle: "En turno ahora", icon: "medkit-outline", color: c.success, valor: resumen?.medicosActivos },
    { label: "Insumos con stock bajo", detalle: "Requieren reabasto", icon: "alert-circle-outline", color: c.error, valor: resumen?.stockBajo },
  ];

  const verReportes = useCallback(() => router.push("/admin/reportes" as any), [router]);

  const pagina = (clave: string, children: ReactNode) => (
    <View key={clave} style={{ width: pager.w, height: pager.h }}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 18, paddingBottom: 56 }}
      >
        <View style={{ width: "100%", maxWidth: m.maxW, alignSelf: "center" }}>{children}</View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FondoLuces c={c} />

      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* ===== Cabecera con gradiente + chips a la derecha ===== */}
        <View style={{ paddingHorizontal: pad, paddingTop: 12, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: m.maxW }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {/* Header en gradiente (ya no blanco) */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <HeroSaludo
                  c={c}
                  esc={m.esc}
                  saludo={obtenerSaludo()}
                  nombre={usuario?.nombre || "Administrador"}
                  rol="Administrador de Sistema"
                  iconoRol="shield-checkmark-outline"
                />
              </View>

              {/* Chips a la derecha: fecha (≥480) y KPIs rápidos (≥720) */}
              {ancho >= 480 && (
                <Glass
                  c={c}
                  radius={16}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="calendar-outline" size={m.r(14)} color={c.info} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11.5 * m.esc, fontWeight: "700", color: c.muted }}>
                    {fechaCorta()}
                  </Text>
                </Glass>
              )}

              {ancho >= 720 && (
                <Glass
                  c={c}
                  radius={16}
                  style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 14 }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 10, color: c.muted, fontWeight: "700", letterSpacing: 0.5 }}>HOY</Text>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
                      {resumen?.citasHoy ?? "—"}
                    </Text>
                  </View>
                  <View style={{ width: 1, height: 28, backgroundColor: c.glassBorder }} />
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 10, color: c.muted, fontWeight: "700", letterSpacing: 0.5 }}>ESPERA</Text>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
                      {resumen?.enEspera ?? "—"}
                    </Text>
                  </View>
                </Glass>
              )}
            </View>

            {/* ===== Pestañas ===== */}
            <View style={{ marginTop: 12 }}>
              <TabsBar
                c={c}
                m={m}
                activa={tab}
                scrollX={scrollX}
                anchoPagina={pager.w}
                mostrarIconos={ancho >= 440}
                onSelect={irATab}
              />
            </View>
          </View>
        </View>

        {/* ===== Páginas deslizables ===== */}
        <View
          style={{ flex: 1, minHeight: 0 }}
          onLayout={(e) => setPager({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {pager.w > 0 && pager.h > 0 && (
            <Animated.ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onScroll}
              style={{ width: pager.w, height: pager.h }}
            >
              {/* 1. Accesos rápidos */}
              {pagina(
                "accesos",
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <Ionicons
                      name={hayUso ? "sparkles-outline" : "hand-left-outline"}
                      size={m.r(14)}
                      color={c.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ fontSize: 12 * m.esc, color: c.muted }}>
                      {hayUso ? "Ordenados según tu uso" : "Se ordenarán según los que más uses"}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
                    {ordenados.map((a) => (
                      <View key={a.id} style={{ width: pct(m.colsAcceso), padding: 6 }}>
                        <AccesoTile
                          c={c}
                          m={m}
                          acceso={a}
                          frecuente={frecuentes.has(a.id)}
                          onPress={() => abrirAcceso(a)}
                        />
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 2. Contadores */}
              {pagina(
                "contadores",
                <>
                  <ChipDemo c={c} m={m} />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
                    {kpis.map((k) => (
                      <View key={k.label} style={{ width: pct(m.colsKpi), padding: 6 }}>
                        <KpiCard c={c} m={m} label={k.label} detalle={k.detalle} icon={k.icon} color={k.color} valor={k.valor} />
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 3. Tendencias */}
              {pagina(
                "tendencias",
                <>
                  <ChipDemo c={c} m={m} />
                  <View style={{ flexDirection: m.dosColumnas ? "row" : "column" }}>
                    <View
                      style={{
                        flex: m.dosColumnas ? 3 : undefined,
                        marginRight: m.dosColumnas ? 12 : 0,
                        marginBottom: m.dosColumnas ? 0 : 14,
                      }}
                    >
                      <Panel c={c} m={m} titulo="Citas de la semana" icon="stats-chart-outline" color={c.info} onVerMas={verReportes}>
                        {resumen ? (
                          <CitasSemana c={c} m={m} datos={resumen.citasSemana} grow={grow} />
                        ) : (
                          <SinDatos c={c} m={m} error={errorDatos} />
                        )}
                      </Panel>
                    </View>

                    <View style={{ flex: m.dosColumnas ? 2 : undefined }}>
                      <Panel c={c} m={m} titulo="Ocupación de salas" icon="pulse-outline" color={c.success} onVerMas={verReportes}>
                        {resumen ? (
                          <OcupacionSalas c={c} m={m} salas={resumen.salas} grow={grow} />
                        ) : (
                          <SinDatos c={c} m={m} error={errorDatos} />
                        )}
                      </Panel>
                    </View>
                  </View>
                </>
              )}
            </Animated.ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}