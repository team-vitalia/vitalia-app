import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import {
  generarQR,
  obtenerMensajeError,
  type QRGenerado,
} from "../../services/recuperacionService";
import { useTheme, type Theme } from "../../theme/theme";

interface QRRecuperacionProps {
  usuarioId: number;
  token: string | null;
  /** Muestra la URL completa debajo del QR. Por defecto: false. */
  mostrarURL?: boolean;
  /** Tema opcional. Si no se pasa, se toma del contexto. */
  c?: Theme;
}

export default function QRRecuperacion({
  usuarioId,
  token,
  mostrarURL = false,
  c,
}: QRRecuperacionProps) {
  const fromCtx = useTheme();
  const t = c ?? fromCtx;
  const isDark = t.mode === "dark";

  const [resultado, setResultado] = useState<QRGenerado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function crearQR() {
    setError("");
    setResultado(null);
    setCargando(true);
    try {
      const datos = await generarQR(usuarioId, token);
      setResultado(datos);
    } catch (e) {
      setError(obtenerMensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={[styles.titulo, { color: t.text }]}>QR de recuperación</Text>
      <Text style={[styles.descripcion, { color: t.muted }]}>
        Genera un enlace QR personal para el usuario seleccionado.
      </Text>

      <TouchableOpacity
        style={[
          styles.boton,
          { backgroundColor: t.primary, opacity: cargando ? 0.6 : 1 },
        ]}
        onPress={crearQR}
        disabled={cargando}
        accessibilityRole="button"
        accessibilityLabel="Generar enlace QR"
      >
        {cargando ? (
          <ActivityIndicator color={isDark ? t.onPrimary : "#FFFFFF"} />
        ) : (
          <Text
            style={[
              styles.textoBoton,
              { color: isDark ? t.onPrimary : "#FFFFFF" },
            ]}
          >
            Generar enlace QR
          </Text>
        )}
      </TouchableOpacity>

      {!!error && <Text style={[styles.error, { color: t.error }]}>{error}</Text>}

      {resultado && (
        <View style={styles.resultado}>
          <Text style={[styles.usuario, { color: t.text }]}>
            Usuario: {resultado.usuario}
          </Text>

          {/* QR con fondo blanco SIEMPRE (necesario para escanear) */}
          <View
            style={{
              padding: 14,
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: t.mode === "dark" ? t.border : "#E4EAEE",
            }}
          >
            <QRCode value={resultado.payload} size={220} />
          </View>

          <Text style={[styles.descripcion, { color: t.muted }]}>
            Este enlace es temporal y caduca en{" "}
            {Math.ceil(resultado.segundos / 60)} minutos. Al escanearlo se
            abrirá la página para cambiar la contraseña.
          </Text>

          {mostrarURL && (
            <Text selectable style={[styles.payload, { color: t.muted }]}>
              {resultado.payload}
            </Text>
          )}

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={crearQR}
            disabled={cargando}
            accessibilityRole="button"
            accessibilityLabel="Generar otro QR"
          >
            <Text style={[styles.textoSecundario, { color: t.primary }]}>
              Generar otro QR
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: "100%", alignItems: "center", padding: 18, gap: 12 },
  titulo: { fontSize: 21, fontWeight: "700" },
  descripcion: { textAlign: "center", lineHeight: 21 },
  boton: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBoton: { fontWeight: "700" },
  resultado: { alignItems: "center", gap: 14, marginTop: 14, width: "100%" },
  usuario: { fontWeight: "700" },
  payload: { fontSize: 12, textAlign: "center" },
  error: { textAlign: "center" },
  botonSecundario: { padding: 10 },
  textoSecundario: { fontWeight: "600" },
});