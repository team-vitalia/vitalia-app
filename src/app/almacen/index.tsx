/**
 * Panel del rol Almacén — inicio.
 *
 * Prioridad visual (lo urgente primero):
 *   · Banner crítico fijo bajo el hero (recetas pendientes + vencidos + por vencer)
 *   · Tab 1 "Alertas"     → cards grandes con CTA (rojo → ámbar → info)
 *   · Tab 2 "Accesos"     → módulos importantes (ordenados por uso)
 *   · Tab 3 "Contadores"  → KPIs completos con datos reales
 *
 * Datos reales:
 *   · getResumenAlmacen() con polling cada 30 s mientras la pantalla tiene foco.
 *
 * Responsive multiplataforma:
 *   · calcularMedidas(ancho) con 6 breakpoints (xs…xxl)
 *   · grid con pct() para 1→4 columnas
 *   · dosColumnas a partir de 900 px
 *   · ND para useNativeDriver y WEB_BLUR para glass en web
 *
 * Tema claro/oscuro:
 *   · Todo depende de useTheme(); key por c.bg para forzar re-mount
 *     cuando cambia el modo.
 */
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
  ActivityIndicator,
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
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { HeroSaludo } from "../../components/DashboardUI";
import { useAuth } from "../../context/AuthContext";
import { getResumenAlmacen, ResumenAlmacen } from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";
import { useTheme, type Theme } from "../../theme/theme";

/* ============================================================
   TIPOS Y DATOS
============================================================ */

const ND = Platform.OS !== "web";

type IconName = ComponentProps<typeof Ionicons>["name"];
type PState = { pressed: boolean; hovered?: boolean };
type ColorKey = "primary" | "info" | "success" | "warning" | "error";

type Acceso = {
  id: string;
  icon: IconName;
  titulo: string;
  descripcion: string;
  ruta: string;
  color: ColorKey;
};

