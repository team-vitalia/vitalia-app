import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fortalezaPassword } from "../components/admin/validaciones";
import {
  confirmarEnlaceCorreo,
  confirmarQR,
  solicitarCodigoCorreo,
  verificarCodigoCorreo,
  type TipoRecuperacion,
} from "../services/recuperacionService";

type Fase = "correo" | "codigo" | "password" | "listo";

const ND = Platform.OS !== "web";
const POINTER: any = Platform.OS === "web" ? { cursor: "pointer" } : null;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIGHT = {
  dark: false,
  primary: "#0F766E",
  btn: "#0F766E",
  btnPressed: "#115E59",
  card: "#FFFFFF",
  text: "#1E203B",
  muted: "#64748B",
  border: "#E2E8F0",
  inputBg: "#F8FAFC",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  success: "#16A34A",
  info: "#0284C7",
  infoBg: "#F0F9FF",
  warning: "#F59E0B",
  bgFrom: "#0F766E",
  bgTo: "#134E4A",
};
const DARK = {
  ...LIGHT,
  dark: true,
  primary: "#2DD4BF",
  btn: "#0F766E",
  btnPressed: "#115E59",
  card: "#1E293B",
  text: "#F1F5F9",
  muted: "#94A3B8",
  border: "#334155",
  inputBg: "#0F172A",
  error: "#F87171",
  errorBg: "#3F1D1D",
  success: "#4ADE80",
  info: "#38BDF8",
  infoBg: "rgba(56,189,248,0.12)",
  warning: "#FBBF24",
  bgFrom: "#134E4A",
  bgTo: "#0F172A",
};
type Paleta = typeof LIGHT;

/* Medidas que se adaptan al tamaño de pantalla */
type Medidas = {
  compacto: boolean;
  padCard: number;
  padLateral: number;
  titulo: number;
  campoAlto: number;
  botonAlto: number;
  codigoFuente: number;
  codigoEspaciado: number;
};

const PASOS: { id: Exclude<Fase, "listo">; titulo: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "correo", titulo: "Correo", icon: "mail-outline" },
  { id: "codigo", titulo: "Código", icon: "keypad-outline" },
  { id: "password", titulo: "Contraseña", icon: "lock-closed-outline" },
];

const DOT = 32;
const ICONO_CAJA = 22;

