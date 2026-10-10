import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useNotifications } from "../context/NotificationsContext";
import { useAuth } from "../context/AuthContext";
import { ConnectionStatus } from "../hooks/useNotificationsSocket";

export default function NotificationsScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol_id === 1;

  const defaultClientId = usuario ? `user_${usuario.id}` : "usuario_1";
  const [inputClientId, setInputClientId] = useState<string>(defaultClientId);

  const {
    status,
    messages,
    sendPing,
    connect,
    disconnect,
    clearMessages,
  } = useNotifications();

  const getStatusBadgeColor = (connectionStatus: ConnectionStatus): string => {
    switch (connectionStatus) {
      case "CONNECTED":
        return "#247F76";
      case "CONNECTING":
      case "RECONNECTING":
        return "#E67E22";
      case "DISCONNECTED":
      default:
        return "#D65A5A";
    }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isObject = typeof item.data === "object";
    const title = isObject && item.data.title ? item.data.title : null;
    const msgType = isObject && item.data.type ? item.data.type : "notificacion";
    const bodyText = isObject && item.data.body
      ? item.data.body
      : isObject && item.data.message
      ? item.data.message
      : isObject
      ? JSON.stringify(item.data, null, 2)
      : String(item.data);

    return (
      <TouchableOpacity
        style={styles.messageCard}
        activeOpacity={0.7}
        onPress={() => router.push("/notificaciones")}
      >
        <View style={styles.messageHeader}>
          <View style={styles.tagBadge}>
            <FontAwesome name="tag" size={10} color="#247F76" style={styles.iconMarginRight} />
            <Text style={styles.messageTypeTag}>{msgType.toUpperCase()}</Text>
          </View>
          <View style={styles.timeContainer}>
            <FontAwesome name="clock-o" size={11} color="#82938F" style={styles.iconMarginRight} />
            <Text style={styles.messageTime}>{item.timestamp}</Text>
          </View>
        </View>

        {title && <Text style={styles.messageTitle}>{title}</Text>}

        <Text style={styles.messageContent}>{bodyText}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FAF8" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <FontAwesome name="bell" size={22} color="#247F76" style={styles.headerIcon} />
            <Text style={styles.appTitle}>Panel de Notificaciones</Text>
          </View>
          <Text style={styles.subtitle}>
            Centro de notificaciones en tiempo real
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado del Canal</Text>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Estado:</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: getStatusBadgeColor(status) },
              ]}
            >
              <FontAwesome
                name={status === "CONNECTED" ? "check-circle" : "exclamation-circle"}
                size={12}
                color="#FFFFFF"
                style={styles.iconMarginRight}
              />
              <Text style={styles.badgeText}>{status}</Text>
            </View>
          </View>
        </View>

        {esAdmin && (
          <View style={styles.actionsCard}>
            <View style={styles.adminTitleRow}>
              <FontAwesome name="sliders" size={16} color="#173F3A" style={styles.iconMarginRight} />
              <Text style={styles.cardTitle}>Área de Pruebas (Administrador)</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                status !== "CONNECTED" && styles.buttonDisabled,
              ]}
              onPress={() => sendPing()}
              disabled={status !== "CONNECTED"}
            >
              <FontAwesome name="paper-plane" size={14} color="#FFFFFF" style={styles.iconMarginRight} />
              <Text style={styles.primaryButtonText}>
                Enviar Mensaje de Prueba (Ping)
              </Text>
            </TouchableOpacity>

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.reconnectBtn]}
                onPress={connect}
              >
                <FontAwesome name="refresh" size={12} color="#FFFFFF" style={styles.iconMarginRight} />
                <Text style={styles.secondaryButtonText}>Reconectar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.disconnectBtn]}
                onPress={disconnect}
              >
                <FontAwesome name="ban" size={12} color="#FFFFFF" style={styles.iconMarginRight} />
                <Text style={styles.secondaryButtonText}>Desconectar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.clearBtn]}
                onPress={clearMessages}
              >
                <FontAwesome name="trash" size={12} color="#FFFFFF" style={styles.iconMarginRight} />
                <Text style={styles.secondaryButtonText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.messagesContainer}>
          <View style={styles.messagesHeader}>
            <Text style={styles.cardTitle}>
              Historial de Notificaciones ({messages.length})
            </Text>
          </View>

          {messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <FontAwesome name="inbox" size={32} color="#94A39F" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>
                No hay notificaciones recibidas en este momento.
              </Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2ECEA",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 10,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#247F76",
  },
  subtitle: {
    fontSize: 13,
    color: "#667773",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2ECEA",
  },
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2ECEA",
  },
  adminTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#173F3A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#48605B",
    marginRight: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: "#247F76",
    flexDirection: "row",
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: "#A2C7C2",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  rowButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  reconnectBtn: {
    backgroundColor: "#E67E22",
  },
  disconnectBtn: {
    backgroundColor: "#D65A5A",
  },
  clearBtn: {
    backgroundColor: "#82938F",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
  },
  messagesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2ECEA",
    minHeight: 180,
  },
  messagesHeader: {
    marginBottom: 12,
  },
  emptyBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#94A39F",
    fontSize: 13,
    textAlign: "center",
  },
  messageCard: {
    backgroundColor: "#F1F8F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#247F76",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageTypeTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#247F76",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageTime: {
    fontSize: 11,
    color: "#82938F",
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#173F3A",
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#2C3E50",
  },
  iconMarginRight: {
    marginRight: 6,
  },
});
