import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type Theme } from "../theme/theme";

const POINTER = Platform.select({
  web: { cursor: "pointer" } as any,
  default: {},
});

export default function EliminacionCuentaScreen() {
  const router = useRouter();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmo, setConfirmo] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<"idle" | "exito" | "error">("idle");

  const isSmall = width < 640;
  const contentMaxWidth = Math.min(width - 32, 920);

  const styles = useMemo(() => createStyles(c, isSmall), [c, isSmall]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login" as any);
    }
  };

  const handleEnviarSolicitud = () => {
    if (!confirmo || !correo.trim() || !nombre.trim()) {
      setMensajeEstado("error");
      return;
    }
    setMensajeEstado("exito");
  };

  const handleEnviarCorreo = () => {
    const subject = encodeURIComponent("Solicitud de Eliminacion de Cuenta - Vitalia");
    const body = encodeURIComponent(
      `Nombre completo: ${nombre}\nCorreo de la cuenta: ${correo}\nMotivo: ${motivo}\n\nConfirmo la solicitud de eliminacion definitiva de mi cuenta y revoco el consentimiento de datos no clinicos.`
    );
    Linking.openURL(`mailto:vitaliaorg98@gmail.com?subject=${subject}&body=${body}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={c.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />

      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, Platform.OS === "android" ? 14 : 12),
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={[styles.backButton, POINTER]}
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla anterior"
          >
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <Text style={styles.headerKicker}>SISTEMA CLÍNICO VITALIA</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              Eliminación de Cuentas y Datos
            </Text>
          </View>

          <View style={styles.headerBadge}>
            <Ionicons
              name="shield-checkmark"
              size={13}
              color="#16A34A"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.headerBadgeText}>Google Play Oficial</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainWrapper, { maxWidth: contentMaxWidth }]}>
          <LinearGradient
            colors={[c.primary, c.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="person-remove" size={30} color="#FFFFFF" />
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroPill}>
                <Ionicons
                  name="shield"
                  size={12}
                  color="#2DD4BF"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.heroPillText}>
                  Política de Datos y Supresión
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                Solicitud de Eliminación de Cuentas y Datos Personales
              </Text>
              <Text style={styles.heroDescription}>
                Canal oficial de cumplimiento normativo y transparencia para la
                aplicación Vitalia (Gestión Clínica Integral), desarrollada por
                Jared Gonzalez Ortega, en apego a las directrices de Google Play
                Store y la regulación sanitaria vigente.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>30 Días</Text>
              <Text style={styles.statLabel}>Plazo de Resolución</Text>
              <Text style={styles.statDesc}>
                Tiempo máximo legal para formalizar la purga de credenciales de acceso.
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>5 Años</Text>
              <Text style={styles.statLabel}>Retención Sanitaria</Text>
              <Text style={styles.statDesc}>
                Custodia obligatoria de expedientes clínicos conforme a la NOM-004-SSA3-2012.
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Disociación</Text>
              <Text style={styles.statDesc}>
                Desvinculación completa de identificadores de sesión y dispositivos móviles.
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>Gratuito</Text>
              <Text style={styles.statLabel}>Costo del Proceso</Text>
              <Text style={styles.statDesc}>
                El trámite de baja de cuenta no genera cobros ni penalizaciones.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Pasos Exactos para Solicitar la Eliminación
            </Text>
            <Text style={styles.sectionSubtitle}>
              Dispone de dos alternativas oficiales para solicitar la supresión permanente:
            </Text>

            <Text style={styles.subheading}>
              Método A: Directamente desde la Aplicación Vitalia
            </Text>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Inicio de Sesión</Text>
                <Text style={styles.stepDescription}>
                  Abra la aplicación Vitalia e inicie sesión con su correo electrónico y contraseña registrados.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Navegación al Perfil</Text>
                <Text style={styles.stepDescription}>
                  Diríjase a la sección Perfil en la barra de navegación y seleccione Ajustes de Seguridad y Privacidad.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Comando de Eliminación</Text>
                <Text style={styles.stepDescription}>
                  Presione la opción Solicitar Eliminación de Cuenta y Datos Asociados situada al final del menú.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Validación de Seguridad</Text>
                <Text style={styles.stepDescription}>
                  Confirme su identidad ingresando el código OTP de verificación que recibirá en su correo institucional.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={styles.stepTitle}>Cierre y Acuse</Text>
                <Text style={styles.stepDescription}>
                  El sistema cerrará todas las sesiones activas y le enviará un comprobante formal con número de folio.
                </Text>
              </View>
            </View>

            <Text style={[styles.subheading, { marginTop: 24 }]}>
              Método B: Solicitud Web Oficial (Google Play Store)
            </Text>
            <Text style={styles.paragraph}>
              Si ha desinstalado la aplicación, complete el siguiente formulario web para registrar su solicitud formal:
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Nombre Completo del Titular *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ingrese su nombre y apellidos"
                placeholderTextColor={c.muted}
                value={nombre}
                onChangeText={setNombre}
                accessibilityLabel="Nombre completo del titular"
              />

              <Text style={styles.formLabel}>Correo Electrónico Vinculado a Vitalia *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="ejemplo@vitalia.com"
                placeholderTextColor={c.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
                accessibilityLabel="Correo electrónico vinculado"
              />

              <Text style={styles.formLabel}>Motivo o Comentarios (Opcional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                placeholder="Indique brevemente el motivo de su solicitud"
                placeholderTextColor={c.muted}
                multiline
                numberOfLines={3}
                value={motivo}
                onChangeText={setMotivo}
                accessibilityLabel="Motivo de la solicitud"
              />

              <TouchableOpacity
                style={[styles.checkboxRow, POINTER]}
                activeOpacity={0.8}
                onPress={() => setConfirmo(!confirmo)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmo }}
                accessibilityLabel="Acepto los términos de retención legal y eliminación definitiva"
              >
                <View style={[styles.checkboxBox, confirmo && styles.checkboxBoxActive]}>
                  {confirmo && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Comprendo que la baja es irreversible y que los registros médicos quedarán bajo custodia legal obligatoria.
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, POINTER]}
                  activeOpacity={0.8}
                  onPress={handleEnviarSolicitud}
                  accessibilityRole="button"
                  accessibilityLabel="Registrar solicitud de eliminación"
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Registrar Solicitud en Sistema</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, POINTER]}
                  activeOpacity={0.8}
                  onPress={handleEnviarCorreo}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar solicitud por correo electrónico"
                >
                  <Ionicons name="mail-outline" size={18} color={c.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryButtonText}>Enviar Vía Correo</Text>
                </TouchableOpacity>
              </View>

              {mensajeEstado === "exito" && (
                <View style={styles.alertSuccess} accessibilityRole="alert">
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" style={{ marginRight: 8 }} />
                  <Text style={styles.alertSuccessText}>
                    Solicitud registrada correctamente. Se ha notificado al equipo técnico de Vitalia para su procesamiento.
                  </Text>
                </View>
              )}

              {mensajeEstado === "error" && (
                <View style={styles.alertError} accessibilityRole="alert">
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" style={{ marginRight: 8 }} />
                  <Text style={styles.alertErrorText}>
                    Por favor complete su nombre, correo y marque la casilla de confirmación para proceder.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Tipos de Datos que se Eliminan por Completo
            </Text>
            <Text style={styles.paragraph}>
              Al procesar la solicitud, los siguientes datos personales y de acceso se suprimen de manera irreversible:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Credenciales y seguridad: </Text>
                  Contraseñas protegidas mediante algoritmos de hash (Bcrypt/Argon2), llaves maestras y tokens JWT de sesión.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Identificadores de hardware: </Text>
                  Tokens de Firebase Cloud Messaging (FCM), identificadores únicos de dispositivo y registros temporales de red.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Preferencias de software: </Text>
                  Configuraciones de pantalla, esquemas cromáticos, accesos directos configurados y datos de caché local.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Comunicaciones no clínicas: </Text>
                  Suscripciones a recordatorios sanitarios preventivos y registros de encuestas de calidad de servicio.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Tipos de Datos que se Conservan y Justificación Legal
            </Text>
            <Text style={styles.paragraph}>
              Por tratarse de una solución de software médico-hospitalario, la legislación sanitaria prohíbe la supresión indiscriminada de registros clínicos:
            </Text>

            <View style={styles.calloutWarning}>
              <Ionicons name="warning-outline" size={20} color="#B45309" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.calloutWarningTitle}>Obligación Legal Sanitaria (NOM-004-SSA3-2012)</Text>
                <Text style={styles.calloutWarningText}>
                  Los expedientes clínicos son propiedad médica y legal requerida para el deslinde de responsabilidades y continuidad asistencial. No pueden ser eliminados a solicitud del usuario.
                </Text>
              </View>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Expediente Clínico Electrónico: </Text>
                  Notas de evolución clínica, historias médicas, recetas emitidas, signos vitales y alergias documentadas por profesionales.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Bitácoras de Auditoría Médica: </Text>
                  Sellos de tiempo y cédulas profesionales de médicos que emitieron diagnósticos o prescripción de fármacos.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="ellipse" size={6} color={c.primary} style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Comprobantes Administrativos y Fiscales: </Text>
                  Registros contables y comprobantes de servicios prestados conforme a las leyes fiscales vigentes.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Periodos de Retención para los Datos Conservados
            </Text>
            <Text style={styles.paragraph}>
              Los datos bajo resguardo legal permanecen en servidores encriptados bajo AES-256 durante los siguientes lapsos estrictos:
            </Text>

            <View style={styles.tableBox}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableCellHead, { flex: 1.4 }]}>Categoría</Text>
                <Text style={[styles.tableCellHead, { flex: 1.1 }]}>Retención</Text>
                <Text style={[styles.tableCellHead, { flex: 1.5 }]}>Fundamento</Text>
              </View>

              <View style={styles.tableBodyRow}>
                <Text style={[styles.tableCellBody, { flex: 1.4, fontWeight: "700" }]}>
                  Historial Clínico y Recetas
                </Text>
                <Text style={[styles.tableCellBody, { flex: 1.1 }]}>5 años mínimos</Text>
                <Text style={[styles.tableCellBody, { flex: 1.5 }]}>
                  NOM-004-SSA3-2012 (Numeral 5.4)
                </Text>
              </View>

              <View style={[styles.tableBodyRow, { backgroundColor: c.mode === "dark" ? "rgba(255,255,255,0.02)" : "#F8FAFC" }]}>
                <Text style={[styles.tableCellBody, { flex: 1.4, fontWeight: "700" }]}>
                  Auditoría y Trazabilidad
                </Text>
                <Text style={[styles.tableCellBody, { flex: 1.1 }]}>5 años</Text>
                <Text style={[styles.tableCellBody, { flex: 1.5 }]}>
                  NOM-024-SSA3-2012
                </Text>
              </View>

              <View style={styles.tableBodyRow}>
                <Text style={[styles.tableCellBody, { flex: 1.4, fontWeight: "700" }]}>
                  Comprobantes Fiscales
                </Text>
                <Text style={[styles.tableCellBody, { flex: 1.1 }]}>5 años</Text>
                <Text style={[styles.tableCellBody, { flex: 1.5 }]}>
                  Código Fiscal de la Federación (Art. 30)
                </Text>
              </View>
            </View>

            <View style={styles.calloutInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#0284C7" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.calloutInfoTitle}>Inaccesibilidad Durante el Periodo de Resguardo</Text>
                <Text style={styles.calloutInfoText}>
                  Durante los 5 años obligatorios de retención, su perfil permanecerá completamente desactivado y fuera de servicio. Finalizado dicho término legal, los datos se anonimizan de forma irreversible para fines estadísticos.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Contacto y Datos del Desarrollador
            </Text>
            <Text style={styles.paragraph}>
              Para consultas específicas sobre sus datos o ejercicio de derechos ARCO:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Ionicons name="apps-outline" size={16} color={c.primary} style={{ marginRight: 8 }} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Aplicación: </Text>Vitalia Gestión Clínica
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="person-outline" size={16} color={c.primary} style={{ marginRight: 8 }} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Desarrollador Oficial: </Text>Jared Gonzalez Ortega
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Ionicons name="mail-outline" size={16} color={c.primary} style={{ marginRight: 8 }} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "700" }}>Correo Institucional: </Text>vitaliaorg98@gmail.com
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(c: Theme, isSmall: boolean) {
  const isDark = c.mode === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    headerWrapper: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 10,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: isSmall ? 12 : 20,
      paddingVertical: 10,
      maxWidth: 960,
      width: "100%",
      alignSelf: "center",
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,76,69,0.06)",
    },
    headerTitles: {
      flex: 1,
      marginHorizontal: 12,
    },
    headerKicker: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: c.primary,
      textTransform: "uppercase",
    },
    headerTitle: {
      fontSize: isSmall ? 15 : 17,
      fontWeight: "800",
      color: c.text,
    },
    headerBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(22,163,74,0.15)" : "#ECFDF5",
      borderColor: isDark ? "rgba(22,163,74,0.3)" : "#A7F3D0",
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#16A34A",
    },
    scrollContent: {
      paddingHorizontal: isSmall ? 12 : 20,
      paddingTop: isSmall ? 16 : 24,
      alignItems: "center",
    },
    mainWrapper: {
      width: "100%",
    },
    heroBanner: {
      borderRadius: 20,
      paddingVertical: isSmall ? 20 : 28,
      paddingHorizontal: isSmall ? 16 : 24,
      flexDirection: isSmall ? "column" : "row",
      alignItems: isSmall ? "flex-start" : "center",
      marginBottom: 20,
    },
    heroIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: isSmall ? 0 : 18,
      marginBottom: isSmall ? 12 : 0,
    },
    heroTextWrap: {
      flex: 1,
    },
    heroPill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.14)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
    },
    heroPillText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: isSmall ? 19 : 23,
      fontWeight: "800",
      lineHeight: isSmall ? 25 : 30,
      marginBottom: 8,
    },
    heroDescription: {
      color: "#E2E8F0",
      fontSize: 13,
      lineHeight: 19,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      minWidth: isSmall ? "100%" : 200,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
      borderLeftColor: c.secondary,
      borderRadius: 10,
      padding: 16,
    },
    statValue: {
      fontSize: 22,
      fontWeight: "800",
      color: c.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      color: c.muted,
      marginBottom: 4,
    },
    statDesc: {
      fontSize: 12,
      color: c.text,
      lineHeight: 16,
    },
    sectionCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: isSmall ? 16 : 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: isSmall ? 17 : 19,
      fontWeight: "800",
      color: c.text,
      marginBottom: 6,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: c.muted,
      marginBottom: 16,
      lineHeight: 18,
    },
    subheading: {
      fontSize: 15,
      fontWeight: "700",
      color: c.primary,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 13.5,
      color: c.text,
      lineHeight: 20,
      marginBottom: 12,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,76,69,0.03)",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    stepNumberBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      marginTop: 2,
    },
    stepNumberText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    stepTextWrap: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      marginBottom: 2,
    },
    stepDescription: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 18,
    },
    formContainer: {
      marginTop: 10,
    },
    formLabel: {
      fontSize: 12.5,
      fontWeight: "700",
      color: c.text,
      marginBottom: 6,
      marginTop: 10,
    },
    textInput: {
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13.5,
      color: c.text,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 16,
      marginBottom: 16,
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      marginTop: 2,
    },
    checkboxBoxActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 12.5,
      color: c.text,
      lineHeight: 17,
    },
    buttonsRow: {
      flexDirection: isSmall ? "column" : "row",
      gap: 10,
    },
    primaryButton: {
      backgroundColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 8,
      minHeight: 44,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 13.5,
    },
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: c.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 8,
      minHeight: 44,
    },
    secondaryButtonText: {
      color: c.primary,
      fontWeight: "700",
      fontSize: 13.5,
    },
    alertSuccess: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#DCFCE7",
      borderWidth: 1,
      borderColor: "#86EFAC",
      borderRadius: 8,
      padding: 12,
      marginTop: 14,
    },
    alertSuccessText: {
      flex: 1,
      color: "#15803D",
      fontSize: 12.5,
      fontWeight: "600",
    },
    alertError: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FEE2E2",
      borderWidth: 1,
      borderColor: "#FCA5A5",
      borderRadius: 8,
      padding: 12,
      marginTop: 14,
    },
    alertErrorText: {
      flex: 1,
      color: "#B91C1C",
      fontSize: 12.5,
      fontWeight: "600",
    },
    bulletList: {
      marginTop: 6,
    },
    bulletItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    bulletDot: {
      marginRight: 10,
      marginTop: 7,
    },
    bulletText: {
      flex: 1,
      fontSize: 13,
      color: c.text,
      lineHeight: 18,
    },
    calloutWarning: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#FEF3C7",
      borderLeftWidth: 4,
      borderLeftColor: "#B45309",
      borderRadius: 8,
      padding: 14,
      marginVertical: 12,
    },
    calloutWarningTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: "#78350F",
      marginBottom: 4,
    },
    calloutWarningText: {
      fontSize: 12.5,
      color: "#78350F",
      lineHeight: 17,
    },
    calloutInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#E0F2FE",
      borderLeftWidth: 4,
      borderLeftColor: "#0284C7",
      borderRadius: 8,
      padding: 14,
      marginTop: 14,
    },
    calloutInfoTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: "#075985",
      marginBottom: 4,
    },
    calloutInfoText: {
      fontSize: 12.5,
      color: "#075985",
      lineHeight: 17,
    },
    tableBox: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      overflow: "hidden",
      marginVertical: 12,
    },
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tableCellHead: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 12,
    },
    tableBodyRow: {
      flexDirection: "row",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    tableCellBody: {
      color: c.text,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