const ACCESOS: Acceso[] = [
  {
    id: "dispensacion",
    icon: "medical-outline",
    titulo: "Dispensar recetas",
    descripcion: "Entrega de medicamentos con validación de stock y caducidad",
    ruta: "/almacen/dispensacion",
    color: "primary",
  },
  {
    id: "entrada-codigo",
    icon: "barcode-outline",
    titulo: "Entrada por código de barras",
    descripcion: "Alta rápida de lotes escaneando el código",
    ruta: "/almacen/entrada-codigo",
    color: "info",
  },
  {
    id: "caducidades",
    icon: "calendar-outline",
    titulo: "Caducidades",
    descripcion: "Lotes por vencer y vencidos con stock",
    ruta: "/almacen/caducidades",
    color: "warning",
  },
  {
    id: "analitica",
    icon: "analytics-outline",
    titulo: "Analítica y predicción (IA)",
    descripcion: "Demanda proyectada y sugerencias de reabasto",
    ruta: "/almacen/analitica",
    color: "success",
  },
  {
    id: "consumo",
    icon: "flask-outline",
    titulo: "Registrar consumo de insumos",
    descripcion: "Descuento de material clínico y de curación",
    ruta: "/almacen/consumo",
    color: "info",
  },
  {
    id: "movimientos",
    icon: "swap-horizontal-outline",
    titulo: "Movimientos de inventario",
    descripcion: "Historial de entradas, salidas y ajustes",
    ruta: "/almacen/movimientos",
    color: "warning",
  },
  {
    id: "inventario",
    icon: "cube-outline",
    titulo: "Medicamentos y lotes",
    descripcion: "Catálogo completo, altas y edición",
    ruta: "/admin/inventario",
    color: "primary",
  },
];

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
    colsKpi: { xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 3 }[bp],
    colsAlerta: { xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }[bp],
    dosColumnas: ancho >= 900,
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
  Platform.OS === "web"
    ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
    : null;

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const fechaCorta = () => {
  const d = new Date();
  return `${DIAS_CORTOS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

function obtenerIdUsuario(u: any): string {
  return String(u?.id ?? u?.usuario_id ?? u?.correo ?? "almacen");
}

const obtenerSaludo = () => {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
};

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

/* ============================================================
   TABS LOCAL (con badge de alertas)
============================================================ */

const TABS: { label: string; icon: IconName }[] = [
  { label: "Alertas", icon: "warning-outline" },
  { label: "Accesos", icon: "flash-outline" },
  { label: "Contadores", icon: "speedometer-outline" },
];

function TabsBar({
  c,
  m,
  activa,
  scrollX,
  anchoPagina,
  mostrarIconos,
  onSelect,
  badgeAlertas,
}: {
  c: Theme;
  m: Medidas;
  activa: number;
  scrollX: Animated.Value;
  anchoPagina: number;
  mostrarIconos: boolean;
  onSelect: (i: number) => void;
  badgeAlertas?: number;
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
          const esAlertas = i === 0;
          const mostrarBadge = esAlertas && !!badgeAlertas && badgeAlertas > 0;

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
                  color={on ? c.onPrimary : esAlertas && mostrarBadge ? c.error : c.primary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: 12.5 * m.esc,
                  fontWeight: "800",
                  color: on ? c.onPrimary : c.muted,
                }}
              >
                {t.label}
              </Text>
              {mostrarBadge && (
                <View
                  style={{
                    marginLeft: 6,
                    minWidth: m.r(18),
                    height: m.r(18),
                    paddingHorizontal: 4,
                    borderRadius: m.r(9),
                    backgroundColor: on ? "#FFFFFF" : c.error,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10 * m.esc,
                      fontWeight: "900",
                      color: on ? c.error : "#FFFFFF",
                    }}
                  >
                    {badgeAlertas > 99 ? "99+" : badgeAlertas}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Glass>
  );
}

/* ============================================================
   BANNER CRÍTICO (fijo bajo el hero)
============================================================ */

function BannerCritico({
  c,
  m,
  resumen,
  onAtender,
}: {
  c: Theme;
  m: Medidas;
  resumen: ResumenAlmacen | null;
  onAtender: () => void;
}) {
  if (!resumen) return null;

  const recetas = resumen.recetas_pendientes;
  const vencidos = resumen.lotes_vencidos;
  const porVencer = resumen.lotes_por_vencer;
  const total = recetas + vencidos + porVencer;

  // Sin alertas → chip discreto "Todo al día"
  if (total === 0) {
    return (
      <View
        style={{
          marginTop: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: m.r(12),
          backgroundColor: withAlpha(c.success, 0.12),
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name="checkmark-circle" size={m.r(18)} color={c.success} style={{ marginRight: 8 }} />
        <Text style={{ flex: 1, fontSize: 12.5 * m.esc, color: c.success, fontWeight: "700" }}>
          Todo al día — sin alertas críticas
        </Text>
      </View>
    );
  }

  // Severidad: rojo si hay vencidos o recetas, ámbar si solo por vencer
  const grave = vencidos > 0 || recetas > 0;
  const color = grave ? c.error : c.warning;
  const icono = grave ? "alert-circle" : "warning";

  return (
    <Pressable onPress={onAtender} accessibilityRole="button" accessibilityLabel="Ir a alertas del almacén">
      <View
        style={{
          marginTop: 10,
          padding: m.r(14),
          borderRadius: m.r(16),
          backgroundColor: withAlpha(color, 0.14),
          borderWidth: 1.5,
          borderColor: withAlpha(color, 0.45),
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: m.r(44),
            height: m.r(44),
            borderRadius: m.r(14),
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
            marginRight: m.r(12),
          }}
        >
          <Ionicons name={icono} size={m.r(22)} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13.5 * m.esc, fontWeight: "900", color: c.text }} numberOfLines={1}>
            {total} {total === 1 ? "pendiente" : "pendientes"} de atención
          </Text>
          <Text style={{ fontSize: 11.5 * m.esc, color: c.muted, marginTop: 2 }} numberOfLines={2}>
            {recetas > 0 && `${recetas} receta${recetas === 1 ? "" : "s"} por dispensar`}
            {recetas > 0 && (vencidos > 0 || porVencer > 0) ? " · " : ""}
            {vencidos > 0 && `${vencidos} lote${vencidos === 1 ? "" : "s"} vencido${vencidos === 1 ? "" : "s"}`}
            {vencidos > 0 && porVencer > 0 ? " · " : ""}
            {porVencer > 0 && `${porVencer} por vencer`}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: color,
            paddingHorizontal: m.r(12),
            paddingVertical: m.r(8),
            borderRadius: m.r(10),
            marginLeft: m.r(8),
          }}
        >
          <Text style={{ fontSize: 11.5 * m.esc, fontWeight: "800", color: "#FFFFFF" }}>Atender</Text>
          <Ionicons name="chevron-forward" size={m.r(14)} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================
   ACCESO TILE
============================================================ */

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

/* ============================================================
   ALERTA CARD (grande, con CTA)
============================================================ */

type Severidad = "critica" | "alta" | "info";

function AlertaCard({
  c,
  m,
  icon,
  color,
  severidad,
  titulo,
  valor,
  detalle,
  cta,
  onPress,
}: {
  c: Theme;
  m: Medidas;
  icon: IconName;
  color: string;
  severidad: Severidad;
  titulo: string;
  valor: number;
  detalle: string;
  cta: string;
  onPress: () => void;
}) {
  const sinPendientes = valor === 0;
  const colorEfectivo = sinPendientes ? c.success : color;

  // Etiqueta de severidad
  const etiqueta =
    sinPendientes ? "AL DÍA" : severidad === "critica" ? "CRÍTICO" : severidad === "alta" ? "ATENCIÓN" : "INFO";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${valor}. ${detalle}`}
      style={{ flex: 1 }}
    >
      {(state: PState) => (
        <Glass
          c={c}
          radius={m.r(20)}
          style={{
            flex: 1,
            padding: m.r(18),
            borderColor: withAlpha(colorEfectivo, state.hovered ? 0.7 : 0.35),
            borderWidth: 1.5,
            shadowOpacity: state.hovered ? 0.18 : 0.08,
          }}
        >
          {/* Encabezado: icono + etiqueta + número grande */}
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: m.r(48),
                height: m.r(48),
                borderRadius: m.r(15),
                backgroundColor: withAlpha(colorEfectivo, 0.15),
                alignItems: "center",
                justifyContent: "center",
                marginRight: m.r(12),
              }}
            >
              <Ionicons name={icon} size={m.r(24)} color={colorEfectivo} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: m.r(8),
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: withAlpha(colorEfectivo, 0.15),
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 9.5 * m.esc,
                    fontWeight: "900",
                    letterSpacing: 0.6,
                    color: colorEfectivo,
                  }}
                >
                  {etiqueta}
                </Text>
              </View>
              <Text style={{ fontSize: 13 * m.esc, fontWeight: "700", color: c.text }} numberOfLines={2}>
                {titulo}
              </Text>
            </View>
          </View>

          {/* Número enorme + detalle */}
          <Text
            style={{
              fontSize: 52 * m.esc,
              lineHeight: 58 * m.esc,
              fontWeight: "900",
              color: sinPendientes ? c.success : colorEfectivo,
              marginTop: m.r(10),
            }}
            numberOfLines={1}
          >
            {valor}
          </Text>
          <Text style={{ fontSize: 12 * m.esc, color: c.muted, lineHeight: 17 * m.esc }} numberOfLines={2}>
            {detalle}
          </Text>

          {/* CTA */}
          <View
            style={{
              marginTop: m.r(14),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: m.r(12),
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.glassBorder,
            }}
          >
            <Text style={{ fontSize: 12.5 * m.esc, fontWeight: "800", color: colorEfectivo }}>
              {sinPendientes ? "Ver historial" : cta}
            </Text>
            <Ionicons name="arrow-forward" size={m.r(16)} color={colorEfectivo} />
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  c,
  m,
  label,
  detalle,
  icon,
  color,
  valor,
  cargando,
  onPress,
}: {
  c: Theme;
  m: Medidas;
  label: string;
  detalle: string;
  icon: IconName;
  color: string;
  valor?: number | string;
  cargando?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? "button" : undefined} style={{ flex: 1 }}>
      <Glass c={c} radius={m.r(20)} style={{ flex: 1, padding: m.r(16), minHeight: m.r(148) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
          {onPress && <Ionicons name="chevron-forward" size={m.r(16)} color={c.muted} />}
        </View>
        <Text
          style={{ fontSize: 34 * m.esc, fontWeight: "800", color: c.text, marginTop: 12 }}
          numberOfLines={1}
        >
          {cargando ? "…" : valor === undefined ? "—" : valor}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: 13 * m.esc, fontWeight: "700", color: c.text }}>
          {label}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: 11.5 * m.esc, color: c.muted, marginTop: 2 }}>
          {detalle}
        </Text>
      </Glass>
    </Pressable>
  );
}