/* Icono dentro de una caja de tamaño fijo para que siempre quede centrado y alineado */
function Icono({
  name,
  size = 20,
  color,
  caja = ICONO_CAJA,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color: string;
  caja?: number;
}) {
  return (
    <View style={{ width: caja, height: caja, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

export default function RecuperarRuta() {
  const params = useLocalSearchParams<{
    usuario_id?: string | string[];
    token?: string | string[];
    tipo?: string | string[];
  }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const c = scheme === "dark" ? DARK : LIGHT;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const m: Medidas = useMemo(() => {
    const compacto = width < 360 || height < 640;
    const ancho = width >= 768;
    return {
      compacto,
      padCard: compacto ? 18 : ancho ? 32 : 24,
      padLateral: compacto ? 12 : 16,
      titulo: compacto ? 20 : ancho ? 26 : 23,
      campoAlto: compacto ? 48 : 52,
      botonAlto: compacto ? 50 : 54,
      codigoFuente: width < 360 ? 24 : 30,
      codigoEspaciado: width < 360 ? 8 : 12,
    };
  }, [width, height]);

  const s = useMemo(() => crearEstilos(c, m), [c, m]);

  /* Acceso por enlace del correo o por QR (flujo anterior, se conserva) */
  const usuarioIdTexto = Array.isArray(params.usuario_id) ? params.usuario_id[0] : params.usuario_id;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const tipoParam = Array.isArray(params.tipo) ? params.tipo[0] : params.tipo;
  const usuarioIdParam = Number(usuarioIdTexto);
  const tipoParamValido: TipoRecuperacion = tipoParam === "correo" ? "correo" : "qr";
  const enlaceValido =
    Number.isInteger(usuarioIdParam) && usuarioIdParam > 0 && !!tokenParam && tokenParam.length >= 20;

  const [fase, setFase] = useState<Fase>(enlaceValido ? "password" : "correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ticket, setTicket] = useState<{ usuarioId: number; token: string; tipo: TipoRecuperacion } | null>(
    enlaceValido ? { usuarioId: usuarioIdParam, token: tokenParam!, tipo: tipoParamValido } : null
  );
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [espera, setEspera] = useState(0);
  const [mensajeFinal, setMensajeFinal] = useState("");
  const [enfocado, setEnfocado] = useState<string | null>(null);
  const procesando = useRef(false);
  const codigoRef = useRef<TextInput>(null);
  const confRef = useRef<TextInput>(null);

  /* Si llega un enlace nuevo con la pantalla ya abierta, se usa ese. */
  useEffect(() => {
    if (enlaceValido) {
      setTicket({ usuarioId: usuarioIdParam, token: tokenParam!, tipo: tipoParamValido });
      setFase("password");
      setError("");
    }
  }, [usuarioIdTexto, tokenParam, tipoParam]);

  /* Cuenta regresiva para reenviar el código */
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  /* Transición suave entre pasos */
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [fase]);

  const alEscribir = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setError("");
  };

  async function enviarCodigo(esReenvio = false) {
    if (procesando.current) return;
    setError("");
    setInfo("");
    if (!CORREO_RE.test(correo.trim())) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    procesando.current = true;
    setCargando(true);
    try {
      const r = await solicitarCodigoCorreo(correo);
      setEspera(r.espera_segundos ?? 60);
      setInfo(
        esReenvio
          ? "Si la cuenta existe, te enviamos un nuevo código."
          : "Si la cuenta existe, te enviamos un código de 6 dígitos. Revisa también tu carpeta de spam."
      );
      setCodigo("");
      setFase("codigo");
      setTimeout(() => codigoRef.current?.focus(), 350);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el código.");
    } finally {
      procesando.current = false;
      setCargando(false);
    }
  }

  async function validarCodigo() {
    if (procesando.current) return;
    setError("");
    setInfo("");
    if (!/^\d{6}$/.test(codigo)) {
      setError("Escribe los 6 dígitos del código.");
      return;
    }
    procesando.current = true;
    setCargando(true);
    try {
      const r = await verificarCodigoCorreo(correo, codigo);
      setTicket({ usuarioId: r.usuario_id, token: r.token, tipo: "correo" });
      setFase("password");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo verificar el código.");
    } finally {
      procesando.current = false;
      setCargando(false);
    }
  }

  const fort = fortalezaPassword(password);
  const colorFort = fort.puntos <= 1 ? c.error : fort.puntos === 2 ? c.warning : fort.puntos === 3 ? c.info : c.success;
  const passwordOk = password.length >= 8 && password.length <= 128;
  const coincide = !!confirmacion && password === confirmacion;

  async function cambiarPassword() {
    if (procesando.current) return;
    setError("");
    if (!ticket) {
      setError("La sesión de recuperación no es válida. Solicita un código nuevo.");
      return;
    }
    if (!passwordOk) {
      setError("La contraseña debe tener entre 8 y 128 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    procesando.current = true;
    setCargando(true);
    try {
      const r =
        ticket.tipo === "correo"
          ? await confirmarEnlaceCorreo(ticket.usuarioId, ticket.token, password)
          : await confirmarQR(ticket.usuarioId, ticket.token, password);
      setMensajeFinal(r.mensaje);
      setPassword("");
      setConfirmacion("");
      setTicket(null);
      setFase("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      procesando.current = false;
      setCargando(false);
    }
  }

  const irALogin = () => router.replace("/login");

  const titulos: Record<Fase, { t: string; sub: string }> = {
    correo: { t: "Recupera tu acceso", sub: "Escribe el correo de tu cuenta y te enviaremos un código de 6 dígitos." },
    codigo: { t: "Revisa tu correo", sub: `Escribe el código que enviamos a ${correo.trim().toLowerCase() || "tu correo"}.` },
    password: { t: "Crea tu nueva contraseña", sub: "Elige una contraseña segura que no uses en otros sitios." },
    listo: { t: "Contraseña actualizada", sub: mensajeFinal || "Ya puedes iniciar sesión con tu nueva contraseña." },
  };

  const indice = fase === "listo" ? PASOS.length : PASOS.findIndex((p) => p.id === fase);
  const mostrarPasos = fase !== "listo" && !enlaceValido;

  const botonPrincipal = (texto: string, onPress: () => void, deshabilitado?: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={cargando || deshabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: cargando || !!deshabilitado, busy: cargando }}
      style={({ pressed }) => [
        s.boton,
        POINTER,
        pressed && { backgroundColor: c.btnPressed },
        (cargando || deshabilitado) && { opacity: 0.5 },
      ]}
    >
      {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.botonTexto}>{texto}</Text>}
    </Pressable>
  );

  const estiloCampo = (id: string, conError = false) => [
    s.campo,
    enfocado === id && { borderColor: c.primary },
    conError && { borderColor: c.error },
  ];

  return (
    <LinearGradient colors={[c.bgFrom, c.bgTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            s.contenido,
            { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 12) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.tarjeta}>
            <Text style={s.marca}>Vitalia</Text>

            {mostrarPasos ? (
              <View style={s.pasos} accessibilityRole="progressbar" accessibilityLabel={`Paso ${indice + 1} de ${PASOS.length}`}>
                {PASOS.map((p, i) => {
                  const hecho = i < indice;
                  const activo = i === indice;
                  const encendido = hecho || activo;
                  return (
                    <View key={p.id} style={s.pasoCol}>
                      {/* Líneas: mitad izquierda y mitad derecha, centradas con el círculo */}
                      {i > 0 ? <View style={[s.lineaIzq, i <= indice && s.lineaOn]} /> : null}
                      {i < PASOS.length - 1 ? <View style={[s.lineaDer, i < indice && s.lineaOn]} /> : null}
                      <View style={[s.pasoDot, encendido && s.pasoDotOn]}>
                        <Ionicons name={hecho ? "checkmark" : p.icon} size={16} color={encendido ? "#FFFFFF" : c.muted} />
                      </View>
                      <Text style={[s.pasoTexto, activo && s.pasoTextoOn]} numberOfLines={1}>
                        {p.titulo}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
              {fase === "listo" ? (
                <View style={s.centro}>
                  <View style={s.exitoIcono}>
                    <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                  </View>
                </View>
              ) : null}

              <Text style={s.titulo}>{titulos[fase].t}</Text>
              <Text style={s.subtitulo}>{titulos[fase].sub}</Text>

              {fase === "correo" ? (
                <>
                  <Text style={s.etiqueta}>Correo electrónico</Text>
                  <View style={estiloCampo("correo")}>
                    <Icono name="mail-outline" color={c.primary} />
                    <TextInput
                      style={s.input}
                      value={correo}
                      onChangeText={alEscribir(setCorreo)}
                      onFocus={() => setEnfocado("correo")}
                      onBlur={() => setEnfocado(null)}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={c.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      editable={!cargando}
                      returnKeyType="send"
                      onSubmitEditing={() => enviarCodigo(false)}
                    />
                  </View>
                  {botonPrincipal("Enviar código", () => enviarCodigo(false))}
                </>
              ) : null}

              {fase === "codigo" ? (
                <>
                  <Text style={s.etiqueta}>Código de 6 dígitos</Text>
                  <TextInput
                    ref={codigoRef}
                    style={[s.codigo, enfocado === "codigo" && { borderColor: c.primary }]}
                    value={codigo}
                    onChangeText={alEscribir((v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)))}
                    onFocus={() => setEnfocado("codigo")}
                    onBlur={() => setEnfocado(null)}
                    placeholder="······"
                    placeholderTextColor={c.border}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    editable={!cargando}
                    returnKeyType="done"
                    onSubmitEditing={validarCodigo}
                    accessibilityLabel="Código de verificación"
                  />
                  {botonPrincipal("Verificar código", validarCodigo, codigo.length !== 6)}
                  <View style={s.filaAcciones}>
                    <Pressable
                      onPress={() => {
                        setFase("correo");
                        setError("");
                        setInfo("");
                      }}
                      hitSlop={8}
                      style={[s.accion, POINTER]}
                    >
                      <Text style={s.enlace}>Cambiar correo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => enviarCodigo(true)}
                      disabled={espera > 0 || cargando}
                      hitSlop={8}
                      style={[s.accion, POINTER]}
                    >
                      <Text style={[s.enlace, (espera > 0 || cargando) && { opacity: 0.5 }]}>
                        {espera > 0 ? `Reenviar código (${espera}s)` : "Reenviar código"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {fase === "password" ? (
                <>
                  <Text style={s.etiqueta}>Nueva contraseña</Text>
                  <View style={estiloCampo("password")}>
                    <Icono name="lock-closed-outline" color={c.primary} />
                    <TextInput
                      style={s.input}
                      value={password}
                      onChangeText={alEscribir(setPassword)}
                      onFocus={() => setEnfocado("password")}
                      onBlur={() => setEnfocado(null)}
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor={c.muted}
                      secureTextEntry={!verPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password-new"
                      textContentType="newPassword"
                      editable={!cargando}
                      returnKeyType="next"
                      onSubmitEditing={() => confRef.current?.focus()}
                    />
                    <Pressable
                      onPress={() => setVerPassword((v) => !v)}
                      hitSlop={6}
                      style={[s.ojo, POINTER]}
                      accessibilityRole="button"
                      accessibilityLabel={verPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    >
                      <Ionicons name={verPassword ? "eye-off-outline" : "eye-outline"} size={20} color={c.muted} />
                    </Pressable>
                  </View>
                  {password ? (
                    <View style={s.fortaleza}>
                      <View style={s.barras}>
                        {[0, 1, 2, 3].map((i) => (
                          <View key={i} style={[s.barra, i < fort.puntos && { backgroundColor: colorFort }]} />
                        ))}
                      </View>
                      <Text style={[s.fortNivel, { color: colorFort }]}>{fort.nivel}</Text>
                    </View>
                  ) : null}

                  <Text style={s.etiqueta}>Confirmar contraseña</Text>
                  <View style={estiloCampo("confirmacion", !!confirmacion && !coincide)}>
                    <Icono name="lock-closed-outline" color={c.primary} />
                    <TextInput
                      ref={confRef}
                      style={s.input}
                      value={confirmacion}
                      onChangeText={alEscribir(setConfirmacion)}
                      onFocus={() => setEnfocado("confirmacion")}
                      onBlur={() => setEnfocado(null)}
                      placeholder="Repite la nueva contraseña"
                      placeholderTextColor={c.muted}
                      secureTextEntry={!verPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      editable={!cargando}
                      returnKeyType="go"
                      onSubmitEditing={cambiarPassword}
                    />
                    {coincide ? (
                      <View style={s.ojo}>
                        <Ionicons name="checkmark-circle" size={20} color={c.success} />
                      </View>
                    ) : null}
                  </View>
                  {!!confirmacion && !coincide ? <Text style={s.errorCampo}>Las contraseñas no coinciden.</Text> : null}

                  {botonPrincipal("Cambiar contraseña", cambiarPassword, !passwordOk || !coincide)}
                </>
              ) : null}

              {fase === "listo" ? botonPrincipal("Iniciar sesión", irALogin) : null}
            </Animated.View>

            {!!error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={c.error} style={s.avisoIcono} />
                <Text style={s.errorTexto}>{error}</Text>
              </View>
            )}
            {!!info && !error && (
              <View style={s.infoBox} accessibilityLiveRegion="polite">
                <Ionicons name="information-circle-outline" size={18} color={c.info} style={s.avisoIcono} />
                <Text style={s.infoTexto}>{info}</Text>
              </View>
            )}

            {fase !== "listo" ? (
              <Pressable style={[s.volver, POINTER]} onPress={irALogin} hitSlop={8} accessibilityRole="link">
                <Ionicons name="chevron-back" size={16} color={c.primary} />
                <Text style={s.enlace}>Volver al inicio de sesión</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const crearEstilos = (c: Paleta, m: Medidas) =>
  StyleSheet.create({
    contenido: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: m.padLateral },
    tarjeta: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.dark ? c.border : "rgba(255,255,255,0.6)",
      padding: m.padCard,
      shadowColor: "#022C22",
      shadowOpacity: c.dark ? 0.35 : 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    marca: { color: c.primary, fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: m.compacto ? 12 : 18 },
    pasos: { flexDirection: "row", marginBottom: m.compacto ? 16 : 22 },
    pasoCol: { flex: 1, alignItems: "center" },
    lineaIzq: {
      position: "absolute",
      top: DOT / 2 - 1.5,
      left: 0,
      right: "50%",
      height: 3,
      backgroundColor: c.border,
    },
    lineaDer: {
      position: "absolute",
      top: DOT / 2 - 1.5,
      left: "50%",
      right: 0,
      height: 3,
      backgroundColor: c.border,
    },
    lineaOn: { backgroundColor: c.primary },
    pasoDot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    pasoDotOn: { backgroundColor: c.primary, borderColor: c.primary },
    pasoTexto: { marginTop: 6, fontSize: 12, fontWeight: "500", color: c.muted, textAlign: "center" },
    pasoTextoOn: { color: c.primary, fontWeight: "700" },

    centro: { alignItems: "center", marginBottom: 14 },
    exitoIcono: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
    },

    titulo: { fontSize: m.titulo, fontWeight: "800", color: c.text, textAlign: "center", lineHeight: m.titulo + 6 },
    subtitulo: {
      color: c.muted,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 8,
      lineHeight: 21,
      fontSize: 14,
      alignSelf: "center",
      maxWidth: 380,
    },
    etiqueta: { color: c.text, fontWeight: "600", fontSize: 13.5, marginBottom: 7, marginTop: 14 },
    campo: {
      flexDirection: "row",
      alignItems: "center",
      height: m.campoAlto,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      paddingLeft: 14,
      paddingRight: 8,
      gap: 10,
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: "100%",
      paddingVertical: 0,
      fontSize: Platform.OS === "web" ? 16 : 15,
      color: c.text,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    ojo: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    codigo: {
      height: m.compacto ? 56 : 62,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      color: c.text,
      textAlign: "center",
      fontSize: m.codigoFuente,
      fontWeight: "700",
      letterSpacing: m.codigoEspaciado,
      /* El letterSpacing agrega espacio al final; se compensa para que el código quede centrado */
      paddingLeft: m.codigoEspaciado,
      paddingVertical: 0,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },

    fortaleza: { marginTop: 10 },
    barras: { flexDirection: "row", gap: 6 },
    barra: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.border },
    fortNivel: { fontSize: 12, fontWeight: "700", marginTop: 6 },

    boton: {
      height: m.botonAlto,
      borderRadius: 12,
      marginTop: 20,
      backgroundColor: c.btn,
      alignItems: "center",
      justifyContent: "center",
    },
    botonTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

    filaAcciones: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      flexWrap: "wrap",
      columnGap: 12,
    },
    accion: { minHeight: 36, justifyContent: "center" },
    enlace: { color: c.primary, fontWeight: "600", fontSize: 13.5 },
    volver: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      minHeight: 36,
      marginTop: 14,
    },

    /* Íconos de aviso: misma altura que la línea de texto para que queden alineados con la primera línea */
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.errorBg,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginTop: 16,
      gap: 8,
    },
    errorTexto: { flex: 1, color: c.error, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    errorCampo: { color: c.error, fontSize: 12, fontWeight: "500", marginTop: 6 },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.infoBg,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginTop: 16,
      gap: 8,
    },
    infoTexto: { flex: 1, color: c.text, fontSize: 13, lineHeight: 18 },
    avisoIcono: { width: 18, height: 18, textAlign: "center" },
  });
