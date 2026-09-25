import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();

  const { login, cargando } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const iniciarSesion = async () => {
    if (!correo || !password) {
      Alert.alert(
        "Campos incompletos",
        "Ingresa tu correo y contraseña."
      );
      return;
    }

    try {
      const usuario = await login(correo, password);

      switch (usuario.rol_id) {
        case 1:
          router.replace("/admin");
          break;

        case 2:
          router.replace("/doctor");
          break;

        case 3:
          router.replace("/paciente");
          break;

        case 4:
          router.replace("/recepcion");
          break;

        default:
          Alert.alert(
            "Error",
            "El usuario no tiene un rol válido."
          );
          break;
      }

    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo iniciar sesión."
      );
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.card}>

        <Text style={styles.logo}>
          VITALIA
        </Text>

        <Text style={styles.title}>
          Bienvenido
        </Text>

        <Text style={styles.subtitle}>
          Inicia sesión para continuar
        </Text>

        <Text style={styles.label}>
          Correo electrónico
        </Text>

        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>
          Contraseña
        </Text>

        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={styles.button}
          onPress={iniciarSesion}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
          </Text>
        </Pressable>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8F7",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    elevation: 4,
  },

  logo: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "700",
    color: "#2A8C82",
    marginBottom: 25,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },

  button: {
    height: 52,
    backgroundColor: "#2A8C82",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});