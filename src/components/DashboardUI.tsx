import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentProps, ReactNode, useState } from "react";
import {
    Animated, Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { type Theme } from "../theme/theme";

const ND = Platform.OS !== "web";
type IconName = ComponentProps<typeof Ionicons>["name"];
type PState = { pressed: boolean; hovered?: boolean };

const WEB_BLUR: any =
  Platform.OS === "web"
    ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
    : null;

/* ---------- Glass card ---------- */
export function Glass({
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

/* ---------- Luces de fondo ---------- */
export function FondoLuces({ c }: { c: Theme }) {
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

/* ---------- Cabecera con saludo + avatar gradiente ---------- */
export function HeaderSaludo({
  c,
  esc,
  saludo,
  nombre,
  rol,
}: {
  c: Theme;
  esc: number;
  saludo: string;
  nombre: string;
  rol: string;
}) {
  return (
    <Glass
      c={c}
      radius={18}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <LinearGradient
        colors={[c.gradFrom, c.gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
          {nombre?.charAt(0)?.toUpperCase() || "U"}
        </Text>
      </LinearGradient>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11.5 * esc, color: c.muted }}>{saludo}</Text>
        <Text numberOfLines={1} style={{ fontSize: 17 * esc, fontWeight: "800", color: c.text }}>
          {nombre}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.primary} style={{ marginRight: 4 }} />
          <Text numberOfLines={1} style={{ fontSize: 11 * esc, fontWeight: "700", color: c.primary }}>
            {rol}
          </Text>
        </View>
      </View>
    </Glass>
  );
}

/* ---------- Título de sección ---------- */
export function SectionTitle({
  c,
  esc,
  icon,
  color,
  children,
}: {
  c: Theme;
  esc: number;
  icon: IconName;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 12 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: `${color}22`,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
        }}
      >
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 16 * esc, fontWeight: "800", color: c.text }}>{children}</Text>
    </View>
  );
}

/* ---------- Tarjeta de acceso ---------- */
export function AccionCard({
  c,
  esc,
  icon,
  color,
  titulo,
  descripcion,
  onPress,
}: {
  c: Theme;
  esc: number;
  icon: IconName;
  color: string;
  titulo: string;
  descripcion: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={(s: PState) => ({ marginBottom: 10 })}
    >
      {(s) => (
        <Glass
          c={c}
          radius={16}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderColor: s.pressed ? color : c.glassBorder,
            opacity: s.pressed ? 0.9 : 1,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              backgroundColor: `${color}22`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14 * esc, fontWeight: "800", color: c.text }}>{titulo}</Text>
            <Text numberOfLines={2} style={{ fontSize: 11.5 * esc, color: c.muted, marginTop: 3 }}>
              {descripcion}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </Glass>
      )}
    </Pressable>
  );
}

