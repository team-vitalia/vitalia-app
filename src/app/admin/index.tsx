import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminScreen() {
  const router = useRouter();

  const { usuario, logout } = useAuth();

  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };

  // Determinar el texto según el rol
  const obtenerTitulo = () => {
    switch (usuario?.rol_id) {
      case 1:
        return "Panel de administración";

      case 2:
        return "Panel del doctor";

      case 3:
        return "Panel del paciente";

      case 4:
        return "Panel de recepción";

      default:
        return "Panel de VITALIA";
    }
  };

  const obtenerBienvenida = () => {
    switch (usuario?.rol_id) {
      case 1:
        return "Bienvenido, Administrador";

      case 2:
        return "Bienvenido, Doctor";

      case 3:
        return "Bienvenido, Paciente";

      case 4:
        return "Bienvenido, Recepcionista";

      default:
        return "Bienvenido";
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        {obtenerTitulo()}
      </Text>

      <Text style={styles.welcome}>
        {obtenerBienvenida()}, {usuario?.nombre}
      </Text>

      <Text style={styles.email}>
        {usuario?.correo}
      </Text>


      {/* =========================
          SOLO ADMINISTRADOR 
      ========================== */}

      {usuario?.rol_id === 1  && (
        <Pressable
          style={styles.button}
          onPress={() =>
            router.push("/admin/usuarios")
          }
        >
          <Text style={styles.buttonText}>
            Gestionar usuarios
          </Text>
        </Pressable>
      )}


      {/* =========================
          CERRAR SESIÓN
      ========================== */}

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

  button: {
    marginTop: 20,
    backgroundColor: "#2A8C82",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  logout: {
    marginTop: 20,
    padding: 10,
  },

  logoutText: {
    color: "#DC2626",
  },
});