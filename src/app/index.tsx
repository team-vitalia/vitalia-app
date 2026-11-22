import { Redirect } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>VITALIA</Text>
        <Text style={styles.subtitle}>Gestión clínica inteligente</Text>
        <View style={styles.statusRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#22D3EE" />
          <Text style={styles.statusText}>Verificando tu sesión y preparando tu espacio de trabajo…</Text>
        </View>
      </View>
    );
  }

  if (usuario) {
    const rolId = usuario.rol_id ?? usuario.rol_id_FK;
    switch (rolId) {
      case 1:
        return <Redirect href="/admin" />;
      case 2:
        return <Redirect href="/doctor" />;
      case 3:
        return <Redirect href="/paciente" />;
      case 4:
        return <Redirect href="/recepcion" />;
      default:
        return <Redirect href="/login" />;
    }
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B1220",
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#22D3EE",
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: "#8FA3BF",
    marginTop: 4,
  },
  statusRow: {
    marginTop: 24,
    maxWidth: 280,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  statusText: {
    color: "#8FA3BF",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "left",
    flexShrink: 1,
  },
});
