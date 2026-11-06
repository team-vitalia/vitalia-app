import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MejoraPlanModalProps {
  visible: boolean;
  funcionBloqueada: string;
  onClose: () => void;
  onVerPlanes?: () => void;
}

export function MejoraPlanModal({
  visible,
  funcionBloqueada,
  onClose,
  onVerPlanes,
}: MejoraPlanModalProps) {
  const handleVerPlanes = () => {
    if (onVerPlanes) {
      onVerPlanes();
      return;
    }

    const urlPlanes = "http://localhost:3000/#planes";
    if (Platform.OS === "web") {
      window.open(urlPlanes, "_blank");
    } else {
      Linking.openURL(urlPlanes).catch(() => {});
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="mejora-plan-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={styles.modalCard} testID="modal-contenido">
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={32} color="#0F4C45" />
          </View>

          <Text style={styles.kicker}>Función de Plan Superior</Text>
          <Text style={styles.title}>{funcionBloqueada}</Text>

          <Text style={styles.message} testID="mensaje-mejora-plan">
            Mejora tu plan para acceder a esta función. Tu plan actual no soporta {funcionBloqueada}.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              testID="btn-cerrar-modal"
            >
              <Text style={styles.cancelButtonText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleVerPlanes}
              style={styles.upgradeButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ver Planes"
              testID="btn-ver-planes"
            >
              <Ionicons name="arrow-up-circle-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.upgradeButtonText}>Ver Planes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const UpgradeModal = MejoraPlanModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(11, 18, 32, 0.75)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(15, 76, 69, 0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F4C45",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  upgradeButton: {
    flex: 1.5,
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#0F4C45",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F4C45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnIcon: {
    marginRight: 6,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
