/**
 * Registro PÚBLICO de pacientes (sin iniciar sesión).
 *
 * - Ruta: /registro (ya figura como pantalla de autenticación en _layout.tsx).
 * - Exclusivo para pacientes: no existe selector de rol y la solicitud NO envía
 *   ningún rol; el backend (POST /api/auth/registro) fija el rol Paciente y rechaza
 *   cualquier campo ajeno. Ocultar opciones aquí es solo experiencia de usuario.
 * - Las validaciones de este formulario (components/admin/validaciones.ts) replican
 *   las del backend para dar retroalimentación inmediata; el backend es quien
 *   garantiza la integridad (formato, correo y CURP únicos con restricción UNIQUE).
 *
 * Formulario administrativo (todos los roles): src/app/admin/usuarios/crear.tsx.
 */
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Aviso, Boton, Campo } from "../components/admin/ui";
import {
  CURP_LONGITUD,
  fortalezaPassword,
  normalizarCurp,
  normalizarEspacios,
  vCorreo,
  vCurp,
  vNombrePersona,
  vPassword,
  vTelefono,
} from "../components/admin/validaciones";
import { useAuth } from "../context/AuthContext";
import { registrarPaciente } from "../services/registroService";
import { mensajeError } from "../services/util";
import { DARK, LIGHT, type Theme } from "../theme/theme";

/* Paleta de acceso: la misma del inicio de sesión (verde Vitalia). */
const AUTH_LIGHT: Theme = {
  ...LIGHT,
  primary: "#0F766E",
  text: "#1E203B",
  card: "#FFFFFF",
  border: "#E2E8F0",
};
const AUTH_DARK: Theme = { ...DARK };

const ND = Platform.OS !== "web";
const POINTER: any = Platform.OS === "web" ? { cursor: "pointer" } : null;

const FORM_VACIO = {
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  curp: "",
  telefono: "",
  correo: "",
  password: "",
  confirmar: "",
};

type ErroresServidor = { correo?: string; curp?: string };

