import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { useAppTheme } from "../../../context/ThemeContext";
import { CrownSvg, UpgradeModal } from "../../../components/UpgradeModal";
import { ProfessionalReportsView } from "../../../components/reportes/ProfessionalReportsView";
import { EnterpriseReportsView } from "../../../components/reportes/EnterpriseReportsView";

export default function ReportesScreen() {
  const { planActual } = useAuth();
  const { theme: c } = useAppTheme();
  const [modalUpgradeVisible, setModalUpgradeVisible] = useState(false);

  const planNormalizado = (planActual?.nombre_plan || "basico")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (planNormalizado === "empresarial") {
    return <EnterpriseReportsView />;
  }

  if (planNormalizado === "profesional") {
    return <ProfessionalReportsView />;
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.premiumBannerWrapper}>
        <View style={[styles.premiumCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.premiumIconContainer}>
            <CrownSvg size={36} color="#FBBF24" />
          </View>

          <View style={styles.badgePremium}>
            <Text style={styles.badgePremiumTexto}>
              FUNCIÓN EXCLUSIVA PLAN PROFESIONAL Y EMPRESARIAL
            </Text>
          </View>

          <Text style={[styles.premiumTitulo, { color: c.text }]}>
            Reportes de la Clínica
          </Text>

          <Text style={[styles.premiumDescripcion, { color: c.muted }]}>
            Visualiza el estado de consultorios, citas médicas, tiempos de espera,
            medicamentos en farmacia y recetas de tus pacientes. Actualiza tu suscripción
            para desbloquear el módulo de reportes correspondiente a tu clínica.
          </Text>

          <Pressable
            style={[styles.botonDesbloquear, { backgroundColor: c.primary }]}
            onPress={() => setModalUpgradeVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver planes de mejora"
          >
            <Text style={styles.botonDesbloquearTexto}>Ver planes de mejora</Text>
          </Pressable>
        </View>
      </View>

      <UpgradeModal
        visible={modalUpgradeVisible}
        modulo="Reportes y Analíticas"
        planRequerido="Profesional"
        descripcion="La generación de reportes operativos y analíticas avanzadas con IA están disponibles a partir del Plan Profesional. Actualiza tu suscripción para desbloquear este módulo."
        onClose={() => setModalUpgradeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  premiumBannerWrapper: {
    width: "100%",
    maxWidth: 580,
    alignItems: "center",
  },
  premiumCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 26,
    alignItems: "center",
  },
  premiumIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  badgePremium: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgePremiumTexto: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  premiumTitulo: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  premiumDescripcion: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  botonDesbloquear: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botonDesbloquearTexto: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
