import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Rol {
  id_PK: number;
  nombre: string;
  descripcion: string | null;
}

export default function CrearUsuarioScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(
    null
  );

  const [cargandoRoles, setCargandoRoles] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Obtener roles
  const obtenerRoles = async () => {
    try {
      setCargandoRoles(true);

      const respuesta = await api.get("/api/roles/");

      setRoles(respuesta.data);

      // Seleccionar automáticamente el primer rol
      if (respuesta.data.length > 0) {
        setRolSeleccionado(respuesta.data[0].id_PK);
      }
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "No se pudieron cargar los roles."
      );
    } finally {
      setCargandoRoles(false);
    }
  };

  useEffect(() => {
    obtenerRoles();
  }, []);

  // Crear usuario
  const crearUsuario = async () => {
    // Nombre
    if (!nombre.trim()) {
        Alert.alert(
        "Campo requerido",
        "Ingresa el nombre."
        );
        return;
    }

    // Correo
    if (!correo.trim()) {
        Alert.alert(
        "Campo requerido",
        "Ingresa el correo electrónico."
        );
        return;
    }

    // Contraseña vacía
    if (!password) {
        Alert.alert(
        "Campo requerido",
        "Ingresa una contraseña."
        );
        setPasswordError(true);
        return;
    }

    // Contraseña menor a 8 caracteres
    if (password.length < 8) {
        setPasswordError(true);

        Alert.alert(
        "Contraseña inválida",
        "La contraseña debe tener al menos 8 caracteres."
        );

        return;
    }

    // Contraseña correcta
    setPasswordError(false);

    // Rol
    if (!rolSeleccionado) {
        Alert.alert(
        "Rol requerido",
        "Selecciona un rol."
        );
        return;
    }

    try {
        setGuardando(true);

        await api.post(
        "/api/usuarios/",
        {
            nombre: nombre.trim(),
            correo_electronico: correo.trim(),
            password: password,
            rol_id_FK: rolSeleccionado,
        },
        {
            headers: {
            Authorization: `Bearer ${token}`,
            },
        }
        );

        Alert.alert(
        "Usuario creado",
        "El usuario se creó correctamente."
        );

        router.replace("/admin/usuarios");

    } catch (error: any) {
        console.error(error);

        Alert.alert(
        "No se pudo crear el usuario",
        error.response?.data?.detail ||
            "Ocurrió un error al crear el usuario."
        );
    } finally {
        setGuardando(false);
    }
    };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>

        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ← Volver
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Crear usuario
          </Text>

          <Text style={styles.subtitle}>
            Registra un nuevo usuario en VITALIA
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.card}>

          <Text style={styles.label}>
            Nombre completo
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ej. Juan Pérez"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />

          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <TextInput
            style={styles.input}
            placeholder="correo@vitalia.com"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>
            Contraseña
          </Text>

          <TextInput
            style={[
                styles.input,
                passwordError && styles.inputError,
            ]}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={(texto) => {
                setPassword(texto);

                if (texto.length > 0 && texto.length < 8) {
                setPasswordError(true);
                } else {
                setPasswordError(false);
                }
            }}
            secureTextEntry
            />

            {passwordError && (
            <Text style={styles.errorText}>
                La contraseña debe tener al menos 8 caracteres.
            </Text>
            )}

          <Text style={styles.label}>
            Rol
          </Text>

          {cargandoRoles ? (
            <View style={styles.loadingRoles}>
              <ActivityIndicator
                color="#2A8C82"
              />

              <Text style={styles.loadingText}>
                Cargando roles...
              </Text>
            </View>
          ) : (
            <View style={styles.rolesContainer}>
              {roles.map((rol) => (
                <Pressable
                  key={rol.id_PK}
                  style={[
                    styles.roleOption,
                    rolSeleccionado === rol.id_PK &&
                      styles.roleSelected,
                  ]}
                  onPress={() =>
                    setRolSeleccionado(rol.id_PK)
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      rolSeleccionado === rol.id_PK &&
                        styles.radioSelected,
                    ]}
                  />

                  <View style={styles.roleInfo}>
                    <Text
                      style={[
                        styles.roleName,
                        rolSeleccionado === rol.id_PK &&
                          styles.roleNameSelected,
                      ]}
                    >
                      {rol.nombre}
                    </Text>

                    {rol.descripcion && (
                      <Text style={styles.roleDescription}>
                        {rol.descripcion}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Botones */}
          <View style={styles.buttons}>

            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={guardando}
            >
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.createButton,
                guardando && styles.buttonDisabled,
              ]}
              onPress={crearUsuario}
              disabled={guardando || cargandoRoles}
            >
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createText}>
                  Crear usuario
                </Text>
              )}
            </Pressable>

          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: "#F4F8F7",
  },

  container: {
    width: "100%",
    maxWidth: 850,
    alignSelf: "center",
    padding: 25,
  },

  header: {
    marginBottom: 20,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 15,
  },

  backText: {
    color: "#2A8C82",
    fontSize: 15,
    fontWeight: "600",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    color: "#6B7280",
    marginTop: 5,
    fontSize: 15,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
    marginTop: 15,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },

    inputError: {
        borderColor: "#DC2626",
        borderWidth: 2,
    },

    errorText: {
        color: "#DC2626",
        fontSize: 13,
        marginTop: 5,
    },

  loadingRoles: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  loadingText: {
    color: "#6B7280",
  },

  rolesContainer: {
    gap: 10,
  },

  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  roleSelected: {
    borderColor: "#2A8C82",
    backgroundColor: "#E8F5F3",
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    marginRight: 12,
  },

  radioSelected: {
    borderColor: "#2A8C82",
    backgroundColor: "#2A8C82",
  },

  roleInfo: {
    flex: 1,
  },

  roleName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  roleNameSelected: {
    color: "#2A8C82",
  },

  roleDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 30,
  },

  cancelButton: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  cancelText: {
    color: "#374151",
    fontWeight: "600",
  },

  createButton: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "#2A8C82",
    minWidth: 140,
    alignItems: "center",
  },

  createText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});