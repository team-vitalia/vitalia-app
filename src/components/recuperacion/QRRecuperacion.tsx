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

interface QRRecuperacionProps {
  usuarioId: number;
  token: string | null;
}

export default function QRRecuperacion({ usuarioId, token }: QRRecuperacionProps) {
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
      <Text style={styles.titulo}>QR de recuperación</Text>
      <Text style={styles.descripcion}>
        Genera un enlace QR personal para el usuario seleccionado.
      </Text>
      <TouchableOpacity
        style={[styles.boton, cargando && styles.deshabilitado]}
        onPress={crearQR}
        disabled={cargando}
      >
        {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoBoton}>Generar enlace QR</Text>}
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {resultado && (
        <View style={styles.resultado}>
          <Text style={styles.usuario}>Usuario: {resultado.usuario}</Text>
          <QRCode value={resultado.payload} size={220} />
          <Text style={styles.descripcion}>
            Este enlace es temporal y caduca en {Math.ceil(resultado.segundos / 60)} minutos.
            Al escanearlo se abrirá la página para cambiar la contraseña.
          </Text>
          <Text selectable style={styles.payload}>{resultado.payload}</Text>
          <TouchableOpacity style={styles.botonSecundario} onPress={crearQR} disabled={cargando}>
            <Text style={styles.textoSecundario}>Generar otro QR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: "100%", alignItems: "center", padding: 18, gap: 12 },
  titulo: { fontSize: 21, fontWeight: "700", color: "#222B45" },
  descripcion: { textAlign: "center", color: "#697386", lineHeight: 21 },
  boton: { width: "100%", backgroundColor: "#4B5FD7", padding: 14, borderRadius: 10, alignItems: "center" },
  deshabilitado: { opacity: 0.6 },
  textoBoton: { color: "#FFFFFF", fontWeight: "700" },
  resultado: { alignItems: "center", gap: 14, marginTop: 14, width: "100%" },
  usuario: { fontWeight: "700", color: "#222B45" },
  payload: { color: "#46536B", fontSize: 12, textAlign: "center" },
  error: { color: "#C62828", textAlign: "center" },
  botonSecundario: { padding: 10 },
  textoSecundario: { color: "#4B5FD7", fontWeight: "600" },
});
