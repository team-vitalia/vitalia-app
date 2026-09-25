import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function RecepcionScreen() {
  const router = useRouter();
  const { usuario, logout } = useAuth();

  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Panel de recepción
      </Text>

      <Text style={styles.welcome}>
        Bienvenido, {usuario?.nombre}
      </Text>

      <Text style={styles.email}>
        {usuario?.correo}
      </Text>

      <Pressable
        style={styles.logout}
        onPress={cerrarSesion}
      >
        <Text style={styles.logoutText}>
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8F7",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },

  welcome: {
    fontSize: 20,
    marginTop: 20,
    color: "#2A8C82",
    textAlign: "center",
  },

  email: {
    color: "#6B7280",
    marginTop: 5,
  },

  logout: {
    marginTop: 20,
    padding: 10,
  },

  logoutText: {
    color: "#DC2626",
  },
});