import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

interface SectionItem {
  id: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string[];
  callout?: {
    type: "info" | "warning" | "success";
    title: string;
    text: string;
  };
  bullets?: string[];
}

export default function PoliticaPrivacidadScreen() {
  const router = useRouter();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<string>("todas");

  const isSmall = width < 640;
  const isMedium = width >= 640 && width < 1024;
  const contentMaxWidth = Math.min(width - 32, 920);

  const styles = useMemo(() => createStyles(c, isSmall), [c, isSmall]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login" as any);
    }
  };

  const sections: SectionItem[] = [
    {
      id: "responsable",
      badge: "01",
      icon: "business-outline",
      title: "Identidad y Responsable del Tratamiento",
      content: [
        "VITALIA Gestión Clínica Inteligente (en lo sucesivo 'VITALIA'), con domicilio en Carretera del Departamento del D.F. kilómetro 7.5, Ejido de Santa María Atarasquillo, C.P. 52044, Lerma, Estado de México, es la entidad responsable del uso, resguardo, tratamiento y protección de sus datos personales y clínicos recabados a través de esta plataforma digital y sus aplicaciones conexas.",
        "El presente Aviso y Política de Privacidad rige para todos los pacientes, médicos especialistas, personal de enfermería, coordinadores, farmacéuticos y personal administrativo que utilicen nuestros servicios informáticos de salud.",
      ],
      callout: {
        type: "info",
        title: "Compromiso Institucional",
        text: "VITALIA opera bajo los más altos estándares éticos y normativos de confidencialidad médica, cumpliendo con la Ley Federal de Protección de Datos Personales y las normas oficiales aplicables a expedientes clínicos electrónicos (NOM-004-SSA3 y NOM-024-SSA3).",
      },
    },
    {
      id: "datos-recopilados",
      badge: "02",
      icon: "finger-print-outline",
      title: "Datos Personales y Médicos Recopilados",
      content: [
        "Para proporcionar una atención sanitaria segura, ágil e integral, VITALIA procesa diversas categorías de información proporcionadas voluntariamente por los titulares o generadas durante la consulta médica:",
      ],
      bullets: [
        "Datos de Identificación y Contacto: Nombre completo, CURP o identificación oficial, fecha de nacimiento, sexo biológico, estado civil, teléfono de contacto, correo electrónico y domicilio particular.",
        "Datos de Salud y Expediente Clínico (Datos Sensibles): Antecedentes heredo-familiares, antecedentes patológicos y no patológicos, signos vitales, alergias, diagnósticos médicos, notas de evolución, notas de enfermería, resultados de análisis clínicos, prescripciones farmacológicas y planes de tratamiento.",
        "Datos Operativos y de Gestión: Información de citas agendadas, canceladas o reprogramadas, asignación de salas y consultorios, solicitudes de insumos y bitácora de medicamentos suministrados.",
        "Datos Técnicos y de Auditoría: Dirección IP, identificador de dispositivo, sistema operativo, sellos de tiempo de acceso y registros inmutables de modificaciones a los registros clínicos.",
      ],
      callout: {
        type: "warning",
        title: "Tratamiento Especial de Datos de Salud",
        text: "Los datos relativos a su estado de salud presente y futuro son considerados legalmente como 'Datos Personales Sensibles'. Su tratamiento se encuentra sujeto al más riguroso deber de secreto profesional y confidencialidad médica.",
      },
    },
    {
      id: "finalidad",
      badge: "03",
      icon: "git-merge-outline",
      title: "Finalidades del Tratamiento de la Información",
      content: [
        "La información recabada se destina a finalidades estrictamente sanitarias y administrativas imprescindibles para la operatividad de la clínica:",
      ],
      bullets: [
        "Finalidades Primarias Esenciales:",
        "• Integración, consulta, resguardo y actualización del Expediente Clínico Electrónico.",
        "• Asignación eficiente de citas médicas, gestión de listas de espera y avisos de consulta en tiempo real.",
        "• Emisión, firma digital y verificación de recetas médicas y planes farmacológicos.",
        "• Control de inventario médico, administración segura de fármacos y trazabilidad de lotes y salas.",
        "• Identificación inequívoca del paciente y contacto con familiares en situaciones de emergencia médica.",
        "• Cumplimiento riguroso de auditorías médicas y requerimientos de las autoridades sanitarias reguladoras.",
        "Finalidades Secundarias No Esenciales:",
        "• Envío de recordatorios preventivos de salud, seguimiento posterior a la consulta y encuestas breves de satisfacción del servicio.",
      ],
      callout: {
        type: "success",
        title: "Opción de Cancelación Secundaria",
        text: "Si no desea que sus datos se utilicen para finalidades secundarias (recordatorios preventivos o encuestas de calidad), puede solicitarlo en cualquier momento sin que esto afecte su atención clínica.",
      },
    },
    {
      id: "seguridad",
      badge: "04",
      icon: "shield-checkmark-outline",
      title: "Seguridad y Protección Tecnológica de los Datos",
      content: [
        "En VITALIA implementamos una arquitectura de seguridad por capas (Defense in Depth) con controles técnicos, físicos y administrativos diseñados específicamente para infraestructuras críticas de salud:",
      ],
      bullets: [
        "Cifrado Robusto: Transmisión de datos protegida mediante TLS 1.3 con certificados SSL de grado médico y almacenamiento en reposo cifrado bajo el estándar AES de 256 bits.",
        "Control de Acceso Basado en Roles (RBAC): Cada usuario cuenta con privilegios estrictamente limitados a su función clínica (médicos, enfermeros, coordinadores o recepcionistas) bajo el principio de privilegio mínimo.",
        "Bitácora Inmutable de Auditoría: Cada visualización, edición o emisión de recetas queda registrada con huella digital de usuario, fecha y hora exacta para prevenir accesos no autorizados.",
        "Aislamiento y Respaldos Frecuentes: Copias de seguridad automáticas, encriptadas y replicadas geográficamente para garantizar la continuidad ininterrumpida de las operaciones hospitalarias.",
      ],
    },
    {
      id: "transferencias",
      badge: "05",
      icon: "swap-horizontal-outline",
      title: "Transferencia y Secreto Médico de la Información",
      content: [
        "VITALIA mantiene un estricto principio de no comercialización. Bajo ninguna circunstancia vendemos, alquilamos ni transferimos sus datos personales o historiales médicos a empresas publicitarias, aseguradoras o terceros comerciales con fines de lucro.",
        "Las transferencias de datos únicamente se realizarán bajo los siguientes supuestos legales:",
      ],
      bullets: [
        "A laboratorios clínicos, gabinetes radiológicos o especialistas interconsultantes expresamente requeridos por su médico tratante.",
        "A autoridades sanitarias o judiciales competentes, únicamente cuando medie requerimiento oficial fundado y motivado por ley.",
        "En situaciones de urgencia médica en las que la vida, salud o integridad física del paciente se encuentre en peligro inminente y este no pueda otorgar su consentimiento.",
      ],
    },
    {
      id: "derechos-arco",
      badge: "06",
      icon: "key-outline",
      title: "Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)",
      content: [
        "Usted como titular de la información —o su representante legal debidamente acreditado— goza del derecho inalienable de ejercer en cualquier momento los derechos ARCO:",
      ],
      bullets: [
        "Acceso: Conocer qué datos personales y clínicos obran en nuestros sistemas y el detalle de su tratamiento.",
        "Rectificación: Solicitar la corrección de datos inexactos, incompletos o desactualizados.",
        "Cancelación: Solicitar la supresión de sus datos personales cuando considere que no están siendo utilizados conforme a los principios legales.",
        "Oposición: Oponerse al tratamiento de sus datos para finalidades específicas como encuestas o notificaciones no asistenciales.",
      ],
      callout: {
        type: "warning",
        title: "Excepción Legal en Expedientes Clínicos",
        text: "De acuerdo con la Norma Oficial NOM-004-SSA3, las notas y valoraciones médicas emitidas por profesionales no pueden ser eliminadas ni alteradas arbitrariamente, debiendo conservarse intactas en el expediente clínico por razones de responsabilidad médica y legal.",
      },
    },
    {
      id: "procedimiento-arco",
      badge: "07",
      icon: "mail-open-outline",
      title: "Procedimiento para Ejercer los Derechos ARCO",
      content: [
        "Para iniciar una solicitud ARCO o revocar el consentimiento previamente otorgado, el titular deberá enviar un correo electrónico formal a nuestro Oficial de Privacidad a la dirección:",
        "vitaliaorg98@gmail.com",
        "Su solicitud deberá incluir: nombre completo del titular, copia digital de identificación oficial, descripción clara de los datos objeto de la solicitud, el derecho específico que desea ejercer y un correo o número de contacto para recibir notificaciones. Nuestro equipo responderá formalmente en un plazo máximo de 20 días hábiles.",
      ],
    },
    {
      id: "conservacion",
      badge: "08",
      icon: "time-outline",
      title: "Plazos de Conservación y Archivo Médico",
      content: [
        "En estricto cumplimiento con la legislación sanitaria mexicana e internacional, los expedientes clínicos electrónicos deben ser conservados por un período mínimo obligatorio de 5 (cinco) años, contados a partir de la fecha del último acto médico registrado.",
        "Una vez transcurrido este plazo legal y siempre que no exista litigio pendiente ni requerimiento de autoridad, los datos podrán ser anonimizados con fines estadísticos o archivados bajo custodia de máxima seguridad.",
      ],
    },
    {
      id: "modificaciones",
      badge: "09",
      icon: "refresh-outline",
      title: "Actualizaciones a esta Política de Privacidad",
      content: [
        "VITALIA se reserva el derecho de modificar o actualizar este documento para adaptarlo a nuevas disposiciones legislativas, políticas institucionales o mejoras en la infraestructura tecnológica de la plataforma.",
        "Cualquier modificación sustancial será notificada de manera visible mediante un aviso en la pantalla de inicio de sesión de la aplicación y a través del portal oficial con al menos 15 días de anticipación a su entrada en vigor.",
      ],
    },
    {
      id: "contacto",
      badge: "10",
      icon: "chatbubble-ellipses-outline",
      title: "Oficial de Protección de Datos y Contacto",
      content: [
        "Si tiene preguntas, inquietudes o quejas respecto al tratamiento de sus datos personales o el contenido de esta política, puede comunicarse directamente con nuestro Comité de Seguridad y Ética Digital:",
      ],
      bullets: [
        "Correo Institucional: vitaliaorg98@gmail.com",
      ],
    },
  ];

  const highlights = [
    {
      icon: "shield-checkmark" as const,
      color: "#0F766E",
      title: "Cifrado Militar",
      desc: "TLS 1.3 y AES-256 en reposo y tránsito.",
    },
    {
      icon: "medkit" as const,
      color: "#2DD4BF",
      title: "Secreto Clínico",
      desc: "Acceso exclusivo a personal médico autorizado.",
    },
    {
      icon: "document-text" as const,
      color: "#0284C7",
      title: "NOM-004-SSA3",
      desc: "Cumplimiento estricto de expediente clínico.",
    },
    {
      icon: "lock-closed" as const,
      color: "#16A34A",
      title: "Derechos ARCO",
      desc: "Control total sobre tus datos personales.",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={c.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.bg}
      />

      {/* ============================================================
          HEADER LIMPIO Y ELEGANTE
      ============================================================ */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, Platform.OS === "android" ? 14 : 12),
          },
        ]}
      >
        <View style={styles.headerContent}>
          {/* Botón de retroceso */}
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={[styles.backButton, POINTER]}
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla anterior"
          >
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </TouchableOpacity>

          {/* Título de la cabecera */}
          <View style={styles.headerTitles}>
            <Text style={styles.headerKicker}>SISTEMA CLÍNICO VITALIA</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              Política de Privacidad
            </Text>
          </View>

          {/* Indicador de estado / insignia de confianza */}
          <View style={styles.headerBadge}>
            <Ionicons
              name="checkmark-circle"
              size={13}
              color="#16A34A"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.headerBadgeText}>Vigente 2026</Text>
          </View>
        </View>
      </View>

      {/* ============================================================
          CONTENEDOR PRINCIPAL CON SCROLLVIEW
      ============================================================ */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainWrapper, { maxWidth: contentMaxWidth }]}>
          {/* Hero Banner de Confianza y Resguardo */}
          <LinearGradient
            colors={[c.primary, c.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroPill}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color="#2DD4BF"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.heroPillText}>
                  Protección de Datos Sanitarios y Personales
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                Compromiso con la Confidencialidad y el Secreto Médico
              </Text>
              <Text style={styles.heroDescription}>
                En VITALIA, salvaguardamos cada expediente clínico, receta, cita e
                inventario médico bajo los estándares internacionales más rigurosos
                de seguridad digital y normatividad hospitalaria.
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metaItemText}>Última revisión: Octubre 2026</Text>
                </View>
                <View style={styles.metaSeparator} />
                <View style={styles.metaItem}>
                  <Ionicons name="shield-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metaItemText}>Certificación ISO/NOM Clínica</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          {/* Secciones de la Política de Privacidad */}
          <View style={styles.sectionsContainer}>
            {sections.map((section) => (
              <View key={section.id} style={styles.sectionCard}>
                {/* Cabecera de la Sección */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>{section.badge}</Text>
                  </View>
                  <View style={styles.sectionTitleWrap}>
                    <View style={styles.sectionIconRow}>
                      <Ionicons
                        name={section.icon}
                        size={17}
                        color={c.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.sectionCategory}>SECCIÓN NORMATIVA</Text>
                    </View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                </View>

                {/* Contenido / Párrafos */}
                <View style={styles.sectionBody}>
                  {section.content.map((p, idx) => (
                    <Text key={idx} style={styles.paragraph}>
                      {p}
                    </Text>
                  ))}

                  {/* Viñetas si existen */}
                  {section.bullets && (
                    <View style={styles.bulletsWrap}>
                      {section.bullets.map((b, bIdx) => {
                        const isSubHeader =
                          b.startsWith("Finalidades Primarias") ||
                          b.startsWith("Finalidades Secundarias");
                        return isSubHeader ? (
                          <Text key={bIdx} style={styles.bulletSubHeader}>
                            {b}
                          </Text>
                        ) : (
                          <View key={bIdx} style={styles.bulletRow}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{b}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Cuadro destacado / Callout */}
                  {section.callout && (
                    <View
                      style={[
                        styles.calloutCard,
                        section.callout.type === "warning" && styles.calloutWarning,
                        section.callout.type === "info" && styles.calloutInfo,
                        section.callout.type === "success" && styles.calloutSuccess,
                      ]}
                    >
                      <View style={styles.calloutHeader}>
                        <Ionicons
                          name={
                            section.callout.type === "warning"
                              ? "alert-circle"
                              : section.callout.type === "success"
                              ? "checkmark-circle"
                              : "information-circle"
                          }
                          size={18}
                          color={
                            section.callout.type === "warning"
                              ? "#D97706"
                              : section.callout.type === "success"
                              ? "#16A34A"
                              : c.primary
                          }
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.calloutTitle,
                            section.callout.type === "warning" && { color: "#D97706" },
                            section.callout.type === "success" && { color: "#16A34A" },
                            section.callout.type === "info" && { color: c.primary },
                          ]}
                        >
                          {section.callout.title}
                        </Text>
                      </View>
                      <Text style={styles.calloutText}>{section.callout.text}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Tarjeta de Contacto y Dudas */}
          <View style={styles.supportCard}>
            <View style={styles.supportIconWrap}>
              <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.supportTitle}>¿Preguntas sobre tus datos de salud?</Text>
              <Text style={styles.supportSubtitle}>
                Nuestro Oficial de Protección de Datos está disponible para atender cualquier
                solicitud de información o aclaración sobre tu expediente.
              </Text>
              <TouchableOpacity
                onPress={() => handleBack()}
                activeOpacity={0.8}
                style={[styles.supportButton, POINTER]}
                accessibilityRole="button"
                accessibilityLabel="Entendido, volver a la aplicación"
              >
                <Text style={styles.supportButtonText}>Entendido, volver a la aplicación</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pie de página institucional */}
          <View style={styles.footer}>
            <View style={styles.footerBrandRow}>
              <View style={styles.footerLogoDot} />
              <Text style={styles.footerBrandName}>VITALIA</Text>
              <Text style={styles.footerBrandSub}>· Gestión Clínica Inteligente</Text>
            </View>
            <Text style={styles.footerLegal}>
              Documento expedido en cumplimiento de la Ley Federal de Protección de Datos
              Personales en Posesión de los Particulares (LFPDPPP) y las Normas Oficiales Mexicanas
              de Salud NOM-004-SSA3-2012 y NOM-024-SSA3-2012.
            </Text>
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} VITALIA. Todos los derechos reservados.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   ESTILOS OPTIMIZADOS PARA WEB Y MÓVIL
============================================================ */
function createStyles(c: Theme, isSmall: boolean) {
  const isDark = c.mode === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },

    /* ---------- Cabecera ---------- */
    headerWrapper: {
      backgroundColor: isDark ? c.card : "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 3,
      zIndex: 10,
    },
    headerContent: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: isSmall ? 14 : 24,
      maxWidth: 1100,
      width: "100%",
      alignSelf: "center",
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,76,69,0.06)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    headerTitles: {
      flex: 1,
      justifyContent: "center",
    },
    headerKicker: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: c.primary,
      textTransform: "uppercase",
    },
    headerTitle: {
      fontSize: isSmall ? 16 : 18,
      fontWeight: "800",
      color: c.text,
      letterSpacing: -0.2,
    },
    headerBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(22,163,74,0.14)" : "#ECFDF5",
      borderColor: isDark ? "rgba(22,163,74,0.3)" : "#A7F3D0",
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#16A34A",
    },

    /* ---------- Scroll y Contenedor Principal ---------- */
    scrollContent: {
      paddingHorizontal: isSmall ? 12 : 20,
      paddingTop: isSmall ? 16 : 24,
      alignItems: "center",
    },
    mainWrapper: {
      width: "100%",
    },

    /* ---------- Banner Hero ---------- */
    heroBanner: {
      borderRadius: 22,
      paddingVertical: isSmall ? 22 : 30,
      paddingHorizontal: isSmall ? 18 : 28,
      flexDirection: isSmall ? "column" : "row",
      alignItems: isSmall ? "flex-start" : "center",
      marginBottom: 20,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 6,
    },
    heroIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: isSmall ? 0 : 20,
      marginBottom: isSmall ? 14 : 0,
    },
    heroTextWrap: {
      flex: 1,
    },
    heroPill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 10,
    },
    heroPillText: {
      color: "#CCFBF1",
      fontSize: 11.5,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: isSmall ? 20 : 24,
      fontWeight: "800",
      lineHeight: isSmall ? 26 : 30,
      marginBottom: 8,
    },
    heroDescription: {
      color: "rgba(255,255,255,0.88)",
      fontSize: isSmall ? 13 : 14.5,
      lineHeight: isSmall ? 19 : 22,
      marginBottom: 14,
    },
    heroMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    metaItemText: {
      fontSize: 12,
      color: "rgba(255,255,255,0.78)",
      fontWeight: "600",
    },
    metaSeparator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.4)",
    },

    /* ---------- Tarjetas de Resumen (Highlights) ---------- */
    highlightsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    highlightCard: {
      flexGrow: 1,
      flexBasis: isSmall ? "100%" : "23%",
      minWidth: isSmall ? "100%" : 190,
      backgroundColor: isDark ? c.card : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.15 : 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    highlightIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    highlightTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      marginBottom: 4,
    },
    highlightDesc: {
      fontSize: 12,
      lineHeight: 17,
      color: c.muted,
    },

    /* ---------- Tarjeta de Introducción ---------- */
    introCard: {
      backgroundColor: isDark ? "rgba(15,76,69,0.12)" : "rgba(204,251,241,0.35)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(45,212,191,0.25)" : "rgba(45,212,191,0.4)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    introHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    introCardTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.primary,
    },
    introCardText: {
      fontSize: 13,
      lineHeight: 20,
      color: isDark ? "#CBD5E1" : "#334155",
    },

    /* ---------- Secciones Normativas ---------- */
    sectionsContainer: {
      gap: 18,
      marginBottom: 26,
    },
    sectionCard: {
      backgroundColor: isDark ? c.card : "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: isSmall ? 18 : 24,
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 10,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 14,
    },
    sectionBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(45,212,191,0.16)" : "rgba(15,76,69,0.08)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(45,212,191,0.3)" : "rgba(15,76,69,0.15)",
    },
    sectionBadgeText: {
      fontSize: 14,
      fontWeight: "900",
      color: c.primary,
    },
    sectionTitleWrap: {
      flex: 1,
    },
    sectionIconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 3,
    },
    sectionCategory: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 1.1,
      color: c.muted,
    },
    sectionTitle: {
      fontSize: isSmall ? 17 : 19,
      fontWeight: "800",
      color: c.text,
      lineHeight: isSmall ? 23 : 26,
    },
    sectionBody: {
      gap: 12,
    },
    paragraph: {
      fontSize: isSmall ? 13.5 : 14.5,
      lineHeight: isSmall ? 21 : 23,
      color: isDark ? "#CBD5E1" : "#334155",
      textAlign: "justify",
    },
    bulletsWrap: {
      marginTop: 4,
      gap: 10,
      paddingLeft: 4,
    },
    bulletSubHeader: {
      fontSize: 13.5,
      fontWeight: "800",
      color: c.primary,
      marginTop: 6,
      marginBottom: 2,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
      marginTop: 8,
      marginRight: 10,
    },
    bulletText: {
      flex: 1,
      fontSize: isSmall ? 13 : 14,
      lineHeight: isSmall ? 20 : 22,
      color: isDark ? "#CBD5E1" : "#475569",
    },

    /* ---------- Callouts / Cuadros Destacados ---------- */
    calloutCard: {
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      marginTop: 8,
    },
    calloutInfo: {
      backgroundColor: isDark ? "rgba(15,76,69,0.18)" : "#F0FDFA",
      borderColor: isDark ? "rgba(45,212,191,0.3)" : "#CCFBF1",
    },
    calloutWarning: {
      backgroundColor: isDark ? "rgba(217,119,6,0.14)" : "#FFFBEB",
      borderColor: isDark ? "rgba(217,119,6,0.3)" : "#FEF3C7",
    },
    calloutSuccess: {
      backgroundColor: isDark ? "rgba(22,163,74,0.14)" : "#F0FDF4",
      borderColor: isDark ? "rgba(22,163,74,0.3)" : "#DCFCE7",
    },
    calloutHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    calloutTitle: {
      fontSize: 13,
      fontWeight: "800",
    },
    calloutText: {
      fontSize: 12.5,
      lineHeight: 19,
      color: isDark ? "#CBD5E1" : "#334155",
    },

    /* ---------- Tarjeta de Soporte y Retorno ---------- */
    supportCard: {
      backgroundColor: isDark ? c.card : "#FFFFFF",
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 20,
      padding: isSmall ? 18 : 24,
      flexDirection: isSmall ? "column" : "row",
      alignItems: isSmall ? "flex-start" : "center",
      gap: 16,
      marginBottom: 28,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    supportIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    supportTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginBottom: 4,
    },
    supportSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: c.muted,
      marginBottom: 14,
    },
    supportButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: isSmall ? "stretch" : "flex-start",
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 18,
    },
    supportButtonText: {
      color: "#FFFFFF",
      fontSize: 13.5,
      fontWeight: "700",
    },

    /* ---------- Footer Institucional ---------- */
    footer: {
      alignItems: "center",
      paddingTop: 16,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    footerLogoDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
      marginRight: 8,
    },
    footerBrandName: {
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1.5,
      color: c.text,
    },
    footerBrandSub: {
      fontSize: 12,
      fontWeight: "600",
      color: c.muted,
      marginLeft: 4,
    },
    footerLegal: {
      fontSize: 11,
      lineHeight: 16,
      color: c.muted,
      textAlign: "center",
      maxWidth: 620,
      marginBottom: 8,
    },
    footerCopyright: {
      fontSize: 11,
      fontWeight: "600",
      color: c.muted,
    },
  });
}
