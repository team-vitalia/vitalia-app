/**
 * Recuperar contraseña.
 *
 * Flujo por CÓDIGO (el que abre "¿Olvidaste tu contraseña?" en el login):
 *   1. Correo      -> la API envía un código de 6 dígitos (POST /api/auth/recuperar/codigo/solicitar)
 *   2. Código      -> se verifica (POST .../codigo/verificar) y entrega un ticket de un solo uso
 *   3. Contraseña  -> se guarda la nueva (POST .../correo/confirmar)
 *
 * También sigue funcionando el acceso por enlace del correo o por QR:
 * /recuperar?usuario_id=..&token=..&tipo=correo|qr salta directo al paso 3.
 */
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
  btnFrom: "#0F766E",
  btnTo: "#134E4A",
  card: "#FFFFFF",
  text: "#1E203B",
  muted: "#64748B",
  border: "#E2E8F0",
  inputBg: "#F8FAFC",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  success: "#16A34A",
  info: "#0284C7",
  warning: "#F59E0B",
  glow: "#2DD4BF",
  bgFrom: "#0F766E",
  bgTo: "#134E4A",
};
const DARK = {
  ...LIGHT,
  dark: true,
  primary: "#2DD4BF",
  btnFrom: "#0F766E",
  btnTo: "#115E59",
  card: "#1E293B",
  text: "#F1F5F9",
  muted: "#94A3B8",
  border: "#334155",
  inputBg: "#0F172A",
  error: "#F87171",
  errorBg: "#3F1D1D",
  success: "#4ADE80",
  info: "#38BDF8",
  warning: "#FBBF24",
  bgFrom: "#134E4A",
  bgTo: "#0F172A",
};
type Paleta = typeof LIGHT;

