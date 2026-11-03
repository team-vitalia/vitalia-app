import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ComponentProps, ReactNode, RefObject, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TouchableOpacity,
  View,
  ViewStyle,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import {
  CURP_LONGITUD,
  GENEROS,
  fechaDeCurp,
  fechaNacimientoISO,
  fortalezaPassword,
  normalizarCurp,
  normalizarEspacios,
  vCorreo,
  vCurp,
  vFechaNacimiento,
  vGenero,
  vNombrePersona,
  vPassword,
  vTelefono,
} from "../components/admin/validaciones";
import { useAuth } from "../context/AuthContext";
import { registrarPaciente } from "../services/registroService";
import { mensajeError } from "../services/util";

/* ============================================================
   TEMAS (paleta Vitalia: claro y oscuro)
============================================================ */

const LIGHT = {
  mode: "light" as "light" | "dark",
  primary: "#0F766E",
  secondary: "#2DD4BF",
  dark: "#134E4A",
  bg: "#F8FAFC",
  bgSoft: "#CCFBF1",
  card: "rgba(241,245,249,0.85)",
  text: "#1E203B",
  muted: "#64748B",
  border: "#E2E8F0",
  inputBg: "#F8FAFC",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  info: "#0284C7",
  // Botón principal
  btnFrom: "#0F766E",
  btnTo: "#134E4A",
  onBtn: "#FFFFFF",
  // Panel de marca
  brandFrom: "#0F766E",
  brandTo: "#134E4A",
  onBrand: "#FFFFFF",
  onBrandMuted: "rgba(255,255,255,0.82)",
  brandGlass: "rgba(255,255,255,0.10)",
  brandGlassBorder: "rgba(255,255,255,0.18)",
  brandLogoTile: "rgba(255,255,255,0.14)",
  brandIconBg: "rgba(45,212,191,0.28)",
  brandIconFg: "#FFFFFF",
  brandLine: "#99F6E4",
  brandLineGlow: "#2DD4BF",
  brandBaseLine: "rgba(255,255,255,0.14)",
  brandLightA: "#2DD4BF",
  brandLightAOp: 0.5,
  brandLightB: "#5EEAD4",
  brandLightBOp: 0.28,
  // Luces y foco
  glow: "#2DD4BF",
  focus: "#0F766E",
};

type Theme = typeof LIGHT;

const DARK: Theme = {
  mode: "dark",
  primary: "#2DD4BF",
  secondary: "#2DD4BF",
  dark: "#134E4A",
  bg: "#0F172A",
  bgSoft: "#134E4A",
  card: "#1E293B",
  text: "#F8FAFC",
  muted: "#94A3B8",
  border: "#334155",
  inputBg: "#0F172A",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  errorBg: "#3B1D22",
  errorBorder: "#7F1D1D",
  info: "#38BDF8",
  btnFrom: "#2DD4BF",
  btnTo: "#0F766E",
  onBtn: "#0F172A",
  brandFrom: "#134E4A",
  brandTo: "#0F172A",
  onBrand: "#F8FAFC",
  onBrandMuted: "rgba(248,250,252,0.8)",
  brandGlass: "rgba(255,255,255,0.08)",
  brandGlassBorder: "rgba(255,255,255,0.16)",
  brandLogoTile: "rgba(255,255,255,0.1)",
  brandIconBg: "rgba(45,212,191,0.25)",
  brandIconFg: "#F8FAFC",
  brandLine: "#2DD4BF",
  brandLineGlow: "#2DD4BF",
  brandBaseLine: "rgba(255,255,255,0.14)",
  brandLightA: "#2DD4BF",
  brandLightAOp: 0.45,
  brandLightB: "#2DD4BF",
  brandLightBOp: 0.2,
  glow: "#2DD4BF",
  focus: "#2DD4BF",
};

type IconName = ComponentProps<typeof Ionicons>["name"];
// Tipos tomados de TextInput para que funcionen con cualquier version de React Native
type FocusEv = Parameters<NonNullable<TextInputProps["onFocus"]>>[0];
type BlurEv = Parameters<NonNullable<TextInputProps["onBlur"]>>[0];
type Styles = ReturnType<typeof createStyles>;

const FEATURES: { icon: IconName; title: string }[] = [
  { icon: "business-outline", title: "Gestión de clínicas" },
  { icon: "calendar-outline", title: "Citas y pacientes" },
  { icon: "document-text-outline", title: "Expedientes" },
  { icon: "bar-chart-outline", title: "Reportes" },
];

// useNativeDriver no existe en web
const ND = Platform.OS !== "web";

// Cursor de mano en web (en nativo no hace nada)
const POINTER: any = Platform.OS === "web" ? { cursor: "pointer" } : null;

// Limita el escalado de fuente del sistema para que el diseño no se rompa
const MAX_FONT_SCALE = 1.3;

/* ============================================================
   UTILIDADES
============================================================ */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getStorage = (): Storage | null => {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage;
    }
  } catch {}
  return null;
};

// Alert.alert no hace nada en web; allí el error ya se muestra en pantalla
const avisar = (titulo: string, mensaje: string) => {
  if (Platform.OS !== "web") Alert.alert(titulo, mensaje);
};

const irSegunRol = (router: ReturnType<typeof useRouter>, rolId: number | undefined) => {
  switch (rolId) {
    case 1: router.replace("/admin"); return true;
    case 2: router.replace("/doctor"); return true;
    case 3: router.replace("/paciente"); return true;
    case 4: router.replace("/recepcion"); return true;
    case 5: router.replace("/coordinador"); return true;
    default: return false;
  }
};

// Texto con tope de escalado de fuente (accesibilidad sin romper el layout)
function T(props: TextProps) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

// Respeta "Reducir movimiento" del sistema
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v: boolean) => vivo && setReduce(v))
      .catch(() => {});
    const sub: any = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/* ============================================================
   SISTEMA DE LAYOUT RESPONSIVE
   Se recalcula al rotar, redimensionar la ventana, plegar el
   dispositivo, entrar en pantalla dividida, etc.

   - xs:            < 340   (plegables cerrados, teléfonos muy chicos)
   - phone:         < 640   -> 1 columna apilada
   - tablet vert.:  >= 640 portrait -> 1 columna con tarjeta centrada
   - 2 columnas:    landscape >= 720  o  portrait >= 1100
   - compact:       2 columnas con poca altura o poco ancho
   - short:         altura < 560 | veryShort: altura < 420
   - xl:            >= 1280 / ultra-wide >= 1600
============================================================ */

