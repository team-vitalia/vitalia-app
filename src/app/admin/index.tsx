import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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
import { CrownSvg, UpgradeModal } from "../../components/UpgradeModal";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { useTheme, type Theme } from "../../theme/theme";
import { sombra } from "../../utils/sombra";

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
  { id: "inventario", icon: "cube-outline", titulo: "Gestionar medicamentos", descripcion: "Catálogo, altas, Excel y PDF", ruta: "/admin/inventario", color: "warning" },
  { id: "contratos", icon: "document-text-outline", titulo: "Contratos médicos", descripcion: "Registro y consulta", ruta: "/admin/doctores", color: "primary" },
  { id: "salas", icon: "business-outline", titulo: "Salas y equipo", descripcion: "Estado, equipo y horarios", ruta: "/admin/salas", color: "success" },
  { id: "reportes", icon: "bar-chart-outline", titulo: "Reportes", descripcion: "Ocupación, citas y recetas", ruta: "/admin/reportes", color: "primary" },
  { id: "auditoria", icon: "receipt-outline", titulo: "Auditoría", descripcion: "Historial de cambios", ruta: "/admin/auditoria", color: "warning" },
  { id: "notificaciones", icon: "notifications-outline", titulo: "Notificaciones", descripcion: "Avisos del sistema", ruta: "/notificaciones", color: "info" },
];

type DiaSemana = { dia: string; total: number; hoy: boolean };
type SalaOcupacion = { nombre: string; ocupacion: number; citas: number };

