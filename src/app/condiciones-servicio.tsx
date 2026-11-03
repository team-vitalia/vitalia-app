import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
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

export default function CondicionesServicioScreen() {
  const router = useRouter();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

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

  const sections: SectionItem[] = [
    {
      id: "aceptacion",
      badge: "01",
      icon: "checkmark-done-circle-outline",
      title: "Aceptación de las Condiciones y Ámbito de Aplicación",
      content: [
        "Las presentes Condiciones del Servicio (en lo sucesivo 'Condiciones') constituyen un acuerdo legal vinculante entre cualquier persona física o moral (usuario, paciente, médico, enfermero, coordinador, farmacéutico o administrador) y VITALIA Gestión Clínica Inteligente.",
        "Al acceder, registrarse o utilizar cualquiera de las funciones de la plataforma VITALIA, el usuario manifiesta su conformidad plena e incondicional con estos términos. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, deberá abstenerse de utilizar el sistema.",
      ],
      callout: {
        type: "info",
        title: "Capacidad Legal y Entorno Sanitario",
        text: "El acceso a módulos asistenciales y de prescripción médica está estrictamente reservado a profesionales facultados con título y cédula profesional vigente para ejercer la medicina en los términos de la legislación sanitaria aplicable.",
      },
    },
    {
      id: "naturaleza-servicio",
      badge: "02",
      icon: "medkit-outline",
      title: "Naturaleza del Servicio y No Sustitución del Criterio Médico",
      content: [
        "VITALIA es una plataforma tecnológica avanzada diseñada como herramienta de gestión hospitalaria, expediente clínico electrónico, agendamiento de citas, control de inventario médico y trazabilidad clínica.",
        "Bajo ninguna circunstancia VITALIA presta servicios de diagnóstico médico automatizado ni sustituye la valoración clínica, exploración física, pericia o juicio facultativo independiente del médico tratante.",
      ],
      callout: {
        type: "warning",
        title: "Aviso Crítico de Emergencias Médicas",
        text: "VITALIA NO es un servicio de respuesta inmediata ante emergencias de vida o muerte. En caso de una urgencia médica grave, el paciente o sus acompañantes deben comunicarse de inmediato con el número de emergencias 911 o acudir a la sala de urgencias hospitalaria más cercana.",
      },
    },
    {
      id: "cuentas-seguridad",
      badge: "03",
      icon: "person-circle-outline",
      title: "Cuentas de Usuario, Roles y Deber de Custodia",
      content: [
        "El acceso a la plataforma opera bajo un modelo de Control de Acceso Basado en Roles (RBAC), el cual limita las vistas y acciones a las funciones autorizadas para cada perfil asistencial o administrativo.",
      ],
      bullets: [
        "Intransferibilidad de Credenciales: Cada cuenta es estrictamente personal e intransferible. Queda prohibido compartir credenciales, contraseñas o tokens de autenticación entre colegas o personal auxiliar.",
        "Custodia Segura: El usuario es el único responsable de conservar la confidencialidad de su contraseña y de todas las actividades registradas bajo su sesión de trabajo.",
        "Notificación Inmediata: Ante cualquier sospecha de vulneración, pérdida o acceso indebido a su cuenta, el usuario debe dar aviso inmediato al administrador de la clínica y solicitar el bloqueo preventivo.",
        "Cierre Automático: Por protocolos de seguridad clínica, las sesiones inactivas serán desconectadas automáticamente tras períodos prolongados sin interacción.",
      ],
    },
    {
      id: "expediente-clinico",
      badge: "04",
      icon: "document-text-outline",
      title: "Expediente Clínico Electrónico y Deberes Sanitarios",
      content: [
        "La captura, resguardo, consulta y actualización del Expediente Clínico Electrónico dentro de VITALIA se rige por las Normas Oficiales Mexicanas NOM-004-SSA3-2012 y NOM-024-SSA3-2012, así como por los estándares internacionales de interoperabilidad en salud.",
      ],
      bullets: [
        "Veracidad Asistencial: Los profesionales de la salud asumen plena responsabilidad ética y legal sobre la exactitud de los antecedentes, signos vitales, diagnósticos y notas clínicas registradas.",
        "Inmutabilidad de Notas Médicas: Una vez guardada y firmada una nota médica, no podrá ser borrada ni modificada sin dejar rastro de fe de erratas conforme a la legislación sanitaria.",
        "Trazabilidad de Consultas: El sistema conserva una bitácora inalterable que documenta qué usuario consultó qué expediente, con fecha, hora exacta y motivo de consulta.",
      ],
      callout: {
        type: "success",
        title: "Custodia Compartida",
        text: "El paciente es el titular exclusivo de sus datos de salud, mientras que la clínica o institución médica es la depositaria y custodia legal de los expedientes conforme a la normativa de salud vigente.",
      },
    },
    {
      id: "prescripciones",
      badge: "05",
      icon: "bandage-outline",
      title: "Prescripciones Médicas Digitales y Farmacia",
      content: [
        "La emisión de recetas y planes terapéuticos dentro de VITALIA requiere que el facultativo cuente con sus credenciales médicas debidamente validadas en el sistema.",
      ],
      bullets: [
        "Requisitos de Validez: Cada receta emitida consigna nombre del médico, cédula profesional, especialidad, firma electrónica o sello criptográfico, diagnóstico presuntivo y posología clara.",
        "Control de Inventario y Almacén: Las solicitudes de suministro, despacho en farmacia y aplicación de medicamentos en sala quedan enlazadas a la bitácora del paciente para evitar errores de medicación.",
        "Prohibición de Mal Uso: Queda terminantemente prohibido generar recetas sin previa consulta o acto médico que las justifique bajo pena de cancelación inmediata de la cuenta y notificación a las autoridades pertinentes.",
      ],
    },
    {
      id: "citas-agenda",
      badge: "06",
      icon: "calendar-outline",
      title: "Agendamiento, Citas y Gestión de Salas",
      content: [
        "El módulo de agenda permite la programación organizada de consultas de primera vez, citas de seguimiento y asignación de salas especializadas.",
      ],
      bullets: [
        "Puntualidad y Espera: Los pacientes deben presentarse con la anticipación solicitada para registro en recepción y toma de signos vitales.",
        "Cancelaciones y Reasignación: Para optimizar el tiempo médico y la disponibilidad para otros pacientes, las cancelaciones deben realizarse con al menos 24 horas de antelación.",
        "Notificaciones y Recordatorios: VITALIA podrá enviar avisos automáticos de confirmación por correo electrónico o mensajería con propósitos exclusivamente asistenciales.",
      ],
    },
    {
      id: "propiedad-intelectual",
      badge: "07",
      icon: "cube-outline",
      title: "Propiedad Intelectual y Licencia de Software",
      content: [
        "Todos los elementos que integran la plataforma VITALIA —incluyendo software, arquitectura de bases de datos, código fuente, interfaces gráficas, logotipos, iconos y marcas registradas— son propiedad exclusiva de VITALIA o de sus respectivos licenciantes.",
        "Se concede al usuario una licencia limitada, no exclusiva, intransferible y revocable para utilizar el software exclusivamente con el fin de gestionar la atención médica dentro de su clínica o consultar su expediente personal.",
      ],
      callout: {
        type: "warning",
        title: "Restricciones de Uso",
        text: "Queda estrictamente prohibida la ingeniería inversa, descompilación, extracción de datos masiva (scraping), copia de interfaz o desarrollo de obras derivadas sin autorización expresa por escrito de VITALIA.",
      },
    },
    {
      id: "disponibilidad",
      badge: "08",
      icon: "server-outline",
      title: "Disponibilidad del Servicio, Respaldo y Mantenimiento",
      content: [
        "VITALIA despliega su infraestructura en centros de datos de clase mundial con redundancia geográfica, buscando mantener una tasa de disponibilidad continua del 99.9% (SLA).",
        "Sin embargo, el servicio puede experimentar interrupciones programadas para mantenimiento preventivo, actualizaciones de seguridad crítica o fallas imprevisibles atribuibles a proveedores de telecomunicaciones ajenos a nuestra red.",
      ],
      bullets: [
        "Ventanas de Mantenimiento: Siempre que resulte técnicamente viable, las labores de mantenimiento se realizarán en horarios de baja demanda clínica con notificación previa.",
        "Respaldos Automatizados: Se efectúan copias de seguridad incrementales periódicas para salvaguardar la integridad de la información médica ante cualquier eventualidad técnica.",
      ],
    },
    {
      id: "rescisión",
      badge: "09",
      icon: "alert-circle-outline",
      title: "Suspensión de Cuenta, Infracciones y Rescisión",
      content: [
        "VITALIA se reserva el derecho de suspender o rescindir el acceso a cualquier usuario de forma temporal o definitiva ante cualquiera de las siguientes conductas:",
      ],
      bullets: [
        "Uso indebido de la plataforma, falsificación de credenciales sanitarias o violación del secreto profesional médico.",
        "Intentos deliberados de vulnerar la seguridad, inyectar código malicioso o acceder a expedientes ajenos a su asignación clínica.",
        "Conductas fraudulentas en el registro de medicamentos, citas o recetas.",
        "La suspensión o baja del usuario en la plataforma no extingue la obligación legal de conservar los expedientes clínicos ya generados, los cuales permanecerán bajo custodia sanitaria en cumplimiento de la ley.",
      ],
    },
  ];

  const highlights = [
    {
      icon: "shield-checkmark" as const,
      color: "#0F766E",
      title: "Marco Legal Clínico",
      desc: "Cumplimiento con NOM-004 y NOM-024 de expediente.",
    },
    {
      icon: "medkit" as const,
      color: "#2DD4BF",
      title: "Criterio Facultativo",
      desc: "El médico retiene el juicio clínico final.",
    },
    {
      icon: "key" as const,
      color: "#0284C7",
      title: "Cuentas Blindadas",
      desc: "Acceso basado en roles y custodia intransferible.",
    },
    {
      icon: "server" as const,
      color: "#16A34A",
      title: "Continuidad 99.9%",
      desc: "Copias de seguridad y disponibilidad hospitalaria.",
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
              Condiciones del Servicio
            </Text>
          </View>

          {/* Indicador de vigencia */}
          <View style={styles.headerBadge}>
            <Ionicons
              name="document-text"
              size={13}
              color="#0284C7"
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
          {/* Hero Banner de Marco Legal */}
          <LinearGradient
            colors={[c.primary, c.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="document-text" size={32} color="#FFFFFF" />
            </View>

            <View style={styles.heroTextWrap}>
              <View style={styles.heroPill}>
                <Ionicons
                  name="shield-checkmark"
                  size={12}
                  color="#2DD4BF"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.heroPillText}>
                  Términos de Uso y Marco Legal Clínico
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                Términos y Condiciones de Uso de la Plataforma VITALIA
              </Text>
              <Text style={styles.heroDescription}>
                Directrices normativas, derechos, deberes de confidencialidad y
                responsabilidades ético-médicas que rigen el uso del software clínico
                para profesionales, personal administrativo y pacientes.
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metaItemText}>Última revisión: Octubre 2026</Text>
                </View>
                <View style={styles.metaSeparator} />
                <View style={styles.metaItem}>
                  <Ionicons name="shield-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metaItemText}>Acreditación Hospitalaria</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Tarjeta de enlace cruzado a Política de Privacidad */}
          <View style={styles.privacyLinkBanner}>
            <View style={styles.privacyLinkLeft}>
              <Ionicons name="shield-checkmark" size={24} color={c.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyBannerTitle}>¿Buscas cómo protegemos tus datos médicos?</Text>
                <Text style={styles.privacyBannerDesc}>
                  Para conocer el tratamiento de datos personales, expedientes y derechos ARCO, consulta nuestra política.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/politica-privacidad" as any)}
              activeOpacity={0.75}
              style={[styles.privacyBannerBtn, POINTER]}
              accessibilityRole="link"
              accessibilityLabel="Ir a Política de Privacidad"
            >
              <Text style={styles.privacyBannerBtnText}>Ver Privacidad</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Secciones de las Condiciones del Servicio */}
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
                      <Text style={styles.sectionCategory}>TÉRMINO CONTRACTUAL</Text>
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
                      {section.bullets.map((b, bIdx) => (
                        <View key={bIdx} style={styles.bulletRow}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{b}</Text>
                        </View>
                      ))}
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

          {/* Tarjeta de Soporte Legal y Retorno */}
          <View style={styles.supportCard}>
            <View style={styles.supportIconWrap}>
              <Ionicons name="briefcase" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.supportTitle}>¿Dudas sobre estos términos o licencias?</Text>
              <Text style={styles.supportSubtitle}>
                El departamento jurídico y de soporte técnico de VITALIA atiende consultas sobre convenios clínicos e interoperabilidad.
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
              Documento contractual de uso de software hospitalario y apego normativo a la Ley General de Salud,
              NOM-004-SSA3-2012 y NOM-024-SSA3-2012 de Sistemas de Información de Registro Electrónico para la Salud.
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
      backgroundColor: isDark ? "rgba(2,132,199,0.14)" : "#F0F9FF",
      borderColor: isDark ? "rgba(2,132,199,0.3)" : "#BAE6FD",
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#0284C7",
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

    /* ---------- Banner de enlace cruzado a Privacidad ---------- */
    privacyLinkBanner: {
      backgroundColor: isDark ? "rgba(15,76,69,0.14)" : "rgba(204,251,241,0.4)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(45,212,191,0.25)" : "rgba(45,212,191,0.45)",
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      flexDirection: isSmall ? "column" : "row",
      alignItems: isSmall ? "flex-start" : "center",
      justifyContent: "space-between",
      gap: 12,
    },
    privacyLinkLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    privacyBannerTitle: {
      fontSize: 13.5,
      fontWeight: "800",
      color: c.primary,
      marginBottom: 2,
    },
    privacyBannerDesc: {
      fontSize: 12,
      lineHeight: 17,
      color: isDark ? "#CBD5E1" : "#475569",
    },
    privacyBannerBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignSelf: isSmall ? "stretch" : "center",
      justifyContent: "center",
    },
    privacyBannerBtnText: {
      color: "#FFFFFF",
      fontSize: 12.5,
      fontWeight: "700",
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