function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const landscape = width > height;
    const twoColumn = landscape ? width >= 720 : width >= 1100;
    const xs = width < 340;
    const phone = width < 640;
    const short = height < 560;
    const veryShort = height < 420;
    const tabletPortrait = !twoColumn && width >= 640;
    const compact = twoColumn && (height < 800 || width < 960);

    // Qué se muestra según el espacio disponible
    const showFeatures = twoColumn && height >= 600;
    const showDescription = twoColumn && height >= 440;
    const showFooter = twoColumn && height >= 400;
    const showSubtitle = !veryShort;

    // Reparto de columnas
    const brandFlex = width >= 1280 ? 1.15 : width >= 900 ? 1 : 0.9;
    const formFlex = width >= 900 ? 1 : 1.1;
    const brandW = twoColumn ? width * (brandFlex / (brandFlex + formFlex)) : width;

    // Panel de marca
    const brandPadH = twoColumn ? clamp(width * 0.04, 24, 64) : 0;
    const brandPadV = compact ? 24 : clamp(height * 0.06, 32, 56);
    const brandInnerW = Math.max(brandW - brandPadH * 2 - insets.left, 200);
    const headlineRaw = clamp(brandInnerW * 0.085, 24, 46);
    const headline = compact ? Math.min(headlineRaw, 32) : headlineRaw;
    const headlineLH = Math.round(headline * 1.24);
    const brandMaxW = width >= 1600 ? 600 : 520;
    const featureBasis: "47%" | "100%" = brandInnerW < 300 ? "100%" : "47%";

    // Columna / tarjeta del formulario
    const formPadH = clamp(width * 0.03, 20, 48);
    const formPadV = compact ? 20 : clamp(height * 0.05, 24, 48);
    const cardPad = twoColumn
      ? compact ? 24 : width >= 1280 ? 40 : 36
      : xs ? 16 : phone ? 22 : 32;
    const cardMaxW = twoColumn
      ? width >= 1600 ? 520 : width >= 1280 ? 480 : 460
      : tabletPortrait ? 560 : 520;
    const sideInset = Math.max(insets.left, insets.right);
    const cardGutter = (xs ? 10 : phone ? 16 : 24) + sideInset;

    // Campos y tipografía del formulario
    const fieldH = veryShort || compact ? 48 : width >= 1280 ? 56 : 52;
    const fieldGap = compact ? 12 : 16;
    const titleSize = xs ? 21 : twoColumn ? (compact ? 24 : 26) : phone ? 24 : 28;
    const tabsGap = compact ? 18 : 26;

    // Solapamiento de la tarjeta sobre el panel de marca (solo pantallas amplias)
    const overlap = twoColumn && width >= 1100 ? -clamp(width * 0.025, 24, 48) : 0;

    // En pantallas altas (tablet vertical, móviles grandes) la cabecera crece
    const headerExtra = !twoColumn && !short ? clamp((height - 760) * 0.22, 0, 110) : 0;

    return {
      width,
      height,
      twoColumn,
      xs,
      phone,
      short,
      veryShort,
      tabletPortrait,
      compact,
      showFeatures,
      showDescription,
      showFooter,
      showSubtitle,
      brandFlex,
      formFlex,
      brandPadH,
      brandPadV,
      brandInnerW,
      headline,
      headlineLH,
      brandMaxW,
      featureBasis,
      formPadH,
      formPadV,
      cardPad,
      cardMaxW,
      cardGutter,
      fieldH,
      fieldGap,
      titleSize,
      tabsGap,
      overlap,
      headerExtra,
      insetT: insets.top,
      insetB: insets.bottom,
      insetL: insets.left,
      insetR: insets.right,
    };
  }, [width, height, insets.top, insets.bottom, insets.left, insets.right]);
}

type Layout = ReturnType<typeof useLayout>;

/* ============================================================
   COMPONENTES DE ANIMACIÓN
============================================================ */

// Entrada suave: un solo fundido corto (sin desplazamientos ni cascada)
function Reveal({
  delay: _delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: ND,
    }).start();
  }, []);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

// Fondo de marca: monitor de signos vitales (cuadrícula clínica, latido ECG que se dibuja y se borra, luces de color)
const SafePath = forwardRef<any, any>(({ collapsable, ...props }, ref) => (
  <Path ref={ref} {...props} />
));
const AnimatedPath = Animated.createAnimatedComponent(SafePath);
const ECG =
  "M0 300 H70 L84 300 L94 282 L104 300 H132 L144 312 L156 214 L168 346 L180 300 H236 L250 290 L264 300 H316 L328 312 L340 246 L352 328 L364 300 H400";
const ECG_LEN = 900;

// bottom = ancla el latido en la parte baja del panel (2 columnas) para que
// no quede detrás de las tarjetas de funciones.
function PulseBackdrop({ c, compact, bottom }: { c: Theme; compact?: boolean; bottom?: boolean }) {
  const reduce = useReduceMotion();
  const draw = useRef(new Animated.Value(0)).current; // 0 -> 1, una sola vez
  const breath = useRef(new Animated.Value(0)).current; // respiracion lenta de la luz

  useEffect(() => {
    if (reduce) {
      draw.setValue(1);
      breath.setValue(0.5);
      return;
    }
    Animated.timing(draw, {
      toValue: 1,
      duration: 2200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breath, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce]);

  const offset = draw.interpolate({ inputRange: [0, 1], outputRange: [ECG_LEN, 0] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.26] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox={compact ? "0 190 400 200" : "0 0 400 600"}
        preserveAspectRatio={bottom ? "xMidYMax slice" : "xMidYMid slice"}
      >
        <Defs>
          <RadialGradient id="luzSuperior" cx="88%" cy="6%" r="80%">
            <Stop offset="0" stopColor={c.brandLightA} stopOpacity={c.brandLightAOp} />
            <Stop offset="1" stopColor={c.brandLightA} stopOpacity="0" />
          </RadialGradient>
          <SvgLinearGradient id="banda" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.brandLightA} stopOpacity="0" />
            <Stop offset="0.5" stopColor={c.brandLightA} stopOpacity="0.18" />
            <Stop offset="1" stopColor={c.brandLightA} stopOpacity="0" />
          </SvgLinearGradient>
          <RadialGradient id="luzCentro" cx="62%" cy="55%" r="55%">
            <Stop offset="0" stopColor={c.brandLightB} stopOpacity="0.16" />
            <Stop offset="1" stopColor={c.brandLightB} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="luzInferior" cx="0%" cy="100%" r="65%">
            <Stop offset="0" stopColor={c.brandLightB} stopOpacity={c.brandLightBOp} />
            <Stop offset="1" stopColor={c.brandLightB} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={400} height={600} fill="url(#luzSuperior)" />
        <Rect x={0} y={0} width={400} height={600} fill="url(#luzInferior)" />
        <Rect x={0} y={0} width={400} height={600} fill="url(#luzCentro)" />

        <G transform={compact ? undefined : bottom ? "translate(0 235)" : "translate(0 150)"}>
          {/* Banda de luz suave detras del latido */}
          <Rect x={0} y={215} width={400} height={170} fill="url(#banda)" />
          {/* Traza fija tenue */}
          <Path d={ECG} stroke={c.brandBaseLine} strokeWidth={2} fill="none" strokeLinejoin="round" />
          {/* Resplandor */}
          <AnimatedPath
            d={ECG}
            stroke={c.brandLineGlow}
            strokeOpacity={glow as any}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[ECG_LEN, ECG_LEN]}
            strokeDashoffset={offset as any}
          />
          {/* Línea viva */}
          <AnimatedPath
            d={ECG}
            stroke={c.brandLine}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[ECG_LEN, ECG_LEN]}
            strokeDashoffset={offset as any}
          />
        </G>
      </Svg>
    </View>
  );
}