/* ============================================================
   PANEL / SIN DATOS
============================================================ */

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
  onVerMas?: () => void;
  children: ReactNode;
}) {
  return (
    <Glass c={c} radius={m.r(22)} style={{ flex: 1, padding: m.r(18), paddingBottom: m.r(24) }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: m.r(14) }}>
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
        {onVerMas && (
          <Pressable
            onPress={onVerMas}
            hitSlop={8}
            accessibilityRole="link"
            style={(st: PState) => ({ flexDirection: "row", alignItems: "center", opacity: st.pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 12 * m.esc, fontWeight: "700", color: c.primary }}>Ver todo</Text>
            <Ionicons name="chevron-forward" size={m.r(14)} color={c.primary} />
          </Pressable>
        )}
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
        {error ? "No se pudieron cargar los datos." : "Cargando datos…"}
      </Text>
    </View>
  );
}

/* ============================================================
   HOOK DE RESUMEN CON POLLING
============================================================ */

function useResumenAlmacen() {
  const [resumen, setResumen] = useState<ResumenAlmacen | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const r = await getResumenAlmacen();
      setResumen(r);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el resumen del almacén."));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setCargando(true);
      cargar().finally(() => activo && setCargando(false));
      const id = setInterval(() => {
        if (activo) cargar();
      }, 30_000);
      return () => {
        activo = false;
        clearInterval(id);
      };
    }, [cargar])
  );

  return { resumen, error, cargando, recargar: cargar };
}

