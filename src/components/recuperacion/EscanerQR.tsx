
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface EscanerQRProps {
  onLeido: (contenido: string) => void;
  onCancelar: () => void;
}

export default function EscanerQR({
  onLeido,
  onCancelar,
}: EscanerQRProps) {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [leyendo, setLeyendo] = useState(false);
  const bloqueado = useRef(false);

  if (!permiso) {
    return (
      <View style={styles.contenedor}>
        <ActivityIndicator />
        <Text>Comprobando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.texto}>
          VITALIA necesita permiso para usar la cámara y leer el QR.
        </Text>

        <TouchableOpacity
          style={styles.boton}
          onPress={solicitarPermiso}
        >
          <Text style={styles.textoBoton}>Permitir cámara</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancelar}>
          <Text style={styles.cancelar}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Escanea tu código QR</Text>
      <Text style={styles.texto}>
        Coloca el código dentro del área de la cámara.
      </Text>

      <View style={styles.camara}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={({ data }) => {
            if (bloqueado.current || !data) return;

            bloqueado.current = true;
            setLeyendo(true);
            onLeido(data);
          }}
        />
      </View>

      {leyendo && (
        <Text style={styles.texto}>
          Código leído. Continúa para definir tu contraseña.
        </Text>
      )}

      <TouchableOpacity
        style={styles.botonSecundario}
        onPress={onCancelar}
      >
        <Text style={styles.cancelar}>Cerrar cámara</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: "100%",
    gap: 12,
    alignItems: "center",
    marginTop: 16,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222B45",
  },
  texto: {
    color: "#697386",
    textAlign: "center",
    lineHeight: 21,
  },
  camara: {
    width: "100%",
    maxWidth: 360,
    height: 300,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#111827",
  },
  boton: {
    backgroundColor: "#4B5FD7",
    padding: 13,
    borderRadius: 10,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  botonSecundario: {
    padding: 10,
  },
  cancelar: {
    color: "#4B5FD7",
    fontWeight: "600",
  },
});
