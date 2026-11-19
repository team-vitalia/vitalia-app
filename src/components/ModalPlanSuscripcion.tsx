import { useTheme, type Theme } from "../theme/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import api, { resolveLandingUrl } from "../services/api";
import { ModalCancelarSuscripcion } from "./ModalCancelarSuscripcion";

export interface PlanItem {
  id: string;
  nombre: string;
  precio: number;
  paypalPlanId: string;
  limitePersonal: number;
  limitePacientes: number;
  incluyeCalendar: boolean;
  incluyeIA: boolean;
  incluyeContratos: boolean;
  caracteristicas: string[];
}

export const CATALOGO_PLANES: PlanItem[] = [
  {
    id: "gratuito",
    nombre: "Gratuito",
    precio: 0,
    paypalPlanId: "",
    limitePersonal: 1,
    limitePacientes: 20,
    incluyeCalendar: false,
    incluyeIA: false,
    incluyeContratos: false,
    caracteristicas: [
      "1 cuenta de doctor",
      "Hasta 20 pacientes al mes",
      "Expedientes clínicos digitales",
      "Agenda de citas básica",
    ],
  },
  {
    id: "basico",
    nombre: "Básico",
    precio: 599,
    paypalPlanId: "P-9JA53339DW996433FNLXJMJA",
    limitePersonal: 3,
    limitePacientes: 100,
    incluyeCalendar: false,
    incluyeIA: false,
    incluyeContratos: false,
    caracteristicas: [
      "Hasta 3 cuentas de personal",
      "Hasta 100 pacientes registrados",
      "Expedientes clínicos digitales",
      "Agenda de citas básica",
    ],
  },
  {
    id: "clinica",
    nombre: "Clínica",
    precio: 1199,
    paypalPlanId: "P-18S21614P2665104JNLXJNKI",
    limitePersonal: 10,
    limitePacientes: 500,
    incluyeCalendar: true,
    incluyeIA: false,
    incluyeContratos: false,
    caracteristicas: [
      "Hasta 10 cuentas de personal",
      "Hasta 500 pacientes registrados",
      "Sincronización con Google Calendar",
      "Notificaciones automáticas",
      "Gestión de salas y equipos",
    ],
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precio: 2199,
    paypalPlanId: "P-32342459V8640593NNLXJN7A",
    limitePersonal: 20,
    limitePacientes: 1500,
    incluyeCalendar: true,
    incluyeIA: true,
    incluyeContratos: false,
    caracteristicas: [
      "Hasta 20 cuentas de personal",
      "Hasta 1,500 pacientes registrados",
      "Asistente con Inteligencia Artificial (100 peticiones/mes)",
      "Sincronización con Google Calendar",
      "Reportes analíticos avanzados",
    ],
  },
  {
    id: "empresarial",
    nombre: "Empresarial",
    precio: 4499,
    paypalPlanId: "P-3BM73023B1884583RNLXJOSQ",
    limitePersonal: 30,
    limitePacientes: 5000,
    incluyeCalendar: true,
    incluyeIA: true,
    incluyeContratos: true,
    caracteristicas: [
      "Hasta 30 cuentas de personal",
      "Hasta 5,000 pacientes registrados",
      "Asistente IA sin límite restrictivo (500 peticiones/mes)",
      "Gestión y firma de Contratos médicos",
      "Soporte prioritario y multi-sucursal",
    ],
  },
];

const obtenerLandingUrl = resolveLandingUrl;

interface ModalPlanSuscripcionProps {
  visible: boolean;
  onClose: () => void;
}