/* ============================================================
   PANTALLA PRINCIPAL
============================================================ */

export default function AlmacenInicio() {
  const router = useRouter();
  const { usuario } = useAuth() as any;
  const c = useTheme();
  const { width } = useWindowDimensions();
  const modoTema = c.bg;

  /* ---------- Datos reales con polling ---------- */
  const { resumen, error, cargando } = useResumenAlmacen();

  /* ---------- Medidas ---------- */
  const [pager, setPager] = useState({ w: 0, h: 0 });
  const ancho = pager.w || width;
  const m = useMemo(() => calcularMedidas(ancho), [ancho]);
  const pad = m.pad;

  /* ---------- Tabs ---------- */
  const [tab, setTab] = useState(0); // 0 = Alertas
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
  const claveClics = `vitalia_almacen_accesos_${idUsuario}`;
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
    ordenados.filter((a) => (clics[a.id] || 0) >= 2).slice(0, 2).map((a) => a.id)
  );
  const hayUso = Object.values(clics).some((n) => n > 0);

  /* ---------- Animación de entrada ---------- */
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: ND,
    }).start();
  }, [modoTema, fade]);

  /* ---------- Totales de alerta (badge + banner) ---------- */
  const totalAlertas = useMemo(() => {
    if (!resumen) return 0;
    return resumen.recetas_pendientes + resumen.lotes_vencidos + resumen.lotes_por_vencer;
  }, [resumen]);

  /* ---------- KPIs reales ---------- */
  const kpis = useMemo(
    () =>
      resumen
        ? [
            {
              label: "Recetas por dispensar",
              detalle: "Pendientes de entrega",
              icon: "medical-outline" as IconName,
              color: resumen.recetas_pendientes ? c.warning : c.success,
              valor: resumen.recetas_pendientes,
              ruta: "/almacen/dispensacion",
            },
            {
              label: `Lotes por vencer (${resumen.dias_alerta_caducidad} d)`,
              detalle: "Próximos a caducar",
              icon: "calendar-outline" as IconName,
              color: resumen.lotes_por_vencer ? c.warning : c.success,
              valor: resumen.lotes_por_vencer,
              ruta: "/almacen/caducidades",
            },
            {
              label: "Lotes vencidos con stock",
              detalle: "Requieren retiro inmediato",
              icon: "alert-circle-outline" as IconName,
              color: resumen.lotes_vencidos ? c.error : c.success,
              valor: resumen.lotes_vencidos,
              ruta: "/almacen/caducidades",
            },
            {
              label: `Stock bajo (≤ ${resumen.umbral_stock_bajo})`,
              detalle: "Medicamentos por reabasto",
              icon: "cube-outline" as IconName,
              color: resumen.medicamentos_stock_bajo ? c.warning : c.success,
              valor: resumen.medicamentos_stock_bajo,
              ruta: "/admin/inventario",
            },
            {
              label: "Unidades vigentes",
              detalle: "Stock total disponible",
              icon: "layers-outline" as IconName,
              color: c.info,
              valor: resumen.unidades_vigentes,
              ruta: "/admin/inventario",
            },
            {
              label: "Medicamentos / lotes",
              detalle: "Catálogo total",
              icon: "albums-outline" as IconName,
              color: c.primary,
              valor: `${resumen.total_medicamentos} / ${resumen.total_lotes}`,
              ruta: "/admin/inventario",
            },
          ]
        : [],
    [resumen, c]
  );

  /* ---------- Render ---------- */
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
    <View key={`almacen-${modoTema}`} style={{ flex: 1, backgroundColor: c.bg }}>
      <FondoLuces c={c} />

      <Animated.View style={{ flex: 1, opacity: fade }}>
        {/* ===== Cabecera: HeroSaludo + chips + banner crítico ===== */}
        <View style={{ paddingHorizontal: pad, paddingTop: 12, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: m.maxW }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <HeroSaludo
                  c={c}
                  esc={m.esc}
                  saludo={obtenerSaludo()}
                  nombre={usuario?.nombre || "Almacén"}
                  rol="Gestión de Almacén"
                  iconoRol="cube-outline"
                />
              </View>

              {ancho >= 480 && (
                <Glass
                  c={c}
                  radius={16}
                  style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons name="calendar-outline" size={m.r(14)} color={c.info} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11.5 * m.esc, fontWeight: "700", color: c.muted }}>
                    {fechaCorta()}
                  </Text>
                </Glass>
              )}
            </View>

            {/* Banner crítico fijo: SIEMPRE visible, prioritario */}
            <BannerCritico c={c} m={m} resumen={resumen} onAtender={() => irATab(0)} />

            {/* Tabs con badge de alertas */}
            <View style={{ marginTop: 12 }}>
              <TabsBar
                c={c}
                m={m}
                activa={tab}
                scrollX={scrollX}
                anchoPagina={pager.w}
                mostrarIconos={ancho >= 440}
                onSelect={irATab}
                badgeAlertas={totalAlertas}
              />
            </View>

            {!!error && (
              <View
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: m.r(12),
                  backgroundColor: withAlpha(c.error, 0.12),
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="alert-circle-outline" size={m.r(16)} color={c.error} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 12.5 * m.esc, color: c.error, fontWeight: "600" }}>
                  {error}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ===== Páginas ===== */}
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
              {/* 1. ALERTAS (primero) */}
              {pagina(
                "alertas",
                <>
                  {cargando && !resumen ? (
                    <Panel c={c} m={m} titulo="Consultando alertas" icon="warning-outline" color={c.warning}>
                      <View style={{ paddingVertical: m.r(20), alignItems: "center" }}>
                        <ActivityIndicator color={c.primary} />
                        <Text style={{ marginTop: 8, fontSize: 12.5 * m.esc, color: c.muted }}>
                          Verificando recetas pendientes, caducidades y stock…
                        </Text>
                      </View>
                    </Panel>
                  ) : !resumen ? (
                    <Panel c={c} m={m} titulo="Sin datos" icon="cloud-offline-outline" color={c.error}>
                      <SinDatos c={c} m={m} error />
                    </Panel>
                  ) : (
                    <>
                      {/* Cards grandes de alerta, ordenadas por severidad */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
                        <View style={{ width: pct(m.colsAlerta), padding: 6 }}>
                          <AlertaCard
                            c={c}
                            m={m}
                            icon="medical-outline"
                            color={c.warning}
                            severidad="critica"
                            titulo="Recetas por dispensar"
                            valor={resumen.recetas_pendientes}
                            detalle="Pacientes esperando su medicamento. Prioriza la entrega."
                            cta="Ir a dispensación"
                            onPress={() => router.push("/almacen/dispensacion" as any)}
                          />
                        </View>

                        <View style={{ width: pct(m.colsAlerta), padding: 6 }}>
                          <AlertaCard
                            c={c}
                            m={m}
                            icon="alert-circle-outline"
                            color={c.error}
                            severidad="critica"
                            titulo="Lotes vencidos con stock"
                            valor={resumen.lotes_vencidos}
                            detalle="No deben dispensarse. Retíralos del inventario disponible."
                            cta="Revisar caducidades"
                            onPress={() => router.push("/almacen/caducidades" as any)}
                          />
                        </View>

                        <View style={{ width: pct(m.colsAlerta), padding: 6 }}>
                          <AlertaCard
                            c={c}
                            m={m}
                            icon="calendar-outline"
                            color={c.warning}
                            severidad="alta"
                            titulo={`Lotes por vencer (${resumen.dias_alerta_caducidad} días)`}
                            valor={resumen.lotes_por_vencer}
                            detalle="Prioriza su dispensación antes de que caduquen."
                            cta="Ver lotes"
                            onPress={() => router.push("/almacen/caducidades" as any)}
                          />
                        </View>

                        <View style={{ width: pct(m.colsAlerta), padding: 6 }}>
                          <AlertaCard
                            c={c}
                            m={m}
                            icon="cube-outline"
                            color={c.info}
                            severidad="alta"
                            titulo={`Stock bajo (≤ ${resumen.umbral_stock_bajo})`}
                            valor={resumen.medicamentos_stock_bajo}
                            detalle="Medicamentos bajo el umbral mínimo. Considera reabasto."
                            cta="Ir a inventario"
                            onPress={() => router.push("/admin/inventario" as any)}
                          />
                        </View>
                      </View>

                      {/* Acción rápida extra: dispensar */}
                      <View style={{ marginTop: 12 }}>
                        <Pressable
                          onPress={() => router.push("/almacen/dispensacion" as any)}
                          accessibilityRole="button"
                          accessibilityLabel="Ir a dispensar recetas"
                        >
                          {(state: PState) => (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: m.r(16),
                                borderRadius: m.r(16),
                                backgroundColor: withAlpha(c.primary, state.pressed ? 0.2 : 0.14),
                                borderWidth: 1,
                                borderColor: withAlpha(c.primary, 0.4),
                              }}
                            >
                              <View
                                style={{
                                  width: m.r(44),
                                  height: m.r(44),
                                  borderRadius: m.r(14),
                                  backgroundColor: c.primary,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: m.r(12),
                                }}
                              >
                                <Ionicons name="medical" size={m.r(22)} color="#FFFFFF" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14 * m.esc, fontWeight: "900", color: c.text }}>
                                  Dispensar recetas ahora
                                </Text>
                                <Text style={{ fontSize: 11.5 * m.esc, color: c.muted, marginTop: 2 }}>
                                  Entrega con validación de stock y caducidad
                                </Text>
                              </View>
                              <Ionicons name="arrow-forward" size={m.r(18)} color={c.primary} />
                            </View>
                          )}
                        </Pressable>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* 2. ACCESOS */}
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

              {/* 3. CONTADORES */}
              {pagina(
                "contadores",
                <>
                  {cargando && !resumen ? (
                    <Panel c={c} m={m} titulo="Cargando indicadores" icon="speedometer-outline" color={c.info}>
                      <View style={{ paddingVertical: m.r(20), alignItems: "center" }}>
                        <ActivityIndicator color={c.primary} />
                        <Text style={{ marginTop: 8, fontSize: 12.5 * m.esc, color: c.muted }}>
                          Consultando existencias, caducidades y recetas…
                        </Text>
                      </View>
                    </Panel>
                  ) : !resumen ? (
                    <Panel c={c} m={m} titulo="Sin datos" icon="cloud-offline-outline" color={c.error}>
                      <SinDatos c={c} m={m} error />
                    </Panel>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
                      {kpis.map((k) => (
                        <View key={k.label} style={{ width: pct(m.colsKpi), padding: 6 }}>
                          <KpiCard
                            c={c}
                            m={m}
                            label={k.label}
                            detalle={k.detalle}
                            icon={k.icon}
                            color={k.color}
                            valor={k.valor}
                            cargando={cargando}
                            onPress={() => router.push(k.ruta as any)}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </Animated.ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}