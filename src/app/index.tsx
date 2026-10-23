import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#247F76" />
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
    backgroundColor: "#F7FBFA",
  },
});