/* ---------- Tarjeta de métrica ---------- */
export function InfoCard({
  c,
  esc,
  icon,
  color,
  valor,
  label,
  loading,
}: {
  c: Theme;
  esc: number;
  icon: IconName;
  color: string;
  valor: string | number;
  label: string;
  loading?: boolean;
}) {
  return (
    <Glass c={c} radius={18} style={{ flex: 1, padding: 16, minHeight: 130 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: `${color}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={{ fontSize: 28 * esc, fontWeight: "800", color: c.text, marginTop: 12 }}>
        {loading ? "—" : valor}
      </Text>
      <Text numberOfLines={2} style={{ fontSize: 12 * esc, color: c.muted, marginTop: 2 }}>
        {label}
      </Text>
    </Glass>
  );
}

/* ---------- Aviso ---------- */
export function Notice({
  c,
  esc,
  icon,
  titulo,
  texto,
}: {
  c: Theme;
  esc: number;
  icon: IconName;
  titulo: string;
  texto: string;
}) {
  return (
    <Glass
      c={c}
      radius={16}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        marginTop: 18,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: c.activeBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13 * esc, fontWeight: "800", color: c.text }}>{titulo}</Text>
        <Text style={{ fontSize: 11 * esc, color: c.muted, marginTop: 3 }}>{texto}</Text>
      </View>
    </Glass>
  );
}

/* ---------- Footer ---------- */
export function Footer({ c, esc }: { c: Theme; esc: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 32 }}>
      <View
        style={{
          width: 60,
          height: 3,
          borderRadius: 2,
          backgroundColor: c.glassBorder,
          marginBottom: 10,
        }}
      />
      <Text style={{ fontSize: 10, color: c.muted, letterSpacing: 0.5 }}>
        VITALIA · Gestión clínica inteligente
      </Text>
    </View>
  );
}
/* ---------- Cabecera adaptativa: azul rey oscuro en claro, gradiente en oscuro ---------- */
export function HeroSaludo({
  c,
  esc,
  saludo,
  nombre,
  rol,
  gradColors,
  iconoRol = "shield-checkmark-outline",
}: {
  c: Theme;
  esc: number;
  saludo: string;
  nombre: string;
  rol: string;
  gradColors?: [string, string];
  iconoRol?: IconName;
}) {
  const isLight = c.mode !== "dark";

  // Azul rey oscuro en modo claro (parecido al bg del layout pero más vivo)
  const azulReyClaro: [string, string] = ["#0F172A", "#0F4C45"];
  const gradienteOscuro: [string, string] = gradColors ?? [c.gradFrom, c.gradTo];

  const colores = isLight ? azulReyClaro : gradienteOscuro;

  const textoTitulo = "#FFFFFF";
  const textoSuave = "rgba(255,255,255,0.85)";
  const textoRol = "rgba(255,255,255,0.95)";
  const avatarBg = "rgba(255,255,255,0.18)";
  const avatarBorder = "rgba(255,255,255,0.35)";
  const circuloDecor = "rgba(255,255,255,0.08)";
  const shadowColor = isLight ? "#1E2A78" : gradienteOscuro[0];

  return (
    <LinearGradient
      colors={colores}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: isLight ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.12)",
        shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isLight ? 0.22 : 0.28,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: circuloDecor,
        }}
      />

      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: avatarBg,
          borderWidth: 1.5,
          borderColor: avatarBorder,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>
          {nombre?.charAt(0)?.toUpperCase() || "U"}
        </Text>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11 * esc, color: textoSuave, fontWeight: "600" }}>
          {saludo}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: 17 * esc, fontWeight: "800", color: textoTitulo, marginTop: 1 }}
        >
          {nombre}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
          <Ionicons name={iconoRol} size={12} color={textoRol} style={{ marginRight: 4 }} />
          <Text
            numberOfLines={1}
            style={{ fontSize: 11 * esc, fontWeight: "700", color: textoRol }}
          >
            {rol}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
/* ---------- Pestañas tipo Admin ---------- */
export type TabItem = {
  key: string;
  label: string;
  icon: IconName;
};

export function TabsBar({
  c,
  esc,
  tabs,
  activa,
  scrollX,
  anchoPagina,
  mostrarIconos,
  onSelect,
}: {
  c: Theme;
  esc: number;
  tabs: TabItem[];
  activa: number;
  scrollX: Animated.Value;
  anchoPagina: number;
  mostrarIconos: boolean;
  onSelect: (i: number) => void;
}) {
  const [barW, setBarW] = useState(0);
  const tabW = barW > 8 ? (barW - 8) / tabs.length : 0;

  return (
    <Glass c={c} radius={16} style={{ padding: 4, flexDirection: "row", marginTop: 14 }}>
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
              borderRadius: 12,
              backgroundColor: c.primary,
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              transform: [
                {
                  translateX: scrollX.interpolate({
                    inputRange: [0, Math.max(anchoPagina, 1) * (tabs.length - 1)],
                    outputRange: [0, tabW * (tabs.length - 1)],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          />
        )}

        {tabs.map((t, i) => {
          const on = activa === i;
          return (
            <Pressable
              key={t.key}
              onPress={() => onSelect(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}
            >
              {mostrarIconos && (
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={on ? c.onPrimary : c.primary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontSize: 12.5 * esc, fontWeight: "800", color: on ? c.onPrimary : c.muted }}
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

/* ---------- Empty state estilizado ---------- */
export function EmptyState({
  c,
  esc,
  icon,
  titulo,
  texto,
}: {
  c: Theme;
  esc: number;
  icon: IconName;
  titulo: string;
  texto: string;
}) {
  return (
    <Glass c={c} radius={18} style={{ padding: 28, alignItems: "center", marginTop: 8 }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: c.activeBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Ionicons name={icon} size={30} color={c.primary} />
      </View>
      <Text style={{ fontSize: 15 * esc, fontWeight: "800", color: c.text, textAlign: "center", marginBottom: 6 }}>
        {titulo}
      </Text>
      <Text style={{ fontSize: 12.5 * esc, color: c.muted, textAlign: "center", lineHeight: 18 * esc, maxWidth: 380 }}>
        {texto}
      </Text>
    </Glass>
  );
} 