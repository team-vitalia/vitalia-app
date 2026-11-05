import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAsistenteIA } from "../hooks/useAsistenteIA";
import { MedicamentoSugerido } from "../services/asistenteIaService";

interface AsistenteIAModalProps {
  visible: boolean;
  onClose: () => void;
  citaId: number;
  motivoInicial?: string;
  pacienteNombre?: string;
  alergiasRegistradas?: { nombre: string; severidad?: string }[];
  onSeleccionarMedicamentoParaReceta?: (med: MedicamentoSugerido) => void;
}

export const AsistenteIAModal: React.FC<AsistenteIAModalProps> = ({
  visible,
  onClose,
  citaId,
  motivoInicial = "",
  pacienteNombre = "Paciente",
  alergiasRegistradas = [],
  onSeleccionarMedicamentoParaReceta,
}) => {
  const [sintomas, setSintomas] = useState(motivoInicial);
  const [incluirNotas, setIncluirNotas] = useState(true);
  const { cargando, error, resultado, consultar, limpiar } = useAsistenteIA();

  // Sincronizar motivo cuando cambia o se abre el modal
  useEffect(() => {
    if (visible && motivoInicial && !sintomas) {
      setSintomas(motivoInicial);
    }
  }, [visible, motivoInicial]);

  const handleEjecutarConsulta = () => {
    consultar(citaId, sintomas, incluirNotas);
  };

  const handleCerrar = () => {
    limpiar();
    onClose();
  };

  const getProbabilidadColor = (prob: string) => {
    switch (prob?.toLowerCase()) {
      case "alta":
        return { bg: "#FEE2E2", text: "#991B1B", border: "#F87171" };
      case "media":
        return { bg: "#FEF3C7", text: "#92400E", border: "#FBBF24" };
      default:
        return { bg: "#E0F2FE", text: "#075985", border: "#38BDF8" };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCerrar}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <FontAwesome name="stethoscope" size={20} color="#247F76" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Asistente Clínico IA</Text>
                  <View style={styles.badgeGroq}>
                    <Text style={styles.badgeGroqText}>Groq Clinical AI</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>
                  Soporte diagnóstico para: <Text style={styles.patientName}>{pacienteNombre}</Text>
                </Text>
              </View>
            </View>
            <Pressable onPress={handleCerrar} style={styles.closeButton} accessibilityLabel="Cerrar modal">
              <FontAwesome name="times" size={18} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={true}>
            {/* Contexto de Alergias del Paciente */}
            <View style={styles.alergiasBar}>
              <FontAwesome name="shield" size={14} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.alergiasBarText}>
                {alergiasRegistradas.length > 0
                  ? `Alergias en expediente: ${alergiasRegistradas.map((a) => a.nombre).join(", ")}`
                  : "Paciente sin alergias conocidas registradas en expediente"}
              </Text>
            </View>

            {/* Input de Síntomas */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Descripción clínica de síntomas observados:
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder="Ingresa síntomas detallados (ej. Fiebre de 39°C, odinofagia con placas, tos seca nocturna...)"
                placeholderTextColor="#9CA3AF"
                value={sintomas}
                onChangeText={setSintomas}
              />

              <View style={styles.optionsRow}>
                <View style={styles.switchContainer}>
                  <Switch
                    value={incluirNotas}
                    onValueChange={setIncluirNotas}
                    trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
                    thumbColor={incluirNotas ? "#247F76" : "#F3F4F6"}
                  />
                  <Text style={styles.switchLabel}>Incluir notas clínicas previas</Text>
                </View>

                <Pressable
                  style={[
                    styles.consultarBtn,
                    cargando || sintomas.trim().length < 5 ? styles.btnDisabled : null,
                  ]}
                  onPress={handleEjecutarConsulta}
                  disabled={cargando || sintomas.trim().length < 5}
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome name="magic" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.consultarBtnText}>Analizar con IA</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Estado de Carga */}
            {cargando && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#247F76" />
                <Text style={styles.loadingTitle}>Procesando análisis clínico...</Text>
                <Text style={styles.loadingSubtitle}>
                  Validando síntomas y cruzando contraindicaciones con el historial de alergias.
                </Text>
              </View>
            )}

            {/* Manejo de Error */}
            {error && (
              <View style={styles.errorBox}>
                <FontAwesome name="exclamation-circle" size={18} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.errorTitle}>Error al consultar la IA</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable style={styles.retryBtn} onPress={handleEjecutarConsulta}>
                    <Text style={styles.retryBtnText}>Reintentar consulta</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Resultados */}
            {resultado && !cargando && (
              <View style={styles.resultsContainer}>
                {/* 1. Diagnósticos Probables */}
                <View style={styles.sectionHeader}>
                  <FontAwesome name="list-alt" size={16} color="#1E3A8A" />
                  <Text style={styles.sectionTitle}>Diagnósticos Probables (CIE-10)</Text>
                </View>

                {resultado.diagnosticos_probables.map((diag, index) => {
                  const probStyle = getProbabilidadColor(diag.probabilidad);
                  return (
                    <View key={index} style={styles.diagCard}>
                      <View style={styles.diagTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.diagName}>{diag.diagnostico}</Text>
                          {diag.codigo_cie10 && (
                            <View style={styles.cieBadge}>
                              <Text style={styles.cieBadgeText}>CIE-10: {diag.codigo_cie10}</Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={[
                            styles.probBadge,
                            {
                              backgroundColor: probStyle.bg,
                              borderColor: probStyle.border,
                            },
                          ]}
                        >
                          <Text style={[styles.probBadgeText, { color: probStyle.text }]}>
                            {diag.probabilidad.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.diagJustificacion}>
                        {diag.justificacion_clinica}
                      </Text>
                    </View>
                  );
                })}

                {/* 2. Medicamentos y Validación de Alergias */}
                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <FontAwesome name="medkit" size={16} color="#047857" />
                  <Text style={styles.sectionTitle}>Sugerencias Farmacológicas y Alertas</Text>
                </View>

                {resultado.medicamentos_sugeridos.map((med, index) => {
                  const esAlergia = med.alerta_alergia;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.medCard,
                        esAlergia ? styles.medCardAlert : styles.medCardSafe,
                      ]}
                    >
                      {/* Badge de Alerta o Seguro */}
                      {esAlergia ? (
                        <View style={styles.alertaAlergiaBox}>
                          <View style={styles.alertaAlergiaHeader}>
                            <FontAwesome name="warning" size={16} color="#B91C1C" />
                            <Text style={styles.alertaAlergiaTitle}>
                              ¡RIESGO DE ALERGIA / REACCIÓN CRUZADA DETECTADO!
                            </Text>
                          </View>
                          <Text style={styles.alertaAlergiaDesc}>
                            {med.detalle_alergia || "Medicamento con alta probabilidad de contraindicación por alergia previa del paciente."}
                          </Text>
                          <View style={styles.riesgoBadge}>
                            <Text style={styles.riesgoBadgeText}>
                              Nivel: {med.nivel_riesgo.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.safeBadge}>
                          <FontAwesome name="check-circle" size={13} color="#059669" />
                          <Text style={styles.safeBadgeText}>
                            Sin riesgo alérgico conocido detectado
                          </Text>
                        </View>
                      )}

                      <View style={styles.medContent}>
                        <Text style={styles.medName}>{med.nombre_generico}</Text>
                        <View style={styles.medDetailsGrid}>
                          <Text style={styles.medDetailItem}>
                            <Text style={styles.medDetailLabel}>Presentación: </Text>
                            {med.presentacion_dosis}
                          </Text>
                          <Text style={styles.medDetailItem}>
                            <Text style={styles.medDetailLabel}>Frecuencia: </Text>
                            {med.frecuencia}
                          </Text>
                          <Text style={styles.medDetailItem}>
                            <Text style={styles.medDetailLabel}>Duración: </Text>
                            {med.duracion_dias}
                          </Text>
                        </View>

                        <Text style={styles.medJustificacion}>
                          <Text style={{ fontWeight: "700" }}>Justificación: </Text>
                          {med.justificacion}
                        </Text>

                        {/* Botón de acción para receta */}
                        {onSeleccionarMedicamentoParaReceta && (
                          <Pressable
                            style={[
                              styles.btnAplicarReceta,
                              esAlergia ? styles.btnAplicarRecetaAlert : null,
                            ]}
                            onPress={() => onSeleccionarMedicamentoParaReceta(med)}
                          >
                            <FontAwesome
                              name="pencil-square-o"
                              size={13}
                              color={esAlergia ? "#B91C1C" : "#047857"}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.btnAplicarRecetaText,
                                esAlergia ? { color: "#B91C1C" } : null,
                              ]}
                            >
                              {esAlergia ? "Revisar y usar con precaución" : "Agregar a Receta"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* 3. Observaciones farmacológicas generales */}
                {resultado.observaciones_farmacologicas && (
                  <View style={styles.observacionesBox}>
                    <View style={styles.observacionesHeader}>
                      <FontAwesome name="info-circle" size={14} color="#0284C7" />
                      <Text style={styles.observacionesTitle}>Observaciones Farmacológicas</Text>
                    </View>
                    <Text style={styles.observacionesText}>
                      {resultado.observaciones_farmacologicas}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Aviso Legal Estático Obligatorio (Disclaimer) */}
            <View style={styles.disclaimerContainer}>
              <View style={styles.disclaimerHeader}>
                <FontAwesome name="balance-scale" size={14} color="#475569" />
                <Text style={styles.disclaimerTitle}>Aviso Legal y de Responsabilidad Clínica</Text>
              </View>
              <Text style={styles.disclaimerText}>
                Esta herramienta asistida por Inteligencia Artificial (Groq) tiene carácter exclusivamente orientativo
                y de soporte al diagnóstico. No constituye una indicación médica definitiva ni sustituye el examen físico
                ni el criterio del médico tratante. La prescripción, dosificación y diagnóstico son responsabilidad exclusiva del profesional.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 820,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6F4F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeGroq: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  badgeGroqText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  patientName: {
    fontWeight: "700",
    color: "#1E293B",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginLeft: 10,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 30,
  },
  alergiasBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  alergiasBarText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
    flex: 1,
  },
  inputSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    minHeight: 70,
    textAlignVertical: "top",
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 12,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  consultarBtn: {
    backgroundColor: "#247F76",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  consultarBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
  },
  errorText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  resultsContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  diagCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
  },
  diagTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  diagName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  cieBadge: {
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  cieBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  probBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  probBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  diagJustificacion: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 18,
  },
  medCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  medCardAlert: {
    borderColor: "#EF4444",
    backgroundColor: "#FFFDFD",
  },
  medCardSafe: {
    borderColor: "#E2E8F0",
  },
  alertaAlergiaBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  alertaAlergiaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertaAlergiaTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#991B1B",
  },
  alertaAlergiaDesc: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 4,
    fontWeight: "600",
  },
  riesgoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#991B1B",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  riesgoBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  safeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#D1FAE5",
  },
  safeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  medContent: {
    padding: 14,
  },
  medName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  medDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  medDetailItem: {
    fontSize: 12,
    color: "#334155",
  },
  medDetailLabel: {
    fontWeight: "700",
    color: "#64748B",
  },
  medJustificacion: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginTop: 4,
  },
  btnAplicarReceta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  btnAplicarRecetaAlert: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  btnAplicarRecetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  observacionesBox: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 14,
    marginTop: 8,
  },
  observacionesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  observacionesTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0369A1",
  },
  observacionesText: {
    fontSize: 12,
    color: "#0C4A6E",
    lineHeight: 18,
  },
  disclaimerContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
});
