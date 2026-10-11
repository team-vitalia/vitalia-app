import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { useGoogleCalendar } from "../context/CalendarContext";

export default function CalendarTestScreen() {
  const {
    isCalendarConnected,
    cargando,
    ultimoEventoCreado,
    conectarGoogle,
    desconectarGoogle,
    crearEvento,
    eliminarEvento,
  } = useGoogleCalendar();

  const [mensajeEstado, setMensajeEstado] = useState<string>("");
  const [esError, setEsError] = useState<boolean>(false);

  const mostrarMensaje = (texto: string, error: boolean = false) => {
    setMensajeEstado(texto);
    setEsError(error);
    if (Platform.OS !== "web") {
      Alert.alert(error ? "Error" : "Google Calendar", texto);
    }
  };

  const handleCrearCitaPrueba = async () => {
    try {
      setMensajeEstado("Creando cita médica en Google Calendar...");
      setEsError(false);
      const resultado = await crearEvento(
        "Cita Médica VITALIA - Prueba",
        "Cita médica agendada desde el sistema integral VITALIA.",
        undefined,
        60
      );
      mostrarMensaje("Cita médica creada exitosamente: " + (resultado.summary || "Prueba"));
    } catch (err: any) {
      const detalle = err.response?.data?.detail || err.message || "Error al crear cita.";
      mostrarMensaje("No se pudo crear la cita: " + detalle, true);
    }
  };

  const handleEliminarCitaPrueba = async () => {
    if (!ultimoEventoCreado?.event_id) {
      mostrarMensaje("No hay una cita activa para eliminar.", true);
      return;
    }

    try {
      setMensajeEstado("Eliminando cita médica de Google Calendar...");
      setEsError(false);
      await eliminarEvento(ultimoEventoCreado.event_id);
      mostrarMensaje("Cita médica eliminada exitosamente de Google Calendar.");
    } catch (err: any) {
      const detalle = err.response?.data?.detail || err.message || "Error al eliminar cita.";
      mostrarMensaje("No se pudo eliminar la cita: " + detalle, true);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FontAwesome name="calendar" size={24} color="#247F76" style={styles.iconMarginRight} />
          <Text style={styles.title}>Integración Google Calendar</Text>
        </View>
        <Text style={styles.subtitle}>
          Servicio activo y sincronizado globalmente en toda la aplicación VITALIA
        </Text>
      </View>

      {/* Tarjeta de Estado de Conexión Global */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado del Servicio Global</Text>
        <View style={styles.statusRow}>
          <FontAwesome
            name={isCalendarConnected ? "check-circle" : "times-circle"}
            size={18}
            color={isCalendarConnected ? "#247F76" : "#82938F"}
            style={styles.iconMarginRight}
          />
          <Text style={styles.statusLabel}>
            {isCalendarConnected
              ? "Servicio Conectado y Activo en todo el sistema"
              : "Servicio Desconectado (Requiere autorización)"}
          </Text>
        </View>

        {/* Botones de Conexión / Desconexión */}
        {!isCalendarConnected ? (
          <TouchableOpacity
            style={[styles.button, styles.googleButton, cargando && styles.buttonDisabled]}
            onPress={conectarGoogle}
            disabled={cargando}
          >
            <FontAwesome name="google" size={16} color="#FFFFFF" style={styles.iconMarginRight} />
            <Text style={styles.buttonText}>Conectar con Google Calendar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { flex: 1, marginRight: 6 }]}
              onPress={conectarGoogle}
              disabled={cargando}
            >
              <FontAwesome name="refresh" size={14} color="#FFFFFF" style={styles.iconMarginRight} />
              <Text style={styles.buttonText}>Reconectar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton, { flex: 1, marginLeft: 6 }]}
              onPress={desconectarGoogle}
              disabled={cargando}
            >
              <FontAwesome name="sign-out" size={14} color="#FFFFFF" style={styles.iconMarginRight} />
              <Text style={styles.buttonText}>Desvincular</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Acciones de Prueba: Crear y Eliminar Evento */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operaciones de Citas Médicas</Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (!isCalendarConnected || cargando) && styles.buttonDisabled]}
          onPress={handleCrearCitaPrueba}
          disabled={!isCalendarConnected || cargando}
        >
          <FontAwesome name="plus-circle" size={16} color="#FFFFFF" style={styles.iconMarginRight} />
          <Text style={styles.buttonText}>Crear Cita Médica de Prueba (Mañana 10:00 AM)</Text>
        </TouchableOpacity>

        {ultimoEventoCreado && (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton, cargando && styles.buttonDisabled]}
            onPress={handleEliminarCitaPrueba}
            disabled={cargando}
          >
            <FontAwesome name="trash" size={16} color="#FFFFFF" style={styles.iconMarginRight} />
            <Text style={styles.buttonText}>Eliminar Cita de Prueba Creada</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicador de Carga */}
      {cargando && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#247F76" />
          <Text style={styles.loadingText}>Comunicando con Google Calendar API...</Text>
        </View>
      )}

      {/* Mensajes de Respuesta */}
      {mensajeEstado !== "" && (
        <View style={[styles.messageCard, esError ? styles.errorCard : styles.successCard]}>
          <FontAwesome
            name={esError ? "exclamation-triangle" : "info-circle"}
            size={16}
            color={esError ? "#D65A5A" : "#247F76"}
            style={styles.iconMarginRight}
          />
          <Text style={[styles.messageText, esError ? styles.errorText : styles.successText]}>
            {mensajeEstado}
          </Text>
        </View>
      )}

      {/* Detalle del Evento Creado */}
      {ultimoEventoCreado && (
        <View style={styles.eventDetailCard}>
          <Text style={styles.eventDetailTitle}>Cita Sincronizada en Google Calendar:</Text>
          <Text style={styles.eventDetailText}>
            <Text style={styles.bold}>ID:</Text> {ultimoEventoCreado.event_id}
          </Text>
          <Text style={styles.eventDetailText}>
            <Text style={styles.bold}>Título:</Text> {ultimoEventoCreado.summary}
          </Text>
          {ultimoEventoCreado.start?.dateTime && (
            <Text style={styles.eventDetailText}>
              <Text style={styles.bold}>Inicio:</Text> {new Date(ultimoEventoCreado.start.dateTime).toLocaleString()}
            </Text>
          )}

          {ultimoEventoCreado.html_link && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL(ultimoEventoCreado.html_link)}
            >
              <FontAwesome name="external-link" size={14} color="#247F76" style={styles.iconMarginRight} />
              <Text style={styles.linkText}>Abrir en Google Calendar Web</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F4FAF8",
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2ECEA",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#247F76",
  },
  subtitle: {
    fontSize: 13,
    color: "#667773",
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2ECEA",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173F3A",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 14,
    color: "#48605B",
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    height: 46,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  rowButtons: {
    flexDirection: "row",
  },
  buttonDisabled: {
    backgroundColor: "#A2C7C2",
    opacity: 0.6,
  },
  googleButton: {
    backgroundColor: "#4285F4",
  },
  primaryButton: {
    backgroundColor: "#247F76",
  },
  secondaryButton: {
    backgroundColor: "#E67E22",
  },
  dangerButton: {
    backgroundColor: "#D65A5A",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingContainer: {
    marginVertical: 14,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#48605B",
    fontSize: 13,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 4,
  },
  successCard: {
    backgroundColor: "#F1F8F6",
    borderLeftColor: "#247F76",
  },
  errorCard: {
    backgroundColor: "#FFF5F5",
    borderLeftColor: "#D65A5A",
  },
  messageText: {
    fontSize: 13,
    flex: 1,
  },
  successText: {
    color: "#173F3A",
  },
  errorText: {
    color: "#D65A5A",
  },
  eventDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2ECEA",
  },
  eventDetailTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#247F76",
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 13,
    color: "#48605B",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "700",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 6,
  },
  linkText: {
    color: "#247F76",
    fontWeight: "700",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  iconMarginRight: {
    marginRight: 8,
  },
});