export function ModalPlanSuscripcion({
  visible,
  onClose,
}: ModalPlanSuscripcionProps) {
  const c = useTheme();
  const isDark = c.mode === "dark";
  const styles = useMemo(() => createStyles(c), [c]);
  const { usuario, clinica, planActual, recargarSesion } = useAuth();
  const [actualizando, setActualizando] = useState(false);
  const [vinculandoManual, setVinculandoManual] = useState(false);
  const [subscriptionIdInput, setSubscriptionIdInput] = useState("");
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);
  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);

  const nombreNormalizado = (planActual?.nombre_plan || "Básico").toLowerCase().trim();
  const esAdmin = (usuario as any)?.rol_id_FK === 1 || (usuario as any)?.rol?.id_PK === 1 || (usuario as any)?.is_superadmin || (usuario as any)?.es_titular;
  const esGratuito = nombreNormalizado === "gratuito";

  const indiceActual = CATALOGO_PLANES.findIndex((p) =>
    p.nombre.toLowerCase().trim() === nombreNormalizado || p.id === nombreNormalizado
  );

  const planActualDetalle = indiceActual >= 0 ? CATALOGO_PLANES[indiceActual] : CATALOGO_PLANES[0];
  const planesSuperiores = indiceActual >= 0 ? CATALOGO_PLANES.slice(indiceActual + 1) : CATALOGO_PLANES.slice(1);
  const siguientePlan = planesSuperiores.length > 0 ? planesSuperiores[0] : null;

  const handleIrAPagar = (plan: PlanItem) => {
    const baseUrl = obtenerLandingUrl();
    const clinicaId = clinica?.id || (usuario as any)?.clinica_id_FK || (usuario as any)?.clinica_id || "";
    const correoAdmin = usuario?.correo_electronico || usuario?.correo || "";
    const nombreClinica = clinica?.nombre_comercial || "";
    const nombreAdmin = usuario?.nombre || "";

    const params = new URLSearchParams({
      plan_id: plan.paypalPlanId,
      clinica_id: String(clinicaId),
      correo: correoAdmin,
      nombre_clinica: nombreClinica,
      nombre_admin: nombreAdmin,
      modo: "upgrade",
    });

    const urlCheckout = `${baseUrl}/registro?${params.toString()}`;

    if (Platform.OS === "web") {
      window.open(urlCheckout, "_blank");
    } else {
      Linking.openURL(urlCheckout).catch(() => {});
    }

    setMensajeEstado(
      `Se ha abierto PayPal para actualizar tu clínica (${nombreClinica || "actual"}) al Plan ${plan.nombre}. Al concluir tu pago, pulsa 'Sincronizar Plan' o ingresa tu ID de suscripción abajo.`
    );
  };

  const handleSincronizarPlan = async () => {
    setActualizando(true);
    setMensajeEstado(null);

    const planPrevio = (planActual?.nombre_plan || "Básico").toLowerCase().trim();

    try {
      await recargarSesion();

      const res = await api.get("/api/auth/me");
      const planActualServidor = res.data?.clinica?.plan_actual?.nombre_plan || "Básico";
      const planActualNorm = planActualServidor.toLowerCase().trim();

      if (planActualNorm !== planPrevio) {
        setMensajeEstado(`¡Plan actualizado y sincronizado exitosamente al Plan ${planActualServidor}!`);
      } else {
        setMensajeEstado(
          `Tu clínica continúa registrada en el Plan ${planActualServidor}. Si completaste tu pago en PayPal, ingresa el ID de Suscripción (ej. I-XXXXX) en la casilla de vinculación manual.`
        );
      }
    } catch {
      setMensajeEstado("No se pudo conectar con el servidor para sincronizar. Intenta de nuevo.");
    } finally {
      setActualizando(false);
    }
  };

  const handleVincularManual = async () => {
    const subIdLimpio = subscriptionIdInput.trim();
    if (!subIdLimpio) {
      setMensajeEstado("Ingresa el ID de Suscripción de PayPal (inicia con 'I-') que te proporcionó PayPal.");
      return;
    }

    setVinculandoManual(true);
    setMensajeEstado(null);

    try {
      const clinicaId = clinica?.id;
      const correoAdmin = usuario?.correo_electronico || usuario?.correo || "";
      const planDestino = siguientePlan?.paypalPlanId || planActualDetalle.paypalPlanId;

      await api.post("/api/suscripciones/confirmar", {
        subscription_id: subIdLimpio,
        clinica_id: clinicaId,
        paypal_plan_id: planDestino,
        correo: correoAdmin,
      });

      await recargarSesion();
      setMensajeEstado(`¡Suscripción ${subIdLimpio} vinculada con éxito! Tu plan ha sido actualizado.`);
      setSubscriptionIdInput("");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        "No se pudo vincular la suscripción. Verifica que el ID sea correcto.";
      setMensajeEstado(errorMsg);
    } finally {
      setVinculandoManual(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID="modal-plan-suscripcion"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar modal" />

        <View style={styles.cardContainer}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeEncabezado}>
                <Ionicons name="shield-checkmark" size={13} color="#22D3EE" style={{ marginRight: 5 }} />
                <Text style={styles.badgeEncabezadoTexto}>Suscripción VITALIA</Text>
              </View>
              <Text style={styles.titulo}>{clinica?.nombre_comercial || "Mi Clínica"}</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.btnCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color="#8FA3BF" />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {mensajeEstado && (
              <View style={styles.alertaSincronizacion}>
                <Ionicons name="information-circle" size={18} color="#22D3EE" style={{ marginRight: 8 }} />
                <Text style={styles.alertaTexto}>{mensajeEstado}</Text>
              </View>
            )}

            <View style={styles.seccionActual}>
              <View style={styles.seccionActualHeader}>
                <View>
                  <Text style={styles.kickerActual}>PLAN CONTRATADO ACTUAL</Text>
                  <Text style={styles.nombrePlanActual}>{planActualDetalle.nombre}</Text>
                </View>
                <View style={[styles.tagActivo, esGratuito && { backgroundColor: "rgba(14, 165, 233, 0.12)", borderColor: "rgba(14, 165, 233, 0.3)" }]}>
                  <Text style={[styles.tagActivoTexto, esGratuito && { color: "#0284C7" }]}>
                    {esGratuito ? "FREEMIUM" : "ACTIVO"}
                  </Text>
                </View>
              </View>

              <Text style={styles.precioActual}>
                {planActualDetalle.precio === 0
                  ? "$0 MXN / mes"
                  : `$${planActualDetalle.precio.toLocaleString("es-MX")} MXN / mes`}
              </Text>

              <View style={styles.divisor} />

              <Text style={styles.subtituloBloque}>Capacidades incluidas en tu plan:</Text>

              <View style={styles.filaFeature}>
                <Ionicons name="checkmark-circle" size={17} color="#34D399" style={{ marginRight: 8 }} />
                <Text style={styles.featureTexto}>
                  Personal: {esGratuito ? "1 cuenta de doctor" : `hasta ${planActualDetalle.limitePersonal} usuarios autorizados`}
                </Text>
              </View>

              <View style={styles.filaFeature}>
                <Ionicons name="checkmark-circle" size={17} color="#34D399" style={{ marginRight: 8 }} />
                <Text style={styles.featureTexto}>
                  Pacientes: {esGratuito ? "hasta 20 pacientes al mes" : `límite de ${planActualDetalle.limitePacientes} expedientes`}
                </Text>
              </View>

              <View style={styles.filaFeature}>
                <Ionicons
                  name={planActual.incluye_calendar ? "checkmark-circle" : "close-circle"}
                  size={17}
                  color={planActual.incluye_calendar ? "#34D399" : "#F87171"}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.featureTexto, !planActual.incluye_calendar && styles.featureTextoInactivo]}>
                  Google Calendar: {planActual.incluye_calendar ? "Habilitado" : "Bloqueado"}
                </Text>
              </View>

              <View style={styles.filaFeature}>
                <Ionicons
                  name={planActual.incluye_ia ? "checkmark-circle" : "close-circle"}
                  size={17}
                  color={planActual.incluye_ia ? "#34D399" : "#F87171"}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.featureTexto, !planActual.incluye_ia && styles.featureTextoInactivo]}>
                  Asistente IA: {planActual.incluye_ia ? "Habilitado" : "Bloqueado"}
                </Text>
              </View>

              <View style={styles.filaFeature}>
                <Ionicons
                  name={planActual.incluye_contratos ? "checkmark-circle" : "close-circle"}
                  size={17}
                  color={planActual.incluye_contratos ? "#34D399" : "#F87171"}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.featureTexto, !planActual.incluye_contratos && styles.featureTextoInactivo]}>
                  Contratos Médicos: {planActual.incluye_contratos ? "Habilitado" : "Bloqueado"}
                </Text>
              </View>

              {!esGratuito && esAdmin && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border }}>
                  <Pressable
                    onPress={() => setModalCancelarVisible(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(220, 38, 38, 0.3)",
                      backgroundColor: "rgba(220, 38, 38, 0.05)",
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}>
                      Cancelar suscripción
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {siguientePlan ? (
              <View style={styles.seccionMejora}>
                <View style={styles.seccionMejoraHeader}>
                  <Ionicons name="arrow-up-circle" size={20} color={isDark ? "#22D3EE" : c.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.tituloMejora}>Actualizar al Siguiente Plan</Text>
                </View>

                <Text style={styles.descripcionMejora}>
                  Pasa al siguiente nivel para desbloquear más usuarios, pacientes y módulos avanzados pagando tu suscripción en PayPal:
                </Text>

                {planesSuperiores.map((planItem, idx) => {
                  const esSiguienteInmediato = idx === 0;

                  return (
                    <View
                      key={planItem.id}
                      style={[
                        styles.tarjetaPlanSuperior,
                        esSiguienteInmediato && styles.tarjetaPlanSiguiente,
                      ]}
                    >
                      <View style={styles.filaPlanSuperiorHeader}>
                        <View>
                          {esSiguienteInmediato && (
                            <View style={styles.badgeSiguienteInmediato}>
                              <Text style={styles.badgeSiguienteTexto}>SIGUIENTE PLAN RECOMENDADO</Text>
                            </View>
                          )}
                          <Text style={styles.nombrePlanSuperior}>{planItem.nombre}</Text>
                        </View>

                        <Text style={styles.precioPlanSuperior}>
                          ${planItem.precio.toLocaleString("es-MX")}
                          <Text style={styles.precioPeriodoSuperior}> /mes</Text>
                        </Text>
                      </View>

                      <View style={styles.divisorSutil} />

                      <View style={{ marginBottom: 12 }}>
                        {planItem.caracteristicas.map((caract, cIdx) => (
                          <View key={cIdx} style={styles.filaCaractSuperior}>
                            <Ionicons name="add-circle-outline" size={15} color={isDark ? "#22D3EE" : c.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.textoCaractSuperior}>{caract}</Text>
                          </View>
                        ))}
                      </View>

                      <Pressable
                        onPress={() => handleIrAPagar(planItem)}
                        style={styles.btnPagarPlan}
                        accessibilityRole="button"
                        accessibilityLabel={`Actualizar a ${planItem.nombre} y pagar`}
                      >
                        <Ionicons name="card" size={17} color={isDark ? "#04222B" : "#FFFFFF"} style={{ marginRight: 8 }} />
                        <Text style={styles.btnPagarPlanTexto}>
                          Actualizar a Plan {planItem.nombre} y Pagar
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.seccionMaximo}>
                <Ionicons name="star" size={28} color="#FBBF24" style={{ marginBottom: 8 }} />
                <Text style={styles.tituloMaximo}>Plan Máximo Activo</Text>
                <Text style={styles.descripcionMaximo}>
                  Tu clínica cuenta con el Plan Empresarial, el nivel más avanzado de VITALIA con todas las características de IA, Google Calendar y Gestión de Contratos habilitadas.
                </Text>
              </View>
            )}

            <View style={styles.seccionManual}>
              <View style={styles.filaManualHeader}>
                <Ionicons name="link-outline" size={16} color={isDark ? "#22D3EE" : c.primary} style={{ marginRight: 6 }} />
                <Text style={styles.subtituloManual}>Vincular Pago de PayPal Directamente</Text>
              </View>
              <Text style={styles.descripcionManual}>
                Si ya autorizaste tu suscripción en PayPal, pega aquí el ID de Suscripción (inicia con "I-") para actualizar tu clínica al instante:
              </Text>
              <View style={styles.filaInputManual}>
                <TextInput
                  value={subscriptionIdInput}
                  onChangeText={setSubscriptionIdInput}
                  placeholder="ID de Suscripción (ej. I-KPCG02C8AMXP)"
                  placeholderTextColor={c.muted}
                  style={styles.inputManual}
                  autoCapitalize="characters"
                  testID="input-subscription-id"
                />
                <Pressable
                  onPress={handleVincularManual}
                  disabled={vinculandoManual}
                  style={styles.btnVincularManual}
                  accessibilityRole="button"
                  accessibilityLabel="Vincular Suscripción"
                  testID="btn-vincular-manual"
                >
                  <Text style={styles.btnVincularManualTexto}>
                    {vinculandoManual ? "Vinculando..." : "Vincular"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSincronizarPlan}
              disabled={actualizando}
              style={styles.btnSincronizar}
              accessibilityRole="button"
              accessibilityLabel="Sincronizar Plan"
            >
              <Ionicons
                name="sync-outline"
                size={17}
                color="#8FA3BF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.btnSincronizarTexto}>
                {actualizando ? "Sincronizando..." : "Sincronizar Plan desde el Servidor"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <ModalCancelarSuscripcion
        visible={modalCancelarVisible}
        onClose={() => setModalCancelarVisible(false)}
        onCancelacionExitosa={() => {
          setModalCancelarVisible(false);
          handleSincronizarPlan();
        }}
      />
    </Modal>
  );
}

const createStyles = (c: Theme) => {
  const isDark = c.mode === "dark";
  return StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "90%",
    backgroundColor: c.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badgeEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeEncabezadoTexto: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22D3EE",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "800",
    color: c.text,
  },
  btnCerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    flexGrow: 0,
  },
  alertaSincronizacion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.3)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  alertaTexto: {
    flex: 1,
    fontSize: 12,
    color: c.text,
    fontWeight: "600",
  },
  seccionActual: {
    backgroundColor: isDark ? "#121212" : "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 18,
    marginBottom: 20,
  },
  seccionActualHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  kickerActual: {
    fontSize: 10,
    fontWeight: "700",
    color: c.muted,
    letterSpacing: 0.8,
  },
  nombrePlanActual: {
    fontSize: 22,
    fontWeight: "800",
    color: c.text,
    marginTop: 2,
  },
  tagActivo: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderWidth: 1,
    borderColor: "#34D399",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagActivoTexto: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34D399",
    letterSpacing: 0.5,
  },
  precioActual: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22D3EE",
    marginBottom: 12,
  },
  precioPeriodo: {
    fontSize: 12,
    fontWeight: "500",
    color: c.muted,
  },
  divisor: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 12,
  },
  divisorSutil: {
    height: 1,
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    marginVertical: 10,
  },
  subtituloBloque: {
    fontSize: 11.5,
    fontWeight: "700",
    color: c.muted,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filaFeature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  featureTexto: {
    fontSize: 13,
    color: c.text,
  },
  featureBold: {
    fontWeight: "700",
    color: "#22D3EE",
  },
  featureTextoInactivo: {
    color: c.muted,
  },
  seccionMejora: {
    marginBottom: 16,
  },
  seccionMejoraHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tituloMejora: {
    fontSize: 16,
    fontWeight: "800",
    color: c.text,
  },
  descripcionMejora: {
    fontSize: 12,
    color: c.muted,
    marginBottom: 14,
    lineHeight: 17,
  },
  tarjetaPlanSuperior: {
    backgroundColor: isDark ? "#121212" : "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 12,
  },
  tarjetaPlanSiguiente: {
    borderColor: isDark ? "rgba(34, 211, 238, 0.5)" : "#08BFA4",
    backgroundColor: isDark ? "rgba(17, 26, 44, 0.9)" : "rgba(8, 191, 164, 0.08)",
    borderWidth: 1.5,
  },
  filaPlanSuperiorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeSiguienteInmediato: {
    backgroundColor: isDark ? "rgba(34, 211, 238, 0.15)" : "rgba(8, 191, 164, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  badgeSiguienteTexto: {
    fontSize: 9,
    fontWeight: "800",
    color: isDark ? "#22D3EE" : "#0F4C45",
    letterSpacing: 0.5,
  },
  nombrePlanSuperior: {
    fontSize: 17,
    fontWeight: "800",
    color: c.text,
  },
  precioPlanSuperior: {
    fontSize: 16,
    fontWeight: "800",
    color: c.text,
  },
  precioPeriodoSuperior: {
    fontSize: 11,
    fontWeight: "500",
    color: c.muted,
  },
  filaCaractSuperior: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  textoCaractSuperior: {
    fontSize: 12,
    color: c.muted,
  },
  btnPagarPlan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDark ? "#22D3EE" : c.primary,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  btnPagarPlanTexto: {
    fontSize: 13,
    fontWeight: "800",
    color: isDark ? "#04222B" : "#FFFFFF",
  },
  seccionMaximo: {
    alignItems: "center",
    backgroundColor: isDark ? "#121212" : "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  tituloMaximo: {
    fontSize: 17,
    fontWeight: "800",
    color: c.text,
    marginBottom: 6,
  },
  descripcionMaximo: {
    fontSize: 12,
    color: c.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  btnSincronizar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  btnSincronizarTexto: {
    fontSize: 12,
    color: c.muted,
    fontWeight: "600",
  },
  seccionManual: {
    backgroundColor: isDark ? "#121212" : "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  filaManualHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  subtituloManual: {
    fontSize: 13,
    fontWeight: "700",
    color: c.text,
  },
  descripcionManual: {
    fontSize: 11,
    color: c.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  filaInputManual: {
    flexDirection: "row",
    gap: 8,
  },
  inputManual: {
    flex: 1,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: c.text,
    fontSize: 12,
  },
  btnVincularManual: {
    backgroundColor: isDark ? "#0EA5E9" : c.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  btnVincularManualTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
};