// Selector de acceso siempre visible (solo texto, sin iconos)
function AuthTabs({
  styles,
  active,
  onLogin,
  onRegister,
}: {
  styles: Styles;
  active: "login" | "registro";
  onLogin?: () => void;
  onRegister?: () => void;
}) {
  const tab = (id: "login" | "registro", label: string, onPress?: () => void) => {
    const on = active === id;
    return (
      <Pressable
        onPress={on ? undefined : onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={({ pressed }: { pressed: boolean }) => [
          on ? styles.tabActive : styles.tabInactive,
          POINTER,
          pressed && !on && { opacity: 0.6 },
        ]}
      >
        <T
          style={on ? styles.tabActiveText : styles.tabInactiveText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </T>
      </Pressable>
    );
  };
  return (
    <View style={styles.tabsRow} accessibilityRole="tablist">
      {tab("login", "Iniciar sesión", onLogin)}
      {tab("registro", "Crear cuenta", onRegister)}
    </View>
  );
}

// Pressable con rebote al presionar
function PressScale({
  children,
  style,
  onPress,
  disabled,
  testID,
  accessibilityRole,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityRole?: "button" | "link";
  accessibilityLabel?: string;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(s, { toValue: value, speed: 40, bounciness: 6, useNativeDriver: ND }).start();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.985)}
      onPressOut={() => to(1)}
      style={POINTER}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ============================================================
   CAMPO DE TEXTO CON FOCO LUMINOSO
============================================================ */

type FieldProps = TextInputProps & {
  c: Theme;
  label: string;
  icon?: IconName;
  right?: ReactNode;
  inputRef?: RefObject<TextInput | null>;
  fieldHeight?: number;
  gap?: number;
  /** Mensaje de error bajo el campo (también pone el borde en rojo). */
  error?: string;
  /** Solo borde rojo, sin mensaje (campos agrupados). */
  invalid?: boolean;
};

function Field({ c, label, icon, right, inputRef, fieldHeight = 52, gap = 16, error, invalid, ...inputProps }: FieldProps) {
  const f = useRef(new Animated.Value(0)).current;
  const animar = (to: number) =>
    Animated.timing(f, { toValue: to, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

  return (
    <View style={{ marginBottom: gap }}>
      <T style={{ fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 7 }}>{label}</T>
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: fieldHeight,
          borderRadius: 12,
          borderWidth: 1.5,
          paddingHorizontal: 14,
          backgroundColor: c.inputBg,
          borderColor: error || invalid ? c.error : f.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.focus] }),
          shadowColor: c.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: f.interpolate({ inputRange: [0, 1], outputRange: [0, 0.38] }),
          shadowRadius: 10,
        }}
      >
        {icon ? (
          <Animated.Text style={{ marginRight: 10 }}>
            <Ionicons name={icon} size={19} color={error || invalid ? c.error : c.primary} />
          </Animated.Text>
        ) : null}
        <TextInput
          ref={inputRef as any}
          accessibilityLabel={label}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          {...inputProps}
          placeholderTextColor={c.muted}
          onFocus={(e: FocusEv) => {
            animar(1);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e: BlurEv) => {
            animar(0);
            inputProps.onBlur?.(e);
          }}
          style={[
            // 16px en web evita el zoom automático de iOS Safari al enfocar
            { flex: 1, height: "100%", minWidth: 0, fontSize: Platform.OS === "web" ? 16 : 15, color: c.text },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null,
          ]}
        />
        {right}
      </Animated.View>
      {error ? (
        <T style={{ color: c.error, fontSize: 12, fontWeight: "600", marginTop: 5 }} accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : null}
    </View>
  );
}

/* ============================================================
   PANTALLA
============================================================ */

/* ============================================================
   REGISTRO DE PACIENTES (dentro de la pestaña "Crear cuenta")
   Asistente de 3 pasos para que en móvil cada pantalla tenga pocos
   campos y no haya que desplazarse por un formulario largo.
   El rol NO se envía: el backend (POST /api/auth/registro) fija Paciente.
============================================================ */

const REG_VACIO = {
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  curp: "",
  dia: "",
  mes: "",
  anio: "",
  genero: "",
  telefono: "",
  correo: "",
  password: "",
  confirmar: "",
};
type CampoRegistro = keyof typeof REG_VACIO;

const PASOS: { titulo: string; subtitulo: string; icon: IconName }[] = [
  { titulo: "Tus datos", subtitulo: "Empecemos por tu nombre.", icon: "person-outline" },
  { titulo: "Identidad", subtitulo: "Con estos datos identificamos tu expediente.", icon: "id-card-outline" },
  { titulo: "Tu cuenta", subtitulo: "Con esto iniciarás sesión.", icon: "lock-closed-outline" },
];

const GENERO_ICONOS: Record<string, IconName> = {
  Femenino: "female-outline",
  Masculino: "male-outline",
  Otro: "transgender-outline",
};

function useRegistroPaciente() {
  const [f, setF] = useState(REG_VACIO);
  const [paso, setPaso] = useState(0);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [srv, setSrv] = useState<{ correo?: string; curp?: string }>({});
  const [registrado, setRegistrado] = useState<{ nombre: string; correo: string } | null>(null);

  const set = (campo: CampoRegistro) => (valor: string) => {
    let v = valor;
    if (campo === "curp") v = normalizarCurp(valor).slice(0, CURP_LONGITUD);
    if (campo === "dia" || campo === "mes") v = valor.replace(/\D/g, "").slice(0, 2);
    if (campo === "anio") v = valor.replace(/\D/g, "").slice(0, 4);
    setF((a) => ({ ...a, [campo]: v }));
    if (campo === "correo") setSrv((e) => ({ ...e, correo: undefined }));
    if (campo === "curp") setSrv((e) => ({ ...e, curp: undefined }));
  };

  const fechaISO = fechaNacimientoISO(f.dia, f.mes, f.anio);
  const fechaCurp = fechaDeCurp(f.curp);
  const errores = {
    nombre: vNombrePersona(f.nombre, "El nombre"),
    apellidoPaterno: vNombrePersona(f.apellidoPaterno, "El apellido paterno"),
    apellidoMaterno: vNombrePersona(f.apellidoMaterno, "El apellido materno", false),
    curp: srv.curp ?? vCurp(f.curp),
    fecha:
      vFechaNacimiento(f.dia, f.mes, f.anio) ||
      (fechaCurp && fechaISO && fechaCurp !== fechaISO ? "La fecha no coincide con la de tu CURP." : ""),
    genero: vGenero(f.genero),
    telefono: vTelefono(f.telefono),
    correo: srv.correo ?? vCorreo(f.correo),
    password: vPassword(f.password),
    confirmar: !f.confirmar ? "Confirma la contraseña." : f.confirmar !== f.password ? "Las contraseñas no coinciden." : "",
  };
  const porPaso = [
    [errores.nombre, errores.apellidoPaterno, errores.apellidoMaterno],
    [errores.curp, errores.fecha, errores.genero, errores.telefono],
    [errores.correo, errores.password, errores.confirmar],
  ];

  const siguiente = () => {
    setIntento(true);
    if (porPaso[paso].some(Boolean)) return;
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
    setIntento(false);
  };

  const atras = () => {
    setPaso((p) => Math.max(p - 1, 0));
    setIntento(false);
    setErrorGeneral("");
  };

  const enviar = async () => {
    setIntento(true);
    setErrorGeneral("");
    const conError = porPaso.findIndex((g) => g.some(Boolean));
    if (conError !== -1) {
      setPaso(conError);
      return;
    }
    try {
      setGuardando(true);
      const r = await registrarPaciente({
        nombre: normalizarEspacios(f.nombre),
        apellido_paterno: normalizarEspacios(f.apellidoPaterno),
        apellido_materno: normalizarEspacios(f.apellidoMaterno) || null,
        curp: normalizarCurp(f.curp),
        fecha_nacimiento: fechaISO,
        genero: f.genero,
        correo_electronico: f.correo.trim().toLowerCase(),
        password: f.password,
        telefono: f.telefono.trim() || null,
      });
      setF((a) => ({ ...a, password: "", confirmar: "" }));
      setRegistrado({ nombre: r.usuario.nombre, correo: r.usuario.correo_electronico });
    } catch (e: any) {
      const msg = mensajeError(e, "No se pudo crear la cuenta. Inténtalo de nuevo.");
      if (/curp/i.test(msg)) {
        setSrv((x) => ({ ...x, curp: msg }));
        setPaso(1);
      } else if (/correo/i.test(msg)) {
        setSrv((x) => ({ ...x, correo: msg }));
        setPaso(2);
      } else setErrorGeneral(msg);
    } finally {
      setGuardando(false);
    }
  };

  const reset = () => {
    setF(REG_VACIO);
    setPaso(0);
    setIntento(false);
    setErrorGeneral("");
    setSrv({});
    setRegistrado(null);
  };

  return { f, set, errores, paso, intento, guardando, errorGeneral, setErrorGeneral, registrado, siguiente, atras, enviar, reset };
}