const PASOS: { id: Exclude<Fase, "listo">; titulo: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "correo", titulo: "Correo", icon: "mail-outline" },
  { id: "codigo", titulo: "Código", icon: "keypad-outline" },
  { id: "password", titulo: "Contraseña", icon: "lock-closed-outline" },
];

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
  const s = useMemo(() => crearEstilos(c), [c]);

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
    Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
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
      style={({ pressed }) => [s.botonWrap, POINTER, (cargando || deshabilitado) && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      <LinearGradient colors={[c.btnFrom, c.btnTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.boton}>
        {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.botonTexto}>{texto}</Text>}
      </LinearGradient>
    </Pressable>
  );

  return (
    <LinearGradient colors={[c.bgFrom, c.bgTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[s.contenido, { paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.tarjeta}>
            <Text style={s.marca}>VITALIA</Text>

            {mostrarPasos ? (
              <View style={s.pasos} accessibilityRole="progressbar" accessibilityLabel={`Paso ${indice + 1} de ${PASOS.length}`}>
                {PASOS.map((p, i) => {
                  const hecho = i < indice;
                  const activo = i === indice;
                  return (
                    <View key={p.id} style={s.pasoWrap}>
                      {i > 0 ? <View style={[s.pasoLinea, i <= indice && s.pasoLineaOn]} /> : null}
                      <View style={s.pasoItem}>
                        <View style={[s.pasoDot, (hecho || activo) && s.pasoDotOn]}>
                          <Ionicons name={hecho ? "checkmark" : p.icon} size={15} color={hecho || activo ? "#FFFFFF" : c.muted} />
                        </View>
                        <Text style={[s.pasoTexto, activo && s.pasoTextoOn]} numberOfLines={1}>{p.titulo}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
              {fase === "listo" ? (
                <View style={s.centro}>
                  <View style={s.exitoIcono}>
                    <Ionicons name="checkmark" size={34} color="#FFFFFF" />
                  </View>
                </View>
              ) : null}

              <Text style={s.titulo}>{titulos[fase].t}</Text>
              <Text style={s.subtitulo}>{titulos[fase].sub}</Text>

              {fase === "correo" ? (
                <>
                  <Text style={s.etiqueta}>Correo electrónico</Text>
                  <View style={s.campo}>
                    <Ionicons name="mail-outline" size={19} color={c.primary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={s.input}
                      value={correo}
                      onChangeText={alEscribir(setCorreo)}
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
                    style={s.codigo}
                    value={codigo}
                    onChangeText={alEscribir((v) => setCodigo(v.replace(/\D/g, "").slice(0, 6)))}
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
                    <Pressable onPress={() => { setFase("correo"); setError(""); setInfo(""); }} hitSlop={8} style={POINTER}>
                      <Text style={s.enlace}>Cambiar correo</Text>
                    </Pressable>
                    <Pressable onPress={() => enviarCodigo(true)} disabled={espera > 0 || cargando} hitSlop={8} style={POINTER}>
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
                  <View style={s.campo}>
                    <Ionicons name="lock-closed-outline" size={19} color={c.primary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={s.input}
                      value={password}
                      onChangeText={alEscribir(setPassword)}
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
                      hitSlop={10}
                      style={POINTER}
                      accessibilityRole="button"
                      accessibilityLabel={verPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    >
                      <Ionicons name={verPassword ? "eye-off-outline" : "eye-outline"} size={20} color={c.muted} />
                    </Pressable>
                  </View>
                  {password ? (
                    <View style={{ marginTop: 10 }}>
                      <View style={s.barras}>
                        {[0, 1, 2, 3].map((i) => (
                          <View key={i} style={[s.barra, i < fort.puntos && { backgroundColor: colorFort }]} />
                        ))}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: colorFort, marginTop: 6 }}>{fort.nivel}</Text>
                    </View>
                  ) : null}

                  <Text style={s.etiqueta}>Confirmar contraseña</Text>
                  <View style={[s.campo, !!confirmacion && !coincide && { borderColor: c.error }]}>
                    <Ionicons name="lock-closed-outline" size={19} color={c.primary} style={{ marginRight: 10 }} />
                    <TextInput
                      ref={confRef}
                      style={s.input}
                      value={confirmacion}
                      onChangeText={alEscribir(setConfirmacion)}
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
                    {coincide ? <Ionicons name="checkmark-circle" size={20} color={c.success} /> : null}
                  </View>
                  {!!confirmacion && !coincide ? <Text style={s.errorCampo}>Las contraseñas no coinciden.</Text> : null}

                  {botonPrincipal("Cambiar contraseña", cambiarPassword, !passwordOk || !coincide)}
                </>
              ) : null}

              {fase === "listo" ? botonPrincipal("Iniciar sesión", irALogin) : null}
            </Animated.View>

            {!!error && (
              <View style={s.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={20} color={c.error} style={{ marginRight: 9 }} />
                <Text style={s.errorTexto}>{error}</Text>
              </View>
            )}
            {!!info && !error && (
              <View style={s.infoBox} accessibilityLiveRegion="polite">
                <Ionicons name="information-circle-outline" size={20} color={c.info} style={{ marginRight: 9 }} />
                <Text style={s.infoTexto}>{info}</Text>
              </View>
            )}

            {fase !== "listo" ? (
              <Pressable style={[s.volver, POINTER]} onPress={irALogin} hitSlop={8}>
                <Ionicons name="chevron-back" size={15} color={c.primary} />
                <Text style={s.enlace}>Volver al inicio de sesión</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const crearEstilos = (c: Paleta) =>
  StyleSheet.create({
    contenido: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
    tarjeta: {
      width: "100%",
      maxWidth: 460,
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.dark ? "rgba(45,212,191,0.25)" : "rgba(255,255,255,0.7)",
      padding: 24,
      shadowColor: c.dark ? c.glow : "#022C22",
      shadowOpacity: c.dark ? 0.2 : 0.3,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 16 },
      elevation: 12,
    },
    marca: { color: c.primary, fontSize: 15, fontWeight: "900", letterSpacing: 3, textAlign: "center", marginBottom: 14 },

    pasos: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
    pasoWrap: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
    pasoLinea: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.border, marginTop: 15 },
    pasoLineaOn: { backgroundColor: c.primary },
    pasoItem: { alignItems: "center", width: 70 },
    pasoDot: {
      width: 33,
      height: 33,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.inputBg,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    pasoDotOn: { backgroundColor: c.primary, borderColor: c.primary },
    pasoTexto: { marginTop: 5, fontSize: 11, fontWeight: "600", color: c.muted },
    pasoTextoOn: { color: c.primary, fontWeight: "800" },

    centro: { alignItems: "center", marginBottom: 14 },
    exitoIcono: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.success,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },

    titulo: { fontSize: 23, fontWeight: "800", color: c.text, textAlign: "center" },
    subtitulo: { color: c.muted, textAlign: "center", marginTop: 8, marginBottom: 12, lineHeight: 21, fontSize: 14 },
    etiqueta: { color: c.text, fontWeight: "700", fontSize: 13, marginBottom: 7, marginTop: 14 },
    campo: {
      flexDirection: "row",
      alignItems: "center",
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      minWidth: 0,
      height: "100%",
      fontSize: Platform.OS === "web" ? 16 : 15,
      color: c.text,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    codigo: {
      height: 62,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.primary,
      backgroundColor: c.inputBg,
      color: c.text,
      textAlign: "center",
      fontSize: 30,
      fontWeight: "800",
      letterSpacing: 12,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },

    barras: { flexDirection: "row", gap: 6 },
    barra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },

    botonWrap: {
      borderRadius: 14,
      marginTop: 20,
      shadowColor: c.glow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    boton: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    botonTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },

    filaAcciones: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 8 },
    enlace: { color: c.primary, fontWeight: "700", fontSize: 13.5 },
    volver: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 22 },

    errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: c.errorBg, borderRadius: 12, padding: 12, marginTop: 16 },
    errorTexto: { flex: 1, color: c.error, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    errorCampo: { color: c.error, fontSize: 12, fontWeight: "600", marginTop: 5 },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.dark ? "rgba(56,189,248,0.12)" : "#F0F9FF",
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
    },
    infoTexto: { flex: 1, color: c.text, fontSize: 13, lineHeight: 18 },
  });