export default function RegistroScreen() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const scheme = useColorScheme();
  const c = scheme === "dark" ? AUTH_DARK : AUTH_LIGHT;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compacto = width < 640;
  const s = useMemo(() => crearEstilos(c, compacto), [c, compacto]);

  const [f, setF] = useState(FORM_VACIO);
  const [verPassword, setVerPassword] = useState(false);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [errorServidor, setErrorServidor] = useState<ErroresServidor>({});
  const [registrado, setRegistrado] = useState<{ nombre: string; correo: string } | null>(null);

  /* Una persona con sesión iniciada no necesita registrarse. */
  useEffect(() => {
    if (!cargando && usuario) router.replace("/");
  }, [cargando, usuario]);

  /* Animaciones suaves (se omiten si el sistema pide reducir movimiento). */
  const entrada = useRef(new Animated.Value(0)).current;
  const exito = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reducir) => {
        if (!activo) return;
        if (reducir) entrada.setValue(1);
        else
          Animated.timing(entrada, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: ND,
          }).start();
      });
    return () => {
      activo = false;
    };
  }, [entrada]);

  useEffect(() => {
    if (!registrado) return;
    exito.setValue(0);
    Animated.spring(exito, { toValue: 1, friction: 6, tension: 80, useNativeDriver: ND }).start();
  }, [registrado, exito]);

  const set = (campo: keyof typeof FORM_VACIO) => (valor: string) => {
    setF((a) => ({ ...a, [campo]: campo === "curp" ? normalizarCurp(valor) : valor }));
    if (campo === "correo") setErrorServidor((e) => ({ ...e, correo: undefined }));
    if (campo === "curp") setErrorServidor((e) => ({ ...e, curp: undefined }));
  };

  const errores = {
    nombre: vNombrePersona(f.nombre, "El nombre"),
    apellidoPaterno: vNombrePersona(f.apellidoPaterno, "El apellido paterno"),
    apellidoMaterno: vNombrePersona(f.apellidoMaterno, "El apellido materno", false),
    curp: errorServidor.curp ?? vCurp(f.curp),
    telefono: vTelefono(f.telefono),
    correo: errorServidor.correo ?? vCorreo(f.correo),
    password: vPassword(f.password),
    confirmar: !f.confirmar
      ? "Confirma la contraseña."
      : f.confirmar !== f.password
        ? "Las contraseñas no coinciden."
        : "",
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const fort = fortalezaPassword(f.password);
  const colorFort = fort.puntos <= 1 ? c.error : fort.puntos === 2 ? c.warning : fort.puntos === 3 ? c.info : c.success;

  const enviar = async () => {
    setIntento(true);
    setErrorGeneral("");
    if (hayErrores) {
      setErrorGeneral("Revisa los campos marcados en rojo antes de continuar.");
      return;
    }

    try {
      setGuardando(true);
      /* No se envía ningún rol: el servidor asigna Paciente. */
      const r = await registrarPaciente({
        nombre: normalizarEspacios(f.nombre),
        apellido_paterno: normalizarEspacios(f.apellidoPaterno),
        apellido_materno: normalizarEspacios(f.apellidoMaterno) || null,
        curp: normalizarCurp(f.curp),
        correo_electronico: f.correo.trim().toLowerCase(),
        password: f.password,
        telefono: f.telefono.trim() || null,
      });
      setRegistrado({ nombre: r.usuario.nombre, correo: r.usuario.correo_electronico });
    } catch (e: any) {
      const msg = mensajeError(e, "No se pudo crear la cuenta. Inténtalo de nuevo.");
      if (/curp/i.test(msg)) setErrorServidor((x) => ({ ...x, curp: msg }));
      else if (/correo/i.test(msg)) setErrorServidor((x) => ({ ...x, correo: msg }));
      else setErrorGeneral(msg);
    } finally {
      setGuardando(false);
    }
  };

  const irALogin = () => router.replace("/login");

  const tarjetaAnim = {
    opacity: entrada,
    transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <LinearGradient
      colors={scheme === "dark" ? ["#134E4A", "#0F172A"] : ["#0F766E", "#134E4A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Luz suave detrás de la tarjeta */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(45,212,191,0.34)", "rgba(45,212,191,0)"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: Math.max(insets.top, 12) + (compacto ? 8 : 24), paddingBottom: Math.max(insets.bottom, 12) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.tarjeta, tarjetaAnim]}>
            {/* Cambio entre iniciar sesión / crear cuenta (siempre visible, sin menú hamburguesa) */}
            <View style={s.tabs} accessibilityRole="tablist">
              <Pressable
                onPress={irALogin}
                accessibilityRole="tab"
                accessibilityState={{ selected: false }}
                style={({ pressed }) => [s.tab, POINTER, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.tabTexto}>Iniciar sesión</Text>
              </Pressable>
              <View style={[s.tab, s.tabActiva]} accessibilityRole="tab" accessibilityState={{ selected: true }}>
                <Text style={[s.tabTexto, s.tabTextoActiva]}>Crear cuenta</Text>
              </View>
            </View>

            {registrado ? (
              <View style={s.exito}>
                <Animated.View
                  style={[
                    s.exitoIcono,
                    { transform: [{ scale: exito.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }], opacity: exito },
                  ]}
                >
                  <FontAwesome name="check" size={30} color="#FFFFFF" />
                </Animated.View>
                <Text style={s.exitoTitulo}>Cuenta creada correctamente</Text>
                <Text style={s.exitoTexto}>
                  Hola, <Text style={s.negrita}>{registrado.nombre}</Text>. Tu cuenta de paciente está lista. Ya puedes iniciar sesión con{" "}
                  <Text style={s.negrita}>{registrado.correo}</Text> y la contraseña que acabas de crear.
                </Text>
                <Boton texto="Iniciar sesión" icono="sign-in" onPress={irALogin} c={c} />
              </View>
            ) : (
              <>
                <View style={s.encabezado}>
                  <View style={s.logoHalo}>
                    <Image source={require("../assets/images/logo.png")} style={s.logo} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.titulo}>Crea tu cuenta de paciente</Text>
                    <Text style={s.subtitulo}>Agenda y consulta tus citas en línea. Los campos con * son obligatorios.</Text>
                  </View>
                </View>

                <Text style={s.seccion}>
                  <FontAwesome name="id-card-o" size={13} color={c.primary} />  Datos personales
                </Text>

                <Campo
                  c={c}
                  etiqueta="Nombre(s)"
                  valor={f.nombre}
                  onChange={set("nombre")}
                  requerido
                  error={errores.nombre}
                  mostrarError={intento}
                  placeholder="Ej. María Fernanda"
                  autoCapitalize="words"
                  icono="user"
                  maxLength={100}
                />

                <View style={s.fila}>
                  <View style={s.mitad}>
                    <Campo
                      c={c}
                      etiqueta="Apellido paterno"
                      valor={f.apellidoPaterno}
                      onChange={set("apellidoPaterno")}
                      requerido
                      error={errores.apellidoPaterno}
                      mostrarError={intento}
                      placeholder="Ej. López"
                      autoCapitalize="words"
                      maxLength={100}
                    />
                  </View>
                  <View style={s.mitad}>
                    <Campo
                      c={c}
                      etiqueta="Apellido materno"
                      valor={f.apellidoMaterno}
                      onChange={set("apellidoMaterno")}
                      error={errores.apellidoMaterno}
                      mostrarError={intento}
                      placeholder="Ej. Reyes"
                      autoCapitalize="words"
                      ayuda="Opcional"
                      maxLength={100}
                    />
                  </View>
                </View>

                <Campo
                  c={c}
                  etiqueta="CURP"
                  valor={f.curp}
                  onChange={set("curp")}
                  requerido
                  error={errores.curp}
                  mostrarError={intento || f.curp.length >= CURP_LONGITUD}
                  placeholder="18 caracteres"
                  autoCapitalize="characters"
                  icono="id-badge"
                  maxLength={CURP_LONGITUD}
                  ayuda={`${f.curp.length}/${CURP_LONGITUD} · Debe ser la CURP del paciente; no puede repetirse.`}
                />

                <Campo
                  c={c}
                  etiqueta="Teléfono"
                  valor={f.telefono}
                  onChange={set("telefono")}
                  error={errores.telefono}
                  mostrarError={intento}
                  teclado="phone-pad"
                  placeholder="722 123 4567"
                  icono="phone"
                  ayuda="Opcional"
                />

                <Text style={[s.seccion, { marginTop: 6 }]}>
                  <FontAwesome name="lock" size={14} color={c.primary} />  Acceso a tu cuenta
                </Text>

                <Campo
                  c={c}
                  etiqueta="Correo electrónico"
                  valor={f.correo}
                  onChange={set("correo")}
                  requerido
                  error={errores.correo}
                  mostrarError={intento}
                  teclado="email-address"
                  placeholder="nombre@correo.com"
                  icono="envelope-o"
                />

                <View style={s.fila}>
                  <View style={s.mitad}>
                    <Campo
                      c={c}
                      etiqueta="Contraseña"
                      valor={f.password}
                      onChange={set("password")}
                      requerido
                      secreto={!verPassword}
                      error={errores.password}
                      mostrarError={intento}
                      placeholder="Mínimo 8 caracteres"
                      icono="key"
                      derecha={
                        <Pressable
                          onPress={() => setVerPassword((v) => !v)}
                          hitSlop={8}
                          accessibilityLabel={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          style={POINTER}
                        >
                          <FontAwesome name={verPassword ? "eye-slash" : "eye"} size={16} color={c.muted} />
                        </Pressable>
                      }
                    />
                  </View>
                  <View style={s.mitad}>
                    <Campo
                      c={c}
                      etiqueta="Confirmar contraseña"
                      valor={f.confirmar}
                      onChange={set("confirmar")}
                      requerido
                      secreto={!verPassword}
                      error={errores.confirmar}
                      mostrarError={intento}
                      placeholder="Repite la contraseña"
                      icono="key"
                    />
                  </View>
                </View>

                {f.password.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <View style={s.barras}>
                      {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={[s.barra, i < fort.puntos && { backgroundColor: colorFort }]} />
                      ))}
                    </View>
                    <View style={s.reglas}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: colorFort }}>{fort.nivel}</Text>
                      {fort.reglas.map((r) => (
                        <View key={r.texto} style={s.regla}>
                          <FontAwesome name={r.ok ? "check-circle" : "circle-o"} size={12} color={r.ok ? c.success : c.muted} />
                          <Text style={{ fontSize: 12, color: r.ok ? c.success : c.muted }}>{r.texto}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {errorGeneral ? <Aviso c={c} tipo="error" texto={errorGeneral} onCerrar={() => setErrorGeneral("")} /> : null}

                <Boton texto="Crear cuenta" icono="user-plus" cargando={guardando} onPress={enviar} c={c} />

                <Text style={s.legal}>
                  Al crear tu cuenta aceptas las{" "}
                  <Text style={s.enlace} accessibilityRole="link" onPress={() => router.push("/condiciones-servicio" as any)}>
                    Condiciones del Servicio
                  </Text>{" "}
                  y la{" "}
                  <Text style={s.enlace} accessibilityRole="link" onPress={() => router.push("/politica-privacidad" as any)}>
                    Política de Privacidad
                  </Text>
                  .
                </Text>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const crearEstilos = (c: Theme, compacto: boolean) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, alignItems: "center", paddingHorizontal: compacto ? 12 : 24 },
    tarjeta: {
      width: "100%",
      maxWidth: 560,
      backgroundColor: c.card,
      borderRadius: compacto ? 22 : 28,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(45,212,191,0.28)" : "rgba(255,255,255,0.7)",
      padding: compacto ? 18 : 30,
      gap: 14,
      shadowColor: c.mode === "dark" ? "#2DD4BF" : "#022C22",
      shadowOpacity: c.mode === "dark" ? 0.22 : 0.3,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 18 },
      elevation: 14,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: c.mode === "dark" ? "rgba(255,255,255,0.06)" : "#F1F5F9",
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    tab: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    tabActiva: {
      backgroundColor: c.card,
      shadowColor: "#0F172A",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    tabTexto: { fontSize: 14, fontWeight: "700", color: c.muted },
    tabTextoActiva: { color: c.primary },

    encabezado: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
    logoHalo: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: c.mode === "dark" ? "rgba(45,212,191,0.14)" : "#CCFBF1",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: { width: 38, height: 38 },
    titulo: { fontSize: compacto ? 20 : 23, fontWeight: "800", color: c.text },
    subtitulo: { fontSize: 13, color: c.muted, marginTop: 2, lineHeight: 18 },

    seccion: { fontSize: 14, fontWeight: "800", color: c.primary, marginTop: 8 },
    fila: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    mitad: { flexGrow: 1, flexShrink: 1, flexBasis: compacto ? "100%" : 220, minWidth: 0 },

    barras: { flexDirection: "row", gap: 6 },
    barra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },
    reglas: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
    regla: { flexDirection: "row", alignItems: "center", gap: 5 },

    legal: { fontSize: 12, color: c.muted, textAlign: "center", lineHeight: 18 },
    enlace: { color: c.primary, fontWeight: "700", textDecorationLine: "underline" },
    negrita: { fontWeight: "800", color: c.text },

    exito: { alignItems: "center", gap: 14, paddingVertical: 18 },
    exitoIcono: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.success,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.success,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },
    exitoTitulo: { fontSize: 21, fontWeight: "800", color: c.text, textAlign: "center" },
    exitoTexto: { fontSize: 14.5, color: c.muted, textAlign: "center", lineHeight: 22 },
  });
