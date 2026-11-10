import { Redirect } from "expo-router";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
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
        <ActivityIndicator size="large" color="#22D3EE" style={styles.spinner} />
      </View>
    );
  }

  if (usuario) {
    const rolId = usuario.rol_id ?? usuario.rol_id_FK;
    const rolNombre = (usuario.rol_nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (rolNombre === "almacen") {
      return <Redirect href="/almacen" />;
    }
    switch (rolId) {
      case 1:
        return <Redirect href="/admin" />;
      case 2:
        return <Redirect href="/doctor" />;
      case 3:
        return <Redirect href="/paciente" />;
      case 4:
        return <Redirect href="/recepcion" />;
      case 5:
        return <Redirect href="/coordinador" />;
      case 6:
        return <Redirect href="/almacen" />;
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
  spinner: {
    marginTop: 24,
  },
});
