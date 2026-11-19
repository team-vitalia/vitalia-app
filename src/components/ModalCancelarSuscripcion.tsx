import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { cancelarSuscripcion, RespuestaCancelarSuscripcion } from "../services/suscripcionService";
import { useTheme, type Theme } from "../theme/theme";

interface ModalCancelarSuscripcionProps {
  visible: boolean;
  onClose: () => void;
  onCancelacionExitosa?: () => void;
}

const MOTIVOS = [
  { clave: "PRECIO_ALTO", etiqueta: "Precio alto para mis necesidades actuales" },
  { clave: "FALTA_FUNCIONES", etiqueta: "Faltan funciones que requiero en mi clínica" },
  { clave: "PROBLEMAS_TECNICOS", etiqueta: "Problemas técnicos o lentitud en el servicio" },
  { clave: "CAMBIO_PROVEEDOR", etiqueta: "Migración a otro software médico" },
  { clave: "CIERRE_TEMPORAL", etiqueta: "Cierre o pausa temporal de actividades" },
  { clave: "OTRO", etiqueta: "Otro motivo no listado" },
];

export function ModalCancelarSuscripcion({
  visible,
  onClose,
  onCancelacionExitosa,
}: ModalCancelarSuscripcionProps) {
  const c = useTheme();
  const styles = useMemo(() => crearEstilos(c), [c]);
  const { clinica, planActual, recargarSesion } = useAuth();

  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>("");
  const [comentarios, setComentarios] = useState<string>("");
  const [solicitarReembolso, setSolicitarReembolso] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespuestaCancelarSuscripcion | null>(null);

  const fechaInicioRaw = (clinica as any)?.fecha_inicio_suscripcion || (clinica as any)?.fecha_registro;
  const fechaInicio = fechaInicioRaw ? new Date(fechaInicioRaw) : new Date();

  const diffMs = Date.now() - fechaInicio.getTime();
  const diasTranscurridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const dentroGarantia = diasTranscurridos <= 10;

  const handleConfirmar = async () => {
    if (!motivoSeleccionado) {
      setError("Selecciona el motivo de cancelación antes de continuar.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const resp = await cancelarSuscripcion({
        motivo_categoria: motivoSeleccionado,
        comentarios_adicionales: comentarios.trim() || undefined,
        solicitar_reembolso: dentroGarantia && solicitarReembolso,
      });

      await recargarSesion();
      setResultado(resp);
      if (onCancelacionExitosa) {
        onCancelacionExitosa();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "No se pudo procesar la cancelación. Inténtalo de nuevo.";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const reiniciarYSalir = () => {
    setMotivoSeleccionado("");
    setComentarios("");
    setSolicitarReembolso(true);
    setError(null);
    setResultado(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={reiniciarYSalir}>
      <View style={styles.overlay}>
        <View style={styles.contenedor}>
          <View style={styles.cabecera}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Cancelar Suscripción</Text>
              <Text style={styles.subtitulo}>Downgrade automático al Plan Gratuito</Text>
            </View>
            <Pressable onPress={reiniciarYSalir} hitSlop={10} style={styles.btnCerrar}>
              <Ionicons name="close" size={22} color={c.muted} />
            </Pressable>
          </View>

          {resultado ? (
            <ScrollView contentContainerStyle={styles.cuerpoExito}>
              <View style={styles.iconoExito}>
                <Ionicons name="checkmark-circle" size={48} color={c.success} />
              </View>
              <Text style={styles.tituloExito}>Suscripción Cancelada</Text>
              <Text style={styles.textoExito}>
                Tu clínica ha sido migrada automáticamente al <Text style={{ fontWeight: "800", color: c.text }}>Plan Gratuito</Text>.
                Tus expedientes, citas pasadas e información médica permanecen intactos.
              </Text>

              {resultado.aplica_reembolso ? (
                <View style={styles.cajaReembolsoOk}>
                  <Ionicons name="cash-outline" size={20} color={c.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reembolsoTituloOk}>Reembolso Solicitado</Text>
                    <Text style={styles.reembolsoTextoOk}>
                      Estado: {resultado.estado_reembolso}. Referencia PayPal: {resultado.paypal_refund_id || "Procesado"}.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.cajaReembolsoInfo}>
                  <Ionicons name="information-circle-outline" size={20} color={c.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reembolsoTituloInfo}>Sin Reembolso Aplicable</Text>
                    <Text style={styles.reembolsoTextoInfo}>
                      La cancelación no aplicó reembolso. Tu cuenta opera ahora con los límites del plan gratuito.
                    </Text>
                  </View>
                </View>
              )}

              <Pressable style={styles.btnPrimario} onPress={reiniciarYSalir}>
                <Text style={styles.btnPrimarioTexto}>Entendido</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.avisoDowngrade}>
                <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.avisoTitulo}>Conservarás todos tus datos</Text>
                  <Text style={styles.avisoTexto}>
                    Al cancelar no se eliminará tu información. Tu cuenta pasará de forma inmediata al Plan Gratuito (1 doctor, hasta 20 pacientes al mes, expedientes y agenda básica).
                  </Text>
                </View>
              </View>

              <View style={dentroGarantia ? styles.garantiaActiva : styles.garantiaExpirada}>
                <Ionicons
                  name={dentroGarantia ? "gift-outline" : "time-outline"}
                  size={20}
                  color={dentroGarantia ? c.success : c.muted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={dentroGarantia ? styles.garantiaTituloOk : styles.garantiaTituloExp}>
                    {dentroGarantia
                      ? `Garantía de Satisfacción: Día ${diasTranscurridos} de 10`
                      : `Garantía de 10 días no aplicable`}
                  </Text>
                  <Text style={styles.garantiaDesc}>
                    {dentroGarantia
                      ? "Estás dentro del periodo de garantía de 10 días. Puedes solicitar el reembolso íntegro de tu última mensualidad."
                      : `Han transcurrido ${diasTranscurridos} días desde el inicio de la suscripción. Los reembolsos sólo aplican dentro de los primeros 10 días.`}
                  </Text>
                </View>
              </View>

              {dentroGarantia && (
                <Pressable
                  onPress={() => setSolicitarReembolso((prev) => !prev)}
                  style={styles.opcionReembolso}
                >
                  <Ionicons
                    name={solicitarReembolso ? "checkbox" : "square-outline"}
                    size={22}
                    color={solicitarReembolso ? c.primary : c.muted}
                  />
                  <Text style={styles.opcionReembolsoTexto}>
                    Solicitar reembolso total a mi cuenta de PayPal
                  </Text>
                </Pressable>
              )}

              <Text style={styles.seccionLabel}>Motivo de cancelación (obligatorio)</Text>
              <View style={styles.listaMotivos}>
                {MOTIVOS.map((m) => {
                  const seleccionado = motivoSeleccionado === m.clave;
                  return (
                    <Pressable
                      key={m.clave}
                      onPress={() => {
                        setMotivoSeleccionado(m.clave);
                        setError(null);
                      }}
                      style={[styles.itemMotivo, seleccionado && styles.itemMotivoSeleccionado]}
                    >
                      <Ionicons
                        name={seleccionado ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={seleccionado ? c.primary : c.muted}
                      />
                      <Text style={[styles.itemMotivoTexto, seleccionado && styles.itemMotivoTextoSeleccionado]}>
                        {m.etiqueta}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.seccionLabel}>Comentarios adicionales (opcional)</Text>
              <TextInput
                style={styles.inputComentarios}
                placeholder="Cuéntanos brevemente qué podríamos mejorar..."
                placeholderTextColor={c.muted}
                multiline
                numberOfLines={3}
                value={comentarios}
                onChangeText={setComentarios}
                maxLength={500}
              />

              {error && (
                <View style={styles.cajaError}>
                  <Ionicons name="alert-circle-outline" size={18} color={c.error} />
                  <Text style={styles.cajaErrorTexto}>{error}</Text>
                </View>
              )}

              <View style={styles.acciones}>
                <Pressable style={styles.btnSecundario} onPress={reiniciarYSalir} disabled={guardando}>
                  <Text style={styles.btnSecundarioTexto}>Mantener Plan</Text>
                </Pressable>

                <Pressable
                  style={[styles.btnPeligro, guardando && { opacity: 0.7 }]}
                  onPress={handleConfirmar}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnPeligroTexto}>Confirmar Cancelación</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const crearEstilos = (c: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    contenedor: {
      width: "100%",
      maxWidth: 540,
      maxHeight: "90%",
      backgroundColor: c.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      ...Platform.select({
        web: {
          boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
        },
        default: {
          elevation: 10,
        },
      }),
    },
    cabecera: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    titulo: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    subtitulo: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
    btnCerrar: {
      padding: 4,
    },
    scroll: {
      padding: 22,
      gap: 14,
    },
    avisoDowngrade: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.mode === "dark" ? "rgba(45,212,191,0.12)" : "#F0FDFA",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(45,212,191,0.25)" : "#CCFBF1",
    },
    avisoTitulo: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
    },
    avisoTexto: {
      fontSize: 12,
      color: c.muted,
      marginTop: 3,
      lineHeight: 18,
    },
    garantiaActiva: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.mode === "dark" ? "rgba(16,185,129,0.14)" : "#ECFDF5",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(16,185,129,0.3)" : "#A7F3D0",
    },
    garantiaExpirada: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.mode === "dark" ? "rgba(148,163,184,0.08)" : "#F8FAFC",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    garantiaTituloOk: {
      fontSize: 13,
      fontWeight: "800",
      color: c.success,
    },
    garantiaTituloExp: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    garantiaDesc: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
      lineHeight: 17,
    },
    opcionReembolso: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    opcionReembolsoTexto: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    seccionLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
      marginTop: 4,
    },
    listaMotivos: {
      gap: 8,
    },
    itemMotivo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    itemMotivoSeleccionado: {
      borderColor: c.primary,
      backgroundColor: c.mode === "dark" ? "rgba(45,212,191,0.12)" : "#F0FDFA",
    },
    itemMotivoTexto: {
      fontSize: 12.5,
      color: c.text,
      flex: 1,
    },
    itemMotivoTextoSeleccionado: {
      fontWeight: "700",
      color: c.primary,
    },
    inputComentarios: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 12.5,
      color: c.text,
      textAlignVertical: "top",
      minHeight: 70,
    },
    cajaError: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      padding: 10,
      borderRadius: 10,
    },
    cajaErrorTexto: {
      fontSize: 12,
      color: c.error,
      flex: 1,
    },
    acciones: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 10,
    },
    btnSecundario: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    btnSecundarioTexto: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
    },
    btnPeligro: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: "#DC2626",
      alignItems: "center",
      justifyContent: "center",
    },
    btnPeligroTexto: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    cuerpoExito: {
      padding: 24,
      alignItems: "center",
      gap: 14,
    },
    iconoExito: {
      marginBottom: 4,
    },
    tituloExito: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
    },
    textoExito: {
      fontSize: 13,
      color: c.muted,
      textAlign: "center",
      lineHeight: 20,
    },
    cajaReembolsoOk: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: c.mode === "dark" ? "rgba(16,185,129,0.14)" : "#ECFDF5",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(16,185,129,0.3)" : "#A7F3D0",
      width: "100%",
    },
    reembolsoTituloOk: {
      fontSize: 13,
      fontWeight: "800",
      color: c.success,
    },
    reembolsoTextoOk: {
      fontSize: 12,
      color: c.text,
      marginTop: 2,
    },
    cajaReembolsoInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: c.mode === "dark" ? "rgba(56,189,248,0.12)" : "#F0F9FF",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.mode === "dark" ? "rgba(56,189,248,0.25)" : "#BAE6FD",
      width: "100%",
    },
    reembolsoTituloInfo: {
      fontSize: 13,
      fontWeight: "800",
      color: c.info,
    },
    reembolsoTextoInfo: {
      fontSize: 12,
      color: c.text,
      marginTop: 2,
    },
    btnPrimario: {
      marginTop: 10,
      paddingVertical: 11,
      paddingHorizontal: 28,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    btnPrimarioTexto: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
