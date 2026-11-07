import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

export function ModalPlanSuscripcion({ visible, onClose }: ModalPlanSuscripcionProps) {
  const { usuario, clinica, planActual, recargarSesion } = useAuth();
  const [actualizando, setActualizando] = useState(false);
  const [vinculandoManual, setVinculandoManual] = useState(false);
  const [subscriptionIdInput, setSubscriptionIdInput] = useState("");
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);

  const nombreNormalizado = (planActual?.nombre_plan || "Básico").toLowerCase().trim();

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
                <View style={styles.tagActivo}>
                  <Text style={styles.tagActivoTexto}>ACTIVO</Text>
                </View>
              </View>

              <Text style={styles.precioActual}>
                ${planActualDetalle.precio.toLocaleString("es-MX")}{" "}
                <Text style={styles.precioPeriodo}>MXN / mes</Text>
              </Text>

              <View style={styles.divisor} />

              <Text style={styles.subtituloBloque}>Capacidades incluidas en tu plan:</Text>

              <View style={styles.filaFeature}>
                <Ionicons name="checkmark-circle" size={17} color="#34D399" style={{ marginRight: 8 }} />
                <Text style={styles.featureTexto}>
                  Personal: hasta <Text style={styles.featureBold}>{planActualDetalle.limitePersonal}</Text> usuarios autorizados
                </Text>
              </View>

              <View style={styles.filaFeature}>
                <Ionicons name="checkmark-circle" size={17} color="#34D399" style={{ marginRight: 8 }} />
                <Text style={styles.featureTexto}>
                  Pacientes: límite de <Text style={styles.featureBold}>{planActualDetalle.limitePacientes}</Text> expedientes
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
            </View>

            {siguientePlan ? (
              <View style={styles.seccionMejora}>
                <View style={styles.seccionMejoraHeader}>
                  <Ionicons name="arrow-up-circle" size={20} color="#22D3EE" style={{ marginRight: 8 }} />
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
                            <Ionicons name="add-circle-outline" size={15} color="#22D3EE" style={{ marginRight: 6 }} />
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
                        <Ionicons name="card" size={17} color="#04222B" style={{ marginRight: 8 }} />
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
                <Ionicons name="link-outline" size={16} color="#22D3EE" style={{ marginRight: 6 }} />
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
                  placeholderTextColor="#64748B"
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#111A2C",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1F2A44",
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
    color: "#E6EDF7",
  },
  btnCerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    color: "#E6EDF7",
    fontWeight: "600",
  },
  seccionActual: {
    backgroundColor: "#0B1220",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F2A44",
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
    color: "#8FA3BF",
    letterSpacing: 0.8,
  },
  nombrePlanActual: {
    fontSize: 22,
    fontWeight: "800",
    color: "#E6EDF7",
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
    color: "#8FA3BF",
  },
  divisor: {
    height: 1,
    backgroundColor: "#1F2A44",
    marginVertical: 12,
  },
  divisorSutil: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  subtituloBloque: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#8FA3BF",
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
    color: "#E6EDF7",
  },
  featureBold: {
    fontWeight: "700",
    color: "#22D3EE",
  },
  featureTextoInactivo: {
    color: "#8FA3BF",
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
    color: "#E6EDF7",
  },
  descripcionMejora: {
    fontSize: 12,
    color: "#8FA3BF",
    marginBottom: 14,
    lineHeight: 17,
  },
  tarjetaPlanSuperior: {
    backgroundColor: "#0B1220",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F2A44",
    padding: 16,
    marginBottom: 12,
  },
  tarjetaPlanSiguiente: {
    borderColor: "rgba(34, 211, 238, 0.4)",
    backgroundColor: "rgba(17, 26, 44, 0.9)",
  },
  filaPlanSuperiorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeSiguienteInmediato: {
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  badgeSiguienteTexto: {
    fontSize: 9,
    fontWeight: "800",
    color: "#22D3EE",
    letterSpacing: 0.5,
  },
  nombrePlanSuperior: {
    fontSize: 17,
    fontWeight: "800",
    color: "#E6EDF7",
  },
  precioPlanSuperior: {
    fontSize: 16,
    fontWeight: "800",
    color: "#E6EDF7",
  },
  precioPeriodoSuperior: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8FA3BF",
  },
  filaCaractSuperior: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  textoCaractSuperior: {
    fontSize: 12,
    color: "#8FA3BF",
  },
  btnPagarPlan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22D3EE",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  btnPagarPlanTexto: {
    fontSize: 13,
    fontWeight: "800",
    color: "#04222B",
  },
  seccionMaximo: {
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F2A44",
    padding: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  tituloMaximo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#E6EDF7",
    marginBottom: 6,
  },
  descripcionMaximo: {
    fontSize: 12,
    color: "#8FA3BF",
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
    color: "#8FA3BF",
    fontWeight: "600",
  },
  seccionManual: {
    backgroundColor: "#0B1220",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2A44",
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
    color: "#E2E8F0",
  },
  descripcionManual: {
    fontSize: 11,
    color: "#8FA3BF",
    lineHeight: 16,
    marginBottom: 10,
  },
  filaInputManual: {
    flexDirection: "row",
    gap: 8,
  },
  inputManual: {
    flex: 1,
    backgroundColor: "#111A2C",
    borderWidth: 1,
    borderColor: "#1F2A44",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 12,
  },
  btnVincularManual: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  btnVincularManualTexto: {
    color: "#04222B",
    fontSize: 12,
    fontWeight: "800",
  },
});
