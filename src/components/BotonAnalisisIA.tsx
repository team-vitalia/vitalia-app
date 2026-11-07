import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlanFeatures } from "../hooks/usePlanFeatures";
import { MejoraPlanModal } from "./MejoraPlanModal";

export interface BotonAnalisisIAProps {
  onEjecutarAnalisis: () => Promise<void> | void;
  disabled?: boolean;
  cargando?: boolean;
  texto?: string;
  testID?: string;
}

export function BotonAnalisisIA({
  onEjecutarAnalisis,
  disabled = false,
  cargando = false,
  texto = "Análisis IA",
  testID = "btn-analisis-ia",
}: BotonAnalisisIAProps) {
  const { canUseAI } = usePlanFeatures();
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = async () => {
    if (!canUseAI()) {
      setModalVisible(true);
      return;
    }

    await onEjecutarAnalisis();
  };

  const planPermitido = canUseAI();

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || cargando}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={texto}
        testID={testID}
        style={[
          styles.boton,
          disabled && styles.botonDeshabilitado,
          !planPermitido && styles.botonBloqueado,
        ]}
      >
        <View style={styles.contenido}>
          {cargando ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.icono} />
          ) : (
            <Ionicons
              name={planPermitido ? "sparkles" : "lock-closed-outline"}
              size={18}
              color="#FFFFFF"
              style={styles.icono}
            />
          )}

          <Text style={styles.textoBoton}>{texto}</Text>

          {!planPermitido && (
            <View style={styles.badgePro} testID="badge-pro">
              <Text style={styles.badgeTexto}>PRO</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <MejoraPlanModal
        visible={modalVisible}
        funcionBloqueada="Análisis IA"
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: "#0F4C45",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F4C45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  botonBloqueado: {
    backgroundColor: "#1E293B",
  },
  contenido: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icono: {
    marginRight: 8,
  },
  textoBoton: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  badgePro: {
    marginLeft: 8,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTexto: {
    color: "#0F172A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
