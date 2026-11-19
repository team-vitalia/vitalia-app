import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModalCancelarSuscripcion } from "../../components/ModalCancelarSuscripcion";
import { ModalPlanSuscripcion } from "../../components/ModalPlanSuscripcion";
import { useAuth } from "../../context/AuthContext";
import { useTheme, type Theme } from "../../theme/theme";

export default function MiSuscripcionScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compacto = width < 768;
  const styles = useMemo(() => crearEstilos(c, compacto), [c, compacto]);

  const { usuario, clinica, planActual, recargarSesion } = useAuth();
  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);
  const [modalPlanesVisible, setModalPlanesVisible] = useState(false);

  const nombrePlan = planActual?.nombre_plan || "Gratuito";
  const esGratuito = nombrePlan.toLowerCase().trim() === "gratuito";

  const fechaInicioRaw = (clinica as any)?.fecha_inicio_suscripcion || (clinica as any)?.fecha_registro;
  const fechaInicio = fechaInicioRaw
    ? new Date(fechaInicioRaw).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "No registrada";

  const diffMs = fechaInicioRaw ? Date.now() - new Date(fechaInicioRaw).getTime() : 0;
  const diasTranscurridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const dentroGarantia = diasTranscurridos <= 10;

  const esAdmin = (usuario as any)?.rol_id_FK === 1 || (usuario as any)?.rol?.id_PK === 1 || (usuario as any)?.is_superadmin || (usuario as any)?.es_titular;

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.encabezado}>
          <Pressable onPress={() => router.back()} style={styles.btnAtras}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Mi Suscripción</Text>
            <Text style={styles.subtitulo}>Gestión de plan, facturación y membresía activa</Text>
          </View>
        </View>

        <View style={styles.tarjetaPlan}>
          <View style={styles.filaPlanHeader}>
            <View>
              <Text style={styles.planLabel}>Plan Contratado</Text>
              <Text style={styles.planNombre}>{nombrePlan}</Text>
            </View>
            <View style={[styles.badgeEstado, esGratuito ? styles.badgeGratuito : styles.badgePago]}>
              <Text style={[styles.badgeTexto, esGratuito ? styles.badgeTextoGratuito : styles.badgeTextoPago]}>
                {esGratuito ? "FREEMIUM" : "ACTIVO"}
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.detallesGrid}>
            <View style={styles.itemDetalle}>
              <Text style={styles.detalleLabel}>Fecha de Inicio</Text>
              <Text style={styles.detalleValor}>{fechaInicio}</Text>
            </View>

            <View style={styles.itemDetalle}>
              <Text style={styles.detalleLabel}>Clínica</Text>
              <Text style={styles.detalleValor}>{clinica?.nombre_comercial || "Mi Clínica"}</Text>
            </View>

            <View style={styles.itemDetalle}>
              <Text style={styles.detalleLabel}>Administrador</Text>
              <Text style={styles.detalleValor}>{usuario?.nombre || "Administrador"}</Text>
            </View>

            <View style={styles.itemDetalle}>
              <Text style={styles.detalleLabel}>Estado de Garantía</Text>
              <Text style={[styles.detalleValor, { color: dentroGarantia && !esGratuito ? c.success : c.muted }]}>
                {esGratuito
                  ? "No aplica"
                  : dentroGarantia
                  ? `Día ${diasTranscurridos} de 10 (Garantía activa)`
                  : "Garantía de 10 días concluida"}
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.accionesPlan}>
            <Pressable style={styles.btnCambiarPlan} onPress={() => setModalPlanesVisible(true)}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.btnCambiarPlanTexto}>
                {esGratuito ? "Mejorar a un Plan de Pago" : "Ver / Cambiar Planes"}
              </Text>
            </Pressable>

            {!esGratuito && esAdmin && (
              <Pressable style={styles.btnCancelar} onPress={() => setModalCancelarVisible(true)}>
                <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.btnCancelarTexto}>Cancelar suscripción</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.tarjetaInfo}>
          <Ionicons name="information-circle-outline" size={24} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tarjetaInfoTitulo}>Garantía de Satisfacción de 10 Días</Text>
            <Text style={styles.tarjetaInfoTexto}>
              Si decides cancelar tu suscripción de pago dentro de los primeros 10 días naturales posteriores a tu pago, recibirás un reembolso automático del 100% en tu cuenta PayPal y tu consultorio continuará activo en el Plan Gratuito.
            </Text>
          </View>
        </View>
      </ScrollView>

      <ModalPlanSuscripcion
        visible={modalPlanesVisible}
        onClose={() => setModalPlanesVisible(false)}
      />

      <ModalCancelarSuscripcion
        visible={modalCancelarVisible}
        onClose={() => setModalCancelarVisible(false)}
        onCancelacionExitosa={() => {
          setModalCancelarVisible(false);
          recargarSesion();
        }}
      />
    </View>
  );
}

const crearEstilos = (c: Theme, compacto: boolean) =>
  StyleSheet.create({
    contenedor: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      padding: compacto ? 16 : 24,
      maxWidth: 900,
      width: "100%",
      alignSelf: "center",
      gap: 16,
    },
    encabezado: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    btnAtras: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    titulo: {
      fontSize: compacto ? 20 : 24,
      fontWeight: "800",
      color: c.text,
    },
    subtitulo: {
      fontSize: 13,
      color: c.muted,
      marginTop: 2,
    },
    tarjetaPlan: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: compacto ? 18 : 24,
      ...Platform.select({
        web: {
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        },
        default: {
          elevation: 3,
        },
      }),
    },
    filaPlanHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    planLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    planNombre: {
      fontSize: compacto ? 22 : 28,
      fontWeight: "900",
      color: c.text,
      marginTop: 2,
    },
    badgeEstado: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    badgePago: {
      backgroundColor: c.mode === "dark" ? "rgba(16,185,129,0.18)" : "#D1FAE5",
    },
    badgeGratuito: {
      backgroundColor: c.mode === "dark" ? "rgba(148,163,184,0.15)" : "#F1F5F9",
    },
    badgeTexto: {
      fontSize: 11,
      fontWeight: "800",
    },
    badgeTextoPago: {
      color: c.success,
    },
    badgeTextoGratuito: {
      color: c.muted,
    },
    divisor: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 18,
    },
    detallesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    itemDetalle: {
      flexGrow: 1,
      flexBasis: compacto ? "100%" : "45%",
      minWidth: 160,
    },
    detalleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.muted,
    },
    detalleValor: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      marginTop: 3,
    },
    accionesPlan: {
      flexDirection: compacto ? "column" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    btnCambiarPlan: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      width: compacto ? "100%" : "auto",
    },
    btnCambiarPlanTexto: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    btnCancelar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(220, 38, 38, 0.3)",
      backgroundColor: "rgba(220, 38, 38, 0.05)",
      width: compacto ? "100%" : "auto",
    },
    btnCancelarTexto: {
      fontSize: 13,
      fontWeight: "700",
      color: "#DC2626",
    },
    tarjetaInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      backgroundColor: c.mode === "dark" ? "rgba(45,212,191,0.08)" : "#F0FDFA",
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(45,212,191,0.2)" : "#CCFBF1",
      borderRadius: 18,
      padding: 16,
    },
    tarjetaInfoTitulo: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    tarjetaInfoTexto: {
      fontSize: 12.5,
      color: c.muted,
      marginTop: 4,
      lineHeight: 18,
    },
  });
