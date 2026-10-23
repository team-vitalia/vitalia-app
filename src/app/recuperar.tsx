import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  confirmarEnlaceCorreo,
  confirmarQR,
  solicitarEnlaceCorreo,
  type TipoRecuperacion,
} from "../services/recuperacionService";

export default function RecuperarRuta() {
  const params = useLocalSearchParams<{
    usuario_id?: string | string[];
    token?: string | string[];
    tipo?: string | string[];
  }>();
  const router = useRouter();
  const usuarioIdTexto = Array.isArray(params.usuario_id) ? params.usuario_id[0] : params.usuario_id;
  const tokenParam = Array.isArray(params.token) ? params.token[0] : params.token;
  const tipoParam = Array.isArray(params.tipo) ? params.tipo[0] : params.tipo;
  const usuarioId = Number(usuarioIdTexto);
  const tipo: TipoRecuperacion = tipoParam === "correo" ? "correo" : "qr";
  const tokenValido = Number.isInteger(usuarioId) && usuarioId > 0 && !!tokenParam && tokenParam.length >= 20;

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [terminado, setTerminado] = useState(false);
  const procesando = useRef(false);

  useEffect(() => {
    setError("");
    setMensaje("");
  }, [usuarioIdTexto, tokenParam, tipoParam]);

  async function solicitarEnlace() {
    if (procesando.current) return;
    setError("");
    setMensaje("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    procesando.current = true;
    setCargando(true);
    try {
      const respuesta = await solicitarEnlaceCorreo(correo);
      setMensaje(respuesta.mensaje);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar el enlace.");
    } finally {
      procesando.current = false;
      setCargando(false);
    }
  }

  async function cambiarPassword() {
    if (procesando.current) return;
    setError("");
    setMensaje("");
    if (!tokenValido || !tokenParam) {
      setError("El enlace no es válido. Solicita uno nuevo al administrador.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
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
      const respuesta = tipo === "correo"
        ? await confirmarEnlaceCorreo(usuarioId, tokenParam, password)
        : await confirmarQR(usuarioId, tokenParam, password);
      setMensaje(respuesta.mensaje);
      setTerminado(true);
      setPassword("");
      setConfirmacion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      procesando.current = false;
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={styles.tarjeta}>
          <Text style={styles.marca}>VITALIA</Text>
          <Text style={styles.titulo}>{tokenValido ? "Crear nueva contraseña" : "Recuperar contraseña"}</Text>
          <Text style={styles.subtitulo}>
            {tokenValido
              ? "Escribe tu nueva contraseña y confírmala para recuperar el acceso a tu cuenta."
              : "Solicita un enlace de recuperación a tu correo electrónico."}
          </Text>

          {tokenValido ? (
            terminado ? (
              <>
                <Text style={styles.exito}>{mensaje}</Text>
                <TouchableOpacity style={styles.boton} onPress={() => router.replace("/login")}>
                  <Text style={styles.textoBoton}>Ir al inicio de sesión</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.etiqueta}>Nueva contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry={!mostrarPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!cargando}
                />
                <Text style={styles.etiqueta}>Confirmar contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={confirmacion}
                  onChangeText={(v) => { setConfirmacion(v); setError(""); }}
                  placeholder="Repite la nueva contraseña"
                  secureTextEntry={!mostrarPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!cargando}
                />
                <TouchableOpacity onPress={() => setMostrarPassword((v) => !v)}>
                  <Text style={styles.enlace}>{mostrarPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}</Text>
                </TouchableOpacity>
                {!!confirmacion && password !== confirmacion && <Text style={styles.error}>Las contraseñas no coinciden.</Text>}
                <TouchableOpacity
                  style={[styles.boton, (cargando || password.length < 8 || password !== confirmacion) && styles.deshabilitado]}
                  onPress={cambiarPassword}
                  disabled={cargando || password.length < 8 || password !== confirmacion}
                >
                  {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoBoton}>Cambiar contraseña</Text>}
                </TouchableOpacity>
              </>
            )
          ) : (
            <>
              <Text style={styles.etiqueta}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={correo}
                onChangeText={(v) => { setCorreo(v); setError(""); setMensaje(""); }}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!cargando}
              />
              <TouchableOpacity style={styles.boton} onPress={solicitarEnlace} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoBoton}>Enviar enlace</Text>}
              </TouchableOpacity>
            </>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!mensaje && !terminado && <Text style={styles.informacion}>{mensaje}</Text>}
          <TouchableOpacity style={styles.volver} onPress={() => router.replace("/login")}>
            <Text style={styles.enlace}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#F5F7FB" },
  contenido: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  tarjeta: { width: "100%", maxWidth: 460, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 24, elevation: 3 },
  marca: { color: "#247F76", fontSize: 15, fontWeight: "900", letterSpacing: 3, textAlign: "center", marginBottom: 10 },
  titulo: { fontSize: 25, fontWeight: "700", color: "#222B45", textAlign: "center" },
  subtitulo: { color: "#697386", textAlign: "center", marginTop: 8, marginBottom: 22, lineHeight: 21 },
  etiqueta: { color: "#30394D", fontWeight: "600", marginBottom: 7, marginTop: 14 },
  input: { borderWidth: 1, borderColor: "#D8DEEA", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: "#222B45", backgroundColor: "#FFFFFF" },
  boton: { backgroundColor: "#4B5FD7", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center", marginTop: 18 },
  deshabilitado: { opacity: 0.5 },
  textoBoton: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", textAlign: "center" },
  enlace: { color: "#4B5FD7", fontWeight: "600", marginTop: 10, textAlign: "center" },
  error: { color: "#C62828", marginTop: 14, lineHeight: 20 },
  informacion: { color: "#46536B", backgroundColor: "#F0F3FA", padding: 12, borderRadius: 8, marginTop: 14, lineHeight: 20 },
  exito: { color: "#18794E", marginTop: 14, lineHeight: 20, textAlign: "center" },
  volver: { alignItems: "center", marginTop: 20 },
});