/** `null` = ese dato no se pudo obtener (error de red, permiso o plan). */
type Resumen = {
  citasHoy: number | null;
  enEspera: number | null;
  medicosActivos: number | null;
  stockBajo: number | null;
  citasSemana: DiaSemana[] | null;
  salas: SalaOcupacion[] | null;
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Jornada base para calcular la ocupación diaria de una sala. */
const HORAS_JORNADA = 8;
const ESTADOS_CITA_INACTIVOS = ["cancelada", "no_asistio"];

const fechaCorta = () => {
  const d = new Date();
  return `${DIAS_CORTOS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const minutosDe = (hora?: string | null): number | null => {
  if (!hora || hora.length < 5) return null;
  const h = parseInt(hora.slice(0, 2), 10);
  const mi = parseInt(hora.slice(3, 5), 10);
  return Number.isNaN(h) || Number.isNaN(mi) ? null : h * 60 + mi;
};

type CitaApi = {
  fecha?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado?: string | null;
  sala_id_FK?: number | null;
  sala_nombre?: string | null;
};

type Resultado = PromiseSettledResult<{ data: any }>;
const datosDe = (r: Resultado): any => (r.status === "fulfilled" ? r.value.data : undefined);

/**
 * Indicadores reales de la clínica:
 *  - Citas de hoy / semana / ocupación de salas  → GET /api/citas/ y GET /api/salas
 *  - Pacientes en espera                         → GET /api/colas/ (cola de hoy, estado «en_espera»)
 *  - Médicos activos                             → GET /api/doctores/ (solo activos)
 *  - Stock bajo                                  → GET /api/almacen/resumen (Plan Profesional o superior)
 * Cada consulta es independiente: si una falla, solo ese dato queda en «—».
 */
async function cargarResumen(incluyeAlmacen: boolean): Promise<Resumen> {
  const [citasR, colasR, doctoresR, almacenR, salasR] = await Promise.allSettled([
    api.get("/api/citas/"),
    api.get("/api/colas/"),
    api.get("/api/doctores/"),
    incluyeAlmacen ? api.get("/api/almacen/resumen") : Promise.reject(new Error("plan")),
    api.get("/api/salas", { params: { page_size: 100 } }),
  ]);

  const citasData = datosDe(citasR);
  const citas: CitaApi[] | null = Array.isArray(citasData) ? citasData : null;
  const activas = citas?.filter((c) => !ESTADOS_CITA_INACTIVOS.includes(c.estado ?? "")) ?? null;

  const hoy = new Date();
  const hoyIso = isoLocal(hoy);

  const citasHoy = activas ? activas.filter((c) => c.fecha === hoyIso).length : null;

  let citasSemana: DiaSemana[] | null = null;
  if (activas) {
    citasSemana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - (6 - i));
      const iso = isoLocal(d);
      return { dia: DIAS_CORTOS[d.getDay()], hoy: i === 6, total: activas.filter((c) => c.fecha === iso).length };
    });
  }

  const colasData = datosDe(colasR);
  const enEspera = Array.isArray(colasData)
    ? colasData.filter((c: { estado?: string | null }) => c.estado === "en_espera").length
    : null;

  const doctoresData = datosDe(doctoresR);
  const medicosActivos = Array.isArray(doctoresData) ? doctoresData.length : null;

  const stockData = datosDe(almacenR);
  const stockBajo = typeof stockData?.medicamentos_stock_bajo === "number" ? stockData.medicamentos_stock_bajo : null;

  // Ocupación de hoy: minutos de citas activas con sala / jornada de la sala
  let salas: SalaOcupacion[] | null = null;
  if (activas) {
    const minutosPorSala = new Map<number, { minutos: number; citas: number; nombre?: string }>();
    activas
      .filter((c) => c.fecha === hoyIso && c.sala_id_FK != null)
      .forEach((c) => {
        const id = c.sala_id_FK as number;
        const ini = minutosDe(c.hora_inicio);
        const fin = minutosDe(c.hora_fin);
        const acum = minutosPorSala.get(id) ?? { minutos: 0, citas: 0, nombre: c.sala_nombre ?? undefined };
        acum.citas += 1;
        if (ini !== null && fin !== null && fin > ini) acum.minutos += fin - ini;
        minutosPorSala.set(id, acum);
      });

    const salasData = datosDe(salasR)?.data;
    const catalogo: { id: number; nombre: string }[] = Array.isArray(salasData)
      ? salasData
          .filter((x: { estado?: string | null }) => x.estado !== "inactiva")
          .map((x: { id_PK: number; nombre: string }) => ({ id: x.id_PK, nombre: x.nombre }))
      : // Sin acceso al módulo de salas (p. ej. plan básico): solo las que tienen citas hoy
        Array.from(minutosPorSala.entries()).map(([id, v]) => ({ id, nombre: v.nombre ?? `Sala ${id}` }));

    salas = catalogo
      .map((sala) => {
        const uso = minutosPorSala.get(sala.id);
        const ocupacion = uso ? Math.min(100, Math.round((uso.minutos / (HORAS_JORNADA * 60)) * 100)) : 0;
        return { nombre: sala.nombre, ocupacion, citas: uso?.citas ?? 0 };
      })
      .sort((a, b) => b.ocupacion - a.ocupacion || b.citas - a.citas || a.nombre.localeCompare(b.nombre))
      .slice(0, 5);
  }

  return { citasHoy, enEspera, medicosActivos, stockBajo, citasSemana, salas };
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
          ...sombra({ color: c.glassShadow, x: 0, y: 8, opacity: 0.08, radius: 20, elevation: 0 }),
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
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
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
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: tabW,
              borderRadius: m.r(12),
              backgroundColor: c.primary,
              ...sombra({ color: c.primary, x: 0, y: 4, opacity: 0.3, radius: 10 }),
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


function restriccionAcceso(
  id: string,
  planActual?: any
): { bloqueado: boolean; planRequerido: string } {
  const normalizar = (n?: string) =>
    (n || "basico")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const plan = normalizar(planActual?.nombre_plan);

  if (id === "inventario") {
    const permitido = plan === "profesional" || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Profesional" };
  }
  if (id === "contratos") {
    const permitido = !!planActual?.incluye_contratos || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Empresarial" };
  }
  if (id === "reportes") {
    const permitido = plan === "profesional" || plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Profesional" };
  }
  if (id === "auditoria") {
    const permitido = plan === "empresarial";
    return { bloqueado: !permitido, planRequerido: "Empresarial" };
  }
  return { bloqueado: false, planRequerido: "" };
}

function AccesoTile({
  c,
  m,
  acceso,
  frecuente,
  bloqueado,
  onPress,
}: {
  c: Theme;
  m: Medidas;
  acceso: Acceso;
  frecuente: boolean;
  bloqueado?: boolean;
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
              opacity: bloqueado ? 0.70 : 1,
              borderColor: state.hovered ? color : c.glassBorder,
              ...sombra({ color: c.glassShadow, x: 0, y: 8, opacity: state.hovered ? 0.16 : 0.08, radius: 20 }),
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

              {bloqueado ? (
                <View
                  accessibilityLabel="Función bloqueada por plan"
                  style={{
                    width: m.r(26),
                    height: m.r(26),
                    borderRadius: m.r(13),
                    backgroundColor: "rgba(251, 191, 36, 0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CrownSvg size={m.r(15)} color="#FBBF24" />
                </View>
              ) : frecuente ? (
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
              ) : null}
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
  nota,
  onVerMas,
  children,
}: {
  c: Theme;
  m: Medidas;
  titulo: string;
  icon: IconName;
  color: string;
  nota?: string;
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15 * m.esc, fontWeight: "800", color: c.text }}>{titulo}</Text>
          {!!nota && <Text style={{ fontSize: 11 * m.esc, color: c.muted, marginTop: 1 }}>{nota}</Text>}
        </View>
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

function SinDatos({
  c,
  m,
  estado,
  vacio,
}: {
  c: Theme;
  m: Medidas;
  estado: "cargando" | "error" | "vacio";
  vacio?: string;
}) {
  const icono: IconName =
    estado === "error" ? "cloud-offline-outline" : estado === "vacio" ? "file-tray-outline" : "hourglass-outline";
  const texto =
    estado === "error"
      ? "No se pudieron cargar los datos."
      : estado === "vacio"
        ? vacio || "Sin datos por ahora."
        : "Cargando datos...";
  return (
    <View style={{ minHeight: m.r(150), alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
      <Ionicons name={icono} size={m.r(26)} color={estado === "error" ? c.error : c.info} style={{ marginBottom: 8 }} />
      <Text style={{ fontSize: 13 * m.esc, color: c.muted, textAlign: "center" }}>{texto}</Text>
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
  datos: DiaSemana[];
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
  salas: SalaOcupacion[];
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
              <Text style={{ fontSize: 13 * m.esc, fontWeight: "800", color }}>
                {s.ocupacion}%{s.citas > 0 ? ` · ${s.citas} cita${s.citas === 1 ? "" : "s"}` : ""}
              </Text>
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
  const { usuario, planActual } = useAuth();
  const [modalUpgrade, setModalUpgrade] = useState<{
    visible: boolean;
    modulo: string;
    planRequerido: string;
  }>({
    visible: false,
    modulo: "",
    planRequerido: "Superior",
  });
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
      const res = restriccionAcceso(a.id, planActual);
      if (res.bloqueado) {
        setModalUpgrade({
          visible: true,
          modulo: a.titulo,
          planRequerido: res.planRequerido,
        });
        return;
      }
      const siguiente = { ...clicsRef.current, [a.id]: (clicsRef.current[a.id] || 0) + 1 };
      clicsRef.current = siguiente;
      setClics(siguiente);
      AsyncStorage.setItem(claveClics, JSON.stringify(siguiente)).catch(() => {});
      router.push(a.ruta as any);
    },
    [claveClics, router, planActual]
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

  /* ---------- Datos reales ---------- */
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const incluyeAlmacen = !restriccionAcceso("inventario", planActual).bloqueado;

  // Se recalcula cada vez que el administrador vuelve a esta pantalla
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      cargarResumen(incluyeAlmacen)
        .then((r) => vivo && setResumen(r))
        .catch(() =>
          vivo &&
          setResumen({ citasHoy: null, enEspera: null, medicosActivos: null, stockBajo: null, citasSemana: null, salas: null })
        );
      return () => {
        vivo = false;
      };
    }, [incluyeAlmacen])
  );

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
    { label: "Citas de hoy", detalle: "Programadas, sin canceladas", icon: "calendar-outline", color: c.info, valor: resumen?.citasHoy ?? undefined },
    { label: "Pacientes en espera", detalle: "En la cola de hoy", icon: "time-outline", color: c.warning, valor: resumen?.enEspera ?? undefined },
    { label: "Médicos activos", detalle: "Registrados como activos", icon: "medkit-outline", color: c.success, valor: resumen?.medicosActivos ?? undefined },
    {
      label: "Artículos con stock bajo",
      detalle: incluyeAlmacen ? "Requieren reabasto" : "Disponible en Plan Profesional",
      icon: "alert-circle-outline",
      color: c.error,
      valor: resumen?.stockBajo ?? undefined,
    },
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
                  <View style={{ flexDirection: m.dosColumnas ? "row" : "column" }}>
                    <View
                      style={{
                        flex: m.dosColumnas ? 3 : undefined,
                        marginRight: m.dosColumnas ? 12 : 0,
                        marginBottom: m.dosColumnas ? 0 : 14,
                      }}
                    >
                      <Panel
                        c={c}
                        m={m}
                        titulo="Citas de la semana"
                        nota="Últimos 7 días, sin canceladas"
                        icon="stats-chart-outline"
                        color={c.info}
                        onVerMas={verReportes}
                      >
                        {!resumen ? (
                          <SinDatos c={c} m={m} estado="cargando" />
                        ) : resumen.citasSemana ? (
                          <CitasSemana c={c} m={m} datos={resumen.citasSemana} grow={grow} />
                        ) : (
                          <SinDatos c={c} m={m} estado="error" />
                        )}
                      </Panel>
                    </View>

                    <View style={{ flex: m.dosColumnas ? 2 : undefined }}>
                      <Panel
                        c={c}
                        m={m}
                        titulo="Ocupación de salas"
                        nota={`Hoy, sobre una jornada de ${HORAS_JORNADA} h`}
                        icon="pulse-outline"
                        color={c.success}
                        onVerMas={verReportes}
                      >
                        {!resumen ? (
                          <SinDatos c={c} m={m} estado="cargando" />
                        ) : !resumen.salas ? (
                          <SinDatos c={c} m={m} estado="error" />
                        ) : resumen.salas.length === 0 ? (
                          <SinDatos c={c} m={m} estado="vacio" vacio="Aún no hay salas registradas." />
                        ) : (
                          <OcupacionSalas c={c} m={m} salas={resumen.salas} grow={grow} />
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
      <UpgradeModal
        visible={modalUpgrade.visible}
        modulo={modalUpgrade.modulo}
        planRequerido={modalUpgrade.planRequerido}
        onClose={() =>
          setModalUpgrade((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}