function RegistroForm({
  c,
  L,
  styles,
  reg,
  onIrALogin,
  onLegal,
}: {
  c: Theme;
  L: Layout;
  styles: Styles;
  reg: ReturnType<typeof useRegistroPaciente>;
  onIrALogin: (correo?: string) => void;
  onLegal: (ruta: string) => void;
}) {
  const rs = useMemo(() => createRegStyles(c, L), [c, L]);
  const { f, set, errores, paso, intento, guardando, errorGeneral, registrado } = reg;
  const [verPassword, setVerPassword] = useState(false);
  const apPatRef = useRef<TextInput>(null);
  const apMatRef = useRef<TextInput>(null);
  const diaRef = useRef<TextInput>(null);
  const mesRef = useRef<TextInput>(null);
  const anioRef = useRef<TextInput>(null);
  const correoRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confRef = useRef<TextInput>(null);
  const exito = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!registrado) return;
    exito.setValue(0);
    Animated.spring(exito, { toValue: 1, friction: 6, tension: 80, useNativeDriver: ND }).start();
  }, [registrado]);

  const fort = fortalezaPassword(f.password);
  const colorFort = fort.puntos <= 1 ? c.error : fort.puntos === 2 ? c.warning : fort.puntos === 3 ? c.info : c.success;
  const fieldH = L.fieldH;
  const gap = L.fieldGap;
  const verFecha = intento || (!!f.dia && !!f.mes && f.anio.length === 4);

  /* ---------- Pantalla de éxito ---------- */
  if (registrado) {
    return (
      <Reveal delay={0} style={rs.exito}>
        <Animated.View
          style={[
            rs.exitoIcono,
            { opacity: exito, transform: [{ scale: exito.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
          ]}
        >
          <Ionicons name="checkmark" size={34} color="#FFFFFF" />
        </Animated.View>
        <T style={styles.formTitle}>Cuenta creada correctamente</T>
        <T style={[styles.formSubtitle, { textAlign: "center" }]}>
          Hola, {registrado.nombre}. Tu cuenta de paciente está lista. Ya puedes iniciar sesión con {registrado.correo}.
        </T>
        <PressScale onPress={() => onIrALogin(registrado.correo)} style={[styles.loginButtonWrapper, { alignSelf: "stretch" }]}>
          <LinearGradient colors={[c.btnFrom, c.btnTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginButton}>
            <T style={styles.loginText}>Iniciar sesión</T>
          </LinearGradient>
        </PressScale>
      </Reveal>
    );
  }

  const esUltimo = paso === PASOS.length - 1;

  return (
    <View>
      <Reveal delay={120}>
        <T style={styles.formTitle}>Crea tu cuenta de paciente</T>
        {L.showSubtitle ? <T style={styles.formSubtitle}>{PASOS[paso].subtitulo}</T> : null}
      </Reveal>

      {/* Indicador de progreso */}
      <View style={rs.stepper} accessibilityRole="progressbar" accessibilityLabel={`Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso].titulo}`}>
        {PASOS.map((p, i) => {
          const hecho = i < paso;
          const activo = i === paso;
          return (
            <View key={p.titulo} style={rs.stepWrap}>
              {i > 0 ? <View style={[rs.stepLine, i <= paso && rs.stepLineOn]} /> : <View style={rs.stepLineSpacer} />}
              <View style={rs.stepItem}>
                <View style={[rs.stepDot, (hecho || activo) && rs.stepDotOn, activo && rs.stepDotActive]}>
                  <Ionicons name={hecho ? "checkmark" : p.icon} size={15} color={hecho || activo ? c.onBtn : c.muted} />
                </View>
                <T style={[rs.stepLabel, activo && rs.stepLabelOn]} numberOfLines={1}>
                  {p.titulo}
                </T>
              </View>
            </View>
          );
        })}
      </View>

      <Reveal key={paso} delay={0}>
        {paso === 0 ? (
          <>
            <Field
              c={c}
              label="Nombre(s)"
              icon="person-outline"
              fieldHeight={fieldH}
              gap={gap}
              placeholder="Ej. María Fernanda"
              value={f.nombre}
              onChangeText={set("nombre")}
              error={intento ? errores.nombre : ""}
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="name-given"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => apPatRef.current?.focus()}
            />
            <Field
              c={c}
              label="Apellido paterno"
              icon="person-outline"
              fieldHeight={fieldH}
              gap={gap}
              inputRef={apPatRef}
              placeholder="Ej. López"
              value={f.apellidoPaterno}
              onChangeText={set("apellidoPaterno")}
              error={intento ? errores.apellidoPaterno : ""}
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="name-family"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={() => apMatRef.current?.focus()}
            />
            <Field
              c={c}
              label="Apellido materno (opcional)"
              icon="person-outline"
              fieldHeight={fieldH}
              gap={gap}
              inputRef={apMatRef}
              placeholder="Ej. Reyes"
              value={f.apellidoMaterno}
              onChangeText={set("apellidoMaterno")}
              error={intento ? errores.apellidoMaterno : ""}
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="next"
              onSubmitEditing={siguienteSeguro(reg)}
            />
          </>
        ) : null}

        {paso === 1 ? (
          <>
            <Field
              c={c}
              label="CURP"
              icon="id-card-outline"
              fieldHeight={fieldH}
              gap={6}
              placeholder="18 caracteres"
              value={f.curp}
              onChangeText={set("curp")}
              error={intento || f.curp.length >= CURP_LONGITUD ? errores.curp : ""}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={CURP_LONGITUD}
              returnKeyType="next"
              onSubmitEditing={() => diaRef.current?.focus()}
            />
            <T style={rs.ayuda}>{f.curp.length}/{CURP_LONGITUD} · Es única: no puede estar registrada por otra persona.</T>

            <T style={rs.caption}>Fecha de nacimiento</T>
            <View style={rs.fechaRow}>
              <View style={{ flex: 1 }}>
                <Field
                  c={c}
                  label="Día"
                  fieldHeight={fieldH}
                  gap={4}
                  inputRef={diaRef}
                  placeholder="DD"
                  value={f.dia}
                  onChangeText={(v: string) => {
                    set("dia")(v);
                    if (v.replace(/\D/g, "").length === 2) mesRef.current?.focus();
                  }}
                  invalid={verFecha && !!errores.fecha}
                  keyboardType="number-pad"
                  maxLength={2}
                  autoComplete="birthdate-day"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  c={c}
                  label="Mes"
                  fieldHeight={fieldH}
                  gap={4}
                  inputRef={mesRef}
                  placeholder="MM"
                  value={f.mes}
                  onChangeText={(v: string) => {
                    set("mes")(v);
                    if (v.replace(/\D/g, "").length === 2) anioRef.current?.focus();
                  }}
                  invalid={verFecha && !!errores.fecha}
                  keyboardType="number-pad"
                  maxLength={2}
                  autoComplete="birthdate-day"
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Field
                  c={c}
                  label="Año"
                  fieldHeight={fieldH}
                  gap={4}
                  inputRef={anioRef}
                  placeholder="AAAA"
                  value={f.anio}
                  onChangeText={set("anio")}
                  invalid={verFecha && !!errores.fecha}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoComplete="birthdate-day"
                />
              </View>
            </View>
            {verFecha && errores.fecha ? <T style={rs.error}>{errores.fecha}</T> : null}

            <T style={[rs.caption, { marginTop: 12 }]}>Sexo / género</T>
            <View style={rs.chips} accessibilityRole="radiogroup">
              {GENEROS.map((g) => {
                const on = f.genero === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => set("genero")(g)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }: { pressed: boolean }) => [rs.chip, on && rs.chipOn, POINTER, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name={GENERO_ICONOS[g]} size={18} color={on ? c.onBtn : c.primary} />
                    <T style={[rs.chipText, on && rs.chipTextOn]} numberOfLines={1}>
                      {g}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            {intento && errores.genero ? <T style={rs.error}>{errores.genero}</T> : null}

            <View style={{ height: 14 }} />
            <Field
              c={c}
              label="Teléfono (opcional)"
              icon="call-outline"
              fieldHeight={fieldH}
              gap={gap}
              placeholder="722 123 4567"
              value={f.telefono}
              onChangeText={set("telefono")}
              error={intento ? errores.telefono : ""}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <Field
              c={c}
              label="Correo electrónico"
              icon="mail-outline"
              fieldHeight={fieldH}
              gap={gap}
              inputRef={correoRef}
              placeholder="correo@ejemplo.com"
              value={f.correo}
              onChangeText={set("correo")}
              error={intento ? errores.correo : ""}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />
            <Field
              c={c}
              label="Contraseña"
              icon="lock-closed-outline"
              fieldHeight={fieldH}
              gap={f.password ? 8 : gap}
              inputRef={passRef}
              placeholder="Mínimo 8 caracteres"
              value={f.password}
              onChangeText={set("password")}
              error={intento ? errores.password : ""}
              secureTextEntry={!verPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              returnKeyType="next"
              onSubmitEditing={() => confRef.current?.focus()}
              right={
                <Pressable
                  onPress={() => setVerPassword((v) => !v)}
                  hitSlop={10}
                  style={[styles.showButton, POINTER]}
                  accessibilityRole="button"
                  accessibilityLabel={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Ionicons name={verPassword ? "eye-off-outline" : "eye-outline"} size={20} color={c.muted} />
                </Pressable>
              }
            />
            {f.password ? (
              <View style={{ marginBottom: gap }}>
                <View style={rs.barras}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[rs.barra, i < fort.puntos && { backgroundColor: colorFort }]} />
                  ))}
                </View>
                <View style={rs.reglas}>
                  <T style={{ fontSize: 12, fontWeight: "800", color: colorFort }}>{fort.nivel}</T>
                  {fort.reglas.map((r) => (
                    <View key={r.texto} style={rs.regla}>
                      <Ionicons name={r.ok ? "checkmark-circle" : "ellipse-outline"} size={13} color={r.ok ? c.success : c.muted} />
                      <T style={{ fontSize: 12, color: r.ok ? c.success : c.muted }}>{r.texto}</T>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <Field
              c={c}
              label="Confirmar contraseña"
              icon="lock-closed-outline"
              fieldHeight={fieldH}
              gap={gap}
              inputRef={confRef}
              placeholder="Repite la contraseña"
              value={f.confirmar}
              onChangeText={set("confirmar")}
              error={intento ? errores.confirmar : ""}
              secureTextEntry={!verPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={reg.enviar}
            />
          </>
        ) : null}
      </Reveal>

      {errorGeneral ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={20} color={c.error} style={{ marginRight: 9 }} />
          <T style={styles.errorText}>{errorGeneral}</T>
        </View>
      ) : null}

      <View style={rs.botones}>
        {paso > 0 ? (
          <View style={{ flex: 1 }}>
            <PressScale onPress={reg.atras} disabled={guardando} style={styles.secondaryButton}>
              <Ionicons name="chevron-back" size={16} color={c.primary} style={{ marginRight: 6 }} />
              <T style={styles.secondaryText}>Atrás</T>
            </PressScale>
          </View>
        ) : null}
        <View style={{ flex: paso > 0 ? 2 : 1 }}>
          <PressScale
            onPress={esUltimo ? reg.enviar : reg.siguiente}
            disabled={guardando}
            style={[styles.loginButtonWrapper, { marginBottom: 0 }, guardando && styles.loginButtonDisabled]}
          >
            <LinearGradient colors={[c.btnFrom, c.btnTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginButton}>
              {guardando ? (
                <>
                  <ActivityIndicator size="small" color={c.onBtn} />
                  <T style={[styles.loginText, { marginLeft: 10 }]}>Creando cuenta...</T>
                </>
              ) : (
                <T style={styles.loginText}>{esUltimo ? "Crear cuenta" : "Continuar"}</T>
              )}
            </LinearGradient>
          </PressScale>
        </View>
      </View>

      <T style={rs.pasoTexto}>
        Paso {paso + 1} de {PASOS.length}
      </T>

      {esUltimo ? (
        <View style={[styles.privacyConsentRow, { marginTop: 10 }]}>
          <View style={styles.privacyInlineWrap}>
            <T style={styles.privacyConsentText}>Al crear tu cuenta aceptas nuestras </T>
            <TouchableOpacity
              onPress={() => onLegal("/condiciones-servicio")}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="link"
              style={styles.privacyTouchWrap}
            >
              <T style={styles.privacyLinkText}>Condiciones del Servicio</T>
            </TouchableOpacity>
            <T style={styles.privacyConsentText}> y nuestra </T>
            <TouchableOpacity
              onPress={() => onLegal("/politica-privacidad")}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="link"
              style={styles.privacyTouchWrap}
            >
              <T style={styles.privacyLinkText}>Política de Privacidad</T>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Enter en el último campo de un paso avanza al siguiente.
const siguienteSeguro = (reg: ReturnType<typeof useRegistroPaciente>) => () => reg.siguiente();

const createRegStyles = (c: Theme, L: Layout) =>
  StyleSheet.create({
    stepper: { flexDirection: "row", alignItems: "flex-start", marginBottom: L.compact ? 16 : 22 },
    stepWrap: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
    stepLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.border, marginTop: 15 },
    stepLineSpacer: { flex: 0 },
    stepLineOn: { backgroundColor: c.primary },
    stepItem: { alignItems: "center", width: 64 },
    stepDot: {
      width: 33,
      height: 33,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    stepDotOn: { backgroundColor: c.primary, borderColor: c.primary },
    stepDotActive: {
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 10,
      elevation: 4,
    },
    stepLabel: { marginTop: 5, fontSize: 11, fontWeight: "600", color: c.muted },
    stepLabelOn: { color: c.primary, fontWeight: "800" },

    caption: { fontSize: 13, fontWeight: "700", color: c.text, marginBottom: 7 },
    ayuda: { fontSize: 12, color: c.muted, marginBottom: 14, lineHeight: 17 },
    error: { fontSize: 12, fontWeight: "600", color: c.error, marginTop: 2, marginBottom: 4 },
    fechaRow: { flexDirection: "row", gap: 10 },

    chips: { flexDirection: "row", gap: 8 },
    chip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    chipOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 3,
    },
    chipText: { fontSize: 13.5, fontWeight: "700", color: c.text },
    chipTextOn: { color: c.onBtn },

    barras: { flexDirection: "row", gap: 6, marginBottom: 8 },
    barra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },
    reglas: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
    regla: { flexDirection: "row", alignItems: "center", gap: 5 },

    botones: { flexDirection: "row", gap: 10, alignItems: "stretch", marginTop: 6 },
    pasoTexto: { textAlign: "center", fontSize: 12, color: c.muted, marginTop: 12 },

    exito: { alignItems: "center", paddingVertical: 8 },
    exitoIcono: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: c.success,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  });

export default function LoginScreen() {
  const router = useRouter();
  const { login, cargando, usuario } = useAuth();
  const L = useLayout();
  const scheme = useColorScheme();
  const c: Theme = scheme === "dark" ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(c, L), [c, L]);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");
  const [recordarSesion, setRecordarSesion] = useState(true);

  // Pestaña activa: inicio de sesión o registro de pacientes (misma pantalla, sin cambiar de ruta)
  const [modo, setModo] = useState<"login" | "registro">("login");
  const reg = useRegistroPaciente();

  const passwordRef = useRef<TextInput>(null);

  // Animaciones: error (aparece + vibra) y casilla de recordar
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errorLogin) {
      errorAnim.setValue(0);
      Animated.timing(errorAnim, { toValue: 1, duration: 240, useNativeDriver: ND }).start();
    }
  }, [errorLogin]);

  const alternarRecordar = () => {
    setRecordarSesion((v: boolean) => !v);
  };

  /* ============================================================
     LÓGICA ORIGINAL (sin cambios de comportamiento)
  ============================================================ */

  useEffect(() => {
    if (!cargando && usuario) {
      const rolId = usuario.rol_id ?? usuario.rol_id_FK;
      irSegunRol(router, rolId);
    }
  }, [cargando, usuario]);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const savedEmail = storage.getItem("vitalia_remember_email");
      const savedRemember = storage.getItem("vitalia_remember_me");
      if (savedEmail) setCorreo(savedEmail);
      if (savedRemember !== null) setRecordarSesion(savedRemember === "true");
    } catch (e) {
      console.warn("No se pudo leer el almacenamiento local:", e);
    }
  }, []);

  const iniciarSesion = async () => {
    const correoLimpio = correo.trim();
    const passwordLimpia = password;
    setErrorLogin("");

    if (!correoLimpio || !passwordLimpia) {
      setErrorLogin("Ingresa tu correo y contraseña.");
      avisar("Campos incompletos", "Ingresa tu correo y contraseña.");
      return;
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoValido.test(correoLimpio)) {
      setErrorLogin("Ingresa un correo electrónico válido.");
      avisar("Correo no válido", "Ingresa un correo electrónico válido.");
      return;
    }

    try {
      const usuarioLogueado = await login(correoLimpio, passwordLimpia);

      const storage = getStorage();
      if (storage) {
        try {
          if (recordarSesion) {
            storage.setItem("vitalia_remember_me", "true");
            storage.setItem("vitalia_remember_email", correoLimpio);
          } else {
            storage.removeItem("vitalia_remember_me");
            storage.removeItem("vitalia_remember_email");
          }
        } catch {}
      }

      setErrorLogin("");

      const rolId = usuarioLogueado.rol_id ?? usuarioLogueado.rol_id_FK;
      if (!irSegunRol(router, rolId)) {
        setErrorLogin("El usuario no tiene un rol válido.");
        avisar("Acceso no disponible", "El usuario no tiene un rol válido.");
      }
    } catch (error: any) {
      console.log("ERROR MOSTRADO EN LOGIN:", error?.message);
      if (error?.message === "Correo o contraseña incorrectos") {
        setErrorLogin("Correo o contraseña incorrectos.");
        avisar("Inicio de sesión", "Correo o contraseña incorrectos.");
        return;
      }
      setErrorLogin(error?.message || "No se pudo conectar con el servidor.");
      avisar("Error", error?.message || "No se pudo conectar con el servidor.");
    }
  };

  const irARegistro = () => {
    setErrorLogin("");
    setModo("registro");
  };

  const volverALogin = (correoNuevo?: string) => {
    if (correoNuevo) setCorreo(correoNuevo);
    setPassword("");
    reg.reset();
    setModo("login");
  };

  if (usuario) {
    return (
      <View style={[styles.container, styles.centerLoading]}>
        <ActivityIndicator size="large" color={c.primary} />
        <T style={styles.redirectLoadingText}>Accediendo a tu cuenta...</T>
      </View>
    );
  }

  /* ============================================================
     SUBCOMPONENTES DE UI
  ============================================================ */

  const BrandPanel = (
    <LinearGradient
      colors={[c.brandFrom, c.brandTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.brandPanel}
    >
      {/* Fondo de marca: latido y cuadrícula clínica */}
      <PulseBackdrop c={c} bottom />

      <Reveal delay={0} style={styles.brandHeader}>
        <View style={styles.logoHalo}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        <T style={styles.brandName}>VITALIA</T>
      </Reveal>

      <View style={styles.brandContent}>
        <Reveal delay={120}>
          <T style={styles.brandHeadline}>Tecnología que simplifica la salud</T>
          {L.showDescription ? (
            <T style={styles.brandDescription}>
              Gestiona clínicas, pacientes y expedientes en una sola plataforma segura.
            </T>
          ) : null}
        </Reveal>

        {L.showFeatures ? (
          <View style={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={260 + i * 90} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={L.compact ? 18 : 20} color={c.brandIconFg} />
                </View>
                <T style={styles.featureTitle}>{f.title}</T>
              </Reveal>
            ))}
          </View>
        ) : null}
      </View>

      {L.showFooter ? (
        <Reveal delay={700} style={styles.brandFooterRow}>
          <TouchableOpacity
            onPress={() => router.push("/politica-privacidad" as any)}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel="Ver Política de Privacidad"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.brandFooterTouch}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color={c.onBrandMuted} />
            <T style={[styles.brandFooter, { textDecorationLine: "underline" }]}>
              Privacidad
            </T>
          </TouchableOpacity>
          <T style={[styles.brandFooter, { opacity: 0.5, marginHorizontal: 4 }]}>·</T>
          <TouchableOpacity
            onPress={() => router.push("/condiciones-servicio" as any)}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel="Ver Condiciones del Servicio"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.brandFooterTouch}
          >
            <Ionicons name="document-text-outline" size={15} color={c.onBrandMuted} />
            <T style={[styles.brandFooter, { textDecorationLine: "underline" }]}>
              Condiciones del Servicio
            </T>
          </TouchableOpacity>
          <T style={[styles.brandFooter, { opacity: 0.5, marginHorizontal: 4 }]}>·</T>
          <TouchableOpacity
            onPress={() => router.push("/eliminacion-cuenta" as any)}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel="Ver Eliminación de Cuenta"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.brandFooterTouch}
          >
            <Ionicons name="trash-outline" size={15} color={c.onBrandMuted} />
            <T style={[styles.brandFooter, { textDecorationLine: "underline" }]}>
              Eliminación de Cuenta
            </T>
          </TouchableOpacity>
        </Reveal>
      ) : null}
    </LinearGradient>
  );

  const Form = (
    <View style={styles.formContainer}>
      <Reveal delay={80}>
        <AuthTabs styles={styles} active={modo} onLogin={() => setModo("login")} onRegister={irARegistro} />
      </Reveal>

      {modo === "registro" ? (
        <RegistroForm
          c={c}
          L={L}
          styles={styles}
          reg={reg}
          onIrALogin={volverALogin}
          onLegal={(ruta) => router.push(ruta as any)}
        />
      ) : (
      <>
      <Reveal delay={160}>
        <T style={styles.formTitle}>Bienvenido de nuevo</T>
        {L.showSubtitle ? <T style={styles.formSubtitle}>Accede con tu cuenta para continuar.</T> : null}
      </Reveal>

      <Reveal delay={240}>
        <Field
          c={c}
          label="Correo electrónico"
          icon="mail-outline"
          fieldHeight={L.fieldH}
          gap={L.fieldGap}
          testID="login-email"
          placeholder="correo@ejemplo.com"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!cargando}
        />
      </Reveal>

      <Reveal delay={310}>
        <Field
          c={c}
          label="Contraseña"
          icon="lock-closed-outline"
          fieldHeight={L.fieldH}
          gap={L.fieldGap}
          inputRef={passwordRef}
          testID="login-password"
          placeholder="Ingresa tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={iniciarSesion}
          editable={!cargando}
          right={
            <Pressable
              onPress={() => setPasswordVisible(!passwordVisible)}
              disabled={cargando}
              hitSlop={10}
              style={[styles.showButton, POINTER]}
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Ionicons
                name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={c.muted}
              />
            </Pressable>
          }
        />
      </Reveal>

      <Reveal delay={370} style={styles.rememberRow}>
        <Pressable
          testID="login-remember-me"
          style={[styles.rememberPressable, POINTER]}
          onPress={alternarRecordar}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: recordarSesion }}
        >
          <Animated.View
            style={[
              styles.checkbox,
              recordarSesion && styles.checkboxActive,
            ]}
          >
            {recordarSesion && <Ionicons name="checkmark" size={14} color={c.onBtn} />}
          </Animated.View>
          <T style={styles.rememberText}>Recordarme</T>
        </Pressable>

        <Pressable
          onPress={() => router.push("/recuperar" as any)}
          disabled={cargando}
          accessibilityRole="link"
          hitSlop={8}
          style={({ pressed }: { pressed: boolean }) => [POINTER, pressed && { opacity: 0.6 }]}
        >
          <T style={styles.forgotText}>¿Olvidaste tu contraseña?</T>
        </Pressable>
      </Reveal>

      {errorLogin ? (
        <Animated.View
          style={[
            styles.errorBox,
            {
              opacity: errorAnim,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="alert-circle" size={20} color={c.error} style={{ marginRight: 9 }} />
          <T style={styles.errorText}>{errorLogin}</T>
        </Animated.View>
      ) : null}

      <Reveal delay={430}>
        <PressScale
          testID="login-submit"
          onPress={iniciarSesion}
          disabled={cargando}
          style={[styles.loginButtonWrapper, cargando && styles.loginButtonDisabled]}
        >
          <LinearGradient
            colors={[c.btnFrom, c.btnTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loginButton}
          >
            {cargando ? (
              <>
                <ActivityIndicator size="small" color={c.onBtn} />
                <T style={[styles.loginText, { marginLeft: 10 }]}>Iniciando sesión...</T>
              </>
            ) : (
              <>
                <T style={styles.loginText}>Iniciar sesión</T>
              </>
            )}
          </LinearGradient>
        </PressScale>
      </Reveal>

      <Reveal delay={490}>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <T style={styles.dividerText}>o</T>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.secondaryRow}>
          <PressScale disabled={cargando} style={styles.secondaryButton}>
            <Ionicons name="logo-google" size={18} color={c.primary} style={{ marginRight: 10 }} />
            <T style={styles.secondaryText}>Acceder con Google</T>
          </PressScale>
        </View>
      </Reveal>

      <Reveal delay={560} style={styles.secureNote}>
        <Ionicons name="lock-closed" size={13} color={c.muted} />
        <T style={styles.secureNoteText}>Conexión cifrada de extremo a extremo</T>
      </Reveal>

      <Reveal delay={620} style={styles.privacyConsentRow}>
        <View style={styles.privacyInlineWrap}>
          <T style={styles.privacyConsentText}>Al ingresar, aceptas nuestras </T>
          <TouchableOpacity
            onPress={() => router.push("/condiciones-servicio" as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            accessibilityRole="link"
            accessibilityLabel="Leer Condiciones del Servicio"
            style={styles.privacyTouchWrap}
          >
            <T style={styles.privacyLinkText}>Condiciones del Servicio</T>
          </TouchableOpacity>
          <T style={styles.privacyConsentText}> y nuestra </T>
          <TouchableOpacity
            onPress={() => router.push("/politica-privacidad" as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            accessibilityRole="link"
            accessibilityLabel="Leer Política de Privacidad"
            style={styles.privacyTouchWrap}
          >
            <T style={styles.privacyLinkText}>Política de Privacidad</T>
          </TouchableOpacity>
        </View>
      </Reveal>
      </>
      )}
    </View>
  );

  /* ============================================================
     RENDER PRINCIPAL
  ============================================================ */

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { minHeight: L.height }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          {L.twoColumn ? (
            /* ===== ESCRITORIO / TABLET HORIZONTAL / MÓVIL HORIZONTAL: 2 columnas ===== */
            <View style={[styles.twoColumnRow, { minHeight: L.height }]}>
              <View style={styles.columnLeft}>{BrandPanel}</View>
              <LinearGradient
                colors={[c.bg, c.bg, c.bgSoft]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.columnRight}
              >
                <View
                  style={[
                    styles.formCardFloating,
                    L.overlap !== 0 && { transform: [{ translateX: L.overlap }] },
                  ]}
                >
                  {Form}
                </View>
              </LinearGradient>
            </View>
          ) : (
            /* ===== MÓVIL Y TABLET VERTICAL: cabecera de marca + tarjeta con selector visible ===== */
            <View style={styles.stackedWrap}>
              <LinearGradient
                colors={[c.brandFrom, c.brandTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stackedHeader}
              >
                <View style={[styles.brandHeader, { justifyContent: "center" }]}>
                  <View style={styles.logoHaloSmall}>
                    <Image
                      source={require("../assets/images/logo.png")}
                      style={styles.mobileLogo}
                      resizeMode="contain"
                    />
                  </View>
                  <T style={styles.mobileBrandName}>VITALIA</T>
                </View>
                {L.tabletPortrait ? (
                  <T style={styles.stackedTagline}>Tecnología que simplifica la salud</T>
                ) : null}
              </LinearGradient>

              <View style={styles.stackedCardWrap}>
                <View style={styles.stackedFormCard}>{Form}</View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ============================================================
   ESTILOS (dependen del tema claro / oscuro y del layout)
============================================================ */

const createStyles = (c: Theme, L: Layout) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    keyboard: { flex: 1 },
    scroll: { flexGrow: 1 },
    centerLoading: { justifyContent: "center", alignItems: "center" },
    redirectLoadingText: {
      marginTop: 14,
      fontSize: 14,
      color: c.primary,
      fontWeight: "700",
    },

    /* ---------- 2 columnas ---------- */
    twoColumnRow: { flex: 1, flexDirection: "row", width: "100%" },
    columnLeft: { flex: L.brandFlex, minWidth: 0 },
    columnRight: {
      flex: L.formFlex,
      minWidth: 0,
      position: "relative",
      zIndex: 2,
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: L.formPadH,
      paddingRight: L.formPadH + L.insetR,
      paddingTop: L.formPadV + L.insetT,
      paddingBottom: L.formPadV + L.insetB,
    },
    formCardFloating: {
      width: "100%",
      maxWidth: L.cardMaxW,
      backgroundColor: c.card,
      borderRadius: L.compact ? 20 : 24,
      padding: L.cardPad,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: c.mode === "dark" ? 0.2 : 0.28,
      shadowRadius: 36,
      elevation: 14,
    },

    /* ---------- Panel de marca ---------- */
    brandPanel: {
      flex: 1,
      overflow: "hidden",
      borderRadius: 0,
      paddingLeft: L.brandPadH + L.insetL,
      paddingRight: L.brandPadH,
      paddingTop: L.brandPadV + L.insetT,
      paddingBottom: L.brandPadV + L.insetB,
      justifyContent: "space-between",
    },
    brandHeader: { flexDirection: "row", alignItems: "center" },
    logoHalo: {
      width: L.compact ? 48 : 56,
      height: L.compact ? 48 : 56,
      borderRadius: 16,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brandLogoTile,
      borderWidth: 1,
      borderColor: c.brandGlassBorder,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 16,
    },
    logoHaloSmall: {
      width: L.xs ? 38 : 44,
      height: L.xs ? 38 : 44,
      borderRadius: 13,
      marginRight: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brandLogoTile,
      borderWidth: 1,
      borderColor: c.brandGlassBorder,
    },
    brandLogo: { width: L.compact ? 32 : 38, height: L.compact ? 32 : 38 },
    brandName: { color: c.onBrand, fontSize: L.compact ? 18 : 20, fontWeight: "900", letterSpacing: 3 },
    brandContent: { flex: 1, justifyContent: "center", marginVertical: L.compact ? 12 : 24 },
    brandHeadline: {
      color: c.onBrand,
      fontSize: L.headline,
      fontWeight: "800",
      lineHeight: L.headlineLH,
      marginBottom: L.showDescription ? 14 : 0,
      maxWidth: L.brandMaxW,
    },
    brandDescription: {
      color: c.onBrandMuted,
      fontSize: L.compact ? 14 : 15,
      lineHeight: L.compact ? 21 : 23,
      marginBottom: L.showFeatures ? (L.compact ? 20 : 28) : 0,
      maxWidth: L.brandMaxW - 40,
    },
    featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, maxWidth: L.brandMaxW },
    featureCard: {
      flexBasis: L.featureBasis,
      flexGrow: 1,
      backgroundColor: c.brandGlass,
      borderWidth: 1,
      borderColor: c.brandGlassBorder,
      borderRadius: 16,
      paddingVertical: L.compact ? 12 : 16,
      paddingHorizontal: 14,
    },
    featureIconWrap: {
      width: L.compact ? 34 : 38,
      height: L.compact ? 34 : 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.brandIconBg,
      marginBottom: L.compact ? 8 : 10,
    },
    featureTitle: { color: c.onBrand, fontSize: 13, fontWeight: "700" },
    brandFooterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    brandFooterTouch: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    brandFooter: { color: c.onBrandMuted, fontSize: 12, flexShrink: 1 },

    /* ---------- Tabs ---------- */
    tabsRow: {
      flexDirection: "row",
      // Fondo con opacidad (en claro: teal translúcido en lugar del verde menta)
      backgroundColor: c.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,118,110,0.08)",
      borderRadius: 14,
      padding: 4,
      marginBottom: L.tabsGap,
    },
    tabActive: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.mode === "dark" ? c.card : "#FFFFFF",
      borderRadius: 10,
      minHeight: L.compact || L.xs ? 42 : 46,
      paddingHorizontal: 8,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 2,
    },
    tabActiveText: { color: c.primary, fontSize: L.xs ? 13 : 14, fontWeight: "800" },
    tabInactive: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minHeight: L.compact || L.xs ? 42 : 46,
      paddingHorizontal: 8,
    },
    tabInactiveText: { color: c.muted, fontSize: L.xs ? 13 : 14, fontWeight: "700" },

    /* ---------- Formulario ---------- */
    formContainer: { width: "100%" },
    formTitle: { fontSize: L.titleSize, fontWeight: "800", color: c.text, marginBottom: 4 },
    formSubtitle: { fontSize: 14, color: c.muted, marginBottom: L.compact ? 16 : 22, lineHeight: 20 },
    showButton: { paddingHorizontal: 4, paddingVertical: 8 },

    rememberRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: L.compact ? 14 : 18,
      marginTop: L.showSubtitle ? 0 : 12,
      flexWrap: "wrap",
      gap: 8,
    },
    rememberPressable: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    checkboxActive: { backgroundColor: c.primary, borderColor: c.primary },
    rememberText: { fontSize: 13, fontWeight: "600", color: c.text },
    forgotText: { fontSize: 13, fontWeight: "700", color: c.primary },

    /* ---------- Error ---------- */
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 16,
    },
    errorText: { flex: 1, color: c.error, fontSize: 13, fontWeight: "700" },

    /* ---------- Botón principal ---------- */
    loginButtonWrapper: {
      borderRadius: 14,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.42,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: L.compact ? 14 : 20,
    },
    loginButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      height: L.compact ? 50 : 54,
    },
    loginButtonDisabled: { opacity: 0.65 },
    loginText: { color: c.onBtn, fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },

    /* ---------- Separador y secundarios ---------- */
    dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: L.compact ? 12 : 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { marginHorizontal: 12, fontSize: 12, color: c.muted, fontWeight: "600" },
    secondaryRow: { width: "100%" },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: L.compact ? 46 : 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 14,
    },
    secondaryText: { fontSize: 14, fontWeight: "700", color: c.text },
    secureNote: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: L.compact ? 16 : 22,
    },
    secureNoteText: { fontSize: 12, color: c.muted },
    privacyConsentRow: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      paddingHorizontal: 8,
    },
    privacyInlineWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    privacyTouchWrap: {
      paddingVertical: 2,
      paddingHorizontal: 2,
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    privacyConsentText: {
      fontSize: 12,
      color: c.muted,
      textAlign: "center",
      lineHeight: 18,
    },
    privacyLinkText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.primary,
      textDecorationLine: "underline",
    },

    /* ---------- Móvil y tablet vertical (apilado) ---------- */
    stackedWrap: { flex: 1, width: "100%" },
    stackedHeader: {
      overflow: "hidden",
      alignItems: "center",
      paddingHorizontal: 20 + Math.max(L.insetL, L.insetR),
      paddingTop: Math.max(L.insetT, 12) + (L.short ? 6 : 14),
      paddingBottom: 52 + L.headerExtra + (L.tabletPortrait ? 8 : 0),
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    stackedTagline: {
      color: c.onBrand,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 18,
      maxWidth: 480,
    },
    stackedCardWrap: {
      width: "100%",
      alignItems: "center",
      paddingHorizontal: L.cardGutter,
      marginTop: -36,
      marginBottom: 32 + L.insetB,
    },
    stackedFormCard: {
      width: "100%",
      maxWidth: L.cardMaxW,
      backgroundColor: c.card,
      borderRadius: 22,
      padding: L.cardPad,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: c.mode === "dark" ? 0.18 : 0.22,
      shadowRadius: 28,
      elevation: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    mobileLogo: { width: L.xs ? 26 : 30, height: L.xs ? 26 : 30 },
    mobileBrandName: { color: c.onBrand, fontSize: L.xs ? 15 : 17, fontWeight: "900", letterSpacing: 2.5 },
  });
