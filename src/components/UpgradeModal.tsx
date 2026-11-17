import React, { useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { resolveLandingUrl } from "../services/api";
import { useTheme, type Theme } from "../theme/theme";

export interface UpgradeModalProps {
  visible: boolean;
  modulo?: string;
  funcionBloqueada?: string;
  planRequerido?: string;
  descripcion?: string;
  onClose: () => void;
  onVerPlanes?: () => void;
}

export function CrownSvg({
  size = 28,
  color = "#FBBF24",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"
        fill={color}
      />
    </Svg>
  );
}

export function UpgradeModal({
  visible,
  modulo,
  funcionBloqueada,
  planRequerido = "Superior",
  descripcion,
  onClose,
  onVerPlanes,
}: UpgradeModalProps) {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const nombreModulo = modulo || funcionBloqueada || "este módulo";

  const handleVerPlanes = () => {
    if (onVerPlanes) {
      onVerPlanes();
      return;
    }

    const baseUrl = resolveLandingUrl();
    const urlPlanes = `${baseUrl}/#planes`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.open(urlPlanes, "_blank");
      }
    } else {
      Linking.openURL(urlPlanes).catch(() => {});
    }
  };

  const mensajeDescriptivo =
    descripcion ||
    `Mejora tu plan para acceder a esta función. Tu plan actual no soporta ${nombreModulo}. Actualiza a ${planRequerido} y lleva la administración de tu clínica al siguiente nivel con herramientas avanzadas y automatización.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="mejora-plan-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityLabel="Cerrar modal"
        />

        <View style={styles.card} testID="modal-contenido">
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={["rgba(251, 191, 36, 0.22)", "rgba(34, 211, 238, 0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <CrownSvg size={30} color="#FBBF24" />
            </LinearGradient>
          </View>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>PLAN {planRequerido.toUpperCase()}</Text>
          </View>

          <Text style={styles.title}>Desbloquea {nombreModulo}</Text>

          <Text style={styles.message} testID="mensaje-mejora-plan">
            {mensajeDescriptivo}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleVerPlanes}
              activeOpacity={0.85}
              style={styles.primaryButton}
              accessibilityRole="button"
              accessibilityLabel="Ver planes de mejora"
              testID="btn-ver-planes"
            >
              <LinearGradient
                colors={["#0EA5E9", "#22D3EE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color="#04222B"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.primaryButtonText}>Ver planes de mejora</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.ghostButton}
              accessibilityRole="button"
              accessibilityLabel="Quizás más tarde"
              testID="btn-cerrar-modal"
            >
              <Text style={styles.ghostButtonText}>Quizás más tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const MejoraPlanModal = UpgradeModal;

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";
  return StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(11, 18, 32, 0.55)",
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        } as any)
      : {}),
  },
  backdrop: {
    backgroundColor: "transparent",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    ...(Platform.OS === "web"
      ? ({
          boxShadow: isDark
            ? "0 20px 45px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)"
            : "0 20px 45px rgba(15, 76, 69, 0.12), 0 0 0 1px rgba(15, 76, 69, 0.05)",
        } as any)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.35 : 0.15,
          shadowRadius: 20,
          elevation: 10,
        }),
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  badgeContainer: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderColor: "rgba(251, 191, 36, 0.28)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: "#FBBF24",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: c.text,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.muted,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: isDark ? "#04222B" : "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ghostButton: {
    width: "100%",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: c.muted,
    fontSize: 13,
    fontWeight: "600",
  },
});
};
