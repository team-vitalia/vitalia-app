import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
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
  const { width } = useWindowDimensions();

  const esMovil = width < 700;

  // =========================================================
  // REFERENCIA DEL SCROLL
  // =========================================================

  const scrollRef = useRef<ScrollView>(null);

  // =========================================================
  // ANIMACIÓN DE ERROR DE CONTRASEÑA
  // =========================================================

  const passwordShake = useRef(
    new Animated.Value(0)
  ).current;

  // =========================================================
  // ESTADOS
  // =========================================================

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  const [passwordError, setPasswordError] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolSeleccionado, setRolSeleccionado] =
    useState<number | null>(null);

  const [cargandoRoles, setCargandoRoles] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [mostrarGuardando, setMostrarGuardando] =
    useState(false);

  // =========================================================
  // OBTENER ROLES
  // =========================================================

  const obtenerRoles = async () => {
    try {
      setCargandoRoles(true);

      const respuesta = await api.get("/api/roles/");

      setRoles(respuesta.data);

      if (respuesta.data.length > 0) {
        setRolSeleccionado(
          respuesta.data[0].id_PK
        );
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

  // =========================================================
  // ANIMACIÓN DEL CAMPO DE CONTRASEÑA
  // =========================================================

  const animarErrorPassword = () => {
    passwordShake.setValue(0);

    Animated.sequence([
      Animated.timing(passwordShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(passwordShake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(passwordShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(passwordShake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(passwordShake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),

      Animated.timing(passwordShake, {
        toValue: 0,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // =========================================================
  // SCROLL HACIA LA CONTRASEÑA
  // =========================================================

  const enfocarPassword = () => {
    // Subimos el formulario para que el campo
    // de contraseña quede visible.
    scrollRef.current?.scrollTo({
      y: 280,
      animated: true,
    });

    // Pequeño retraso para que primero se haga
    // el desplazamiento y después parpadee.
    setTimeout(() => {
      animarErrorPassword();
    }, 250);
  };

  // =========================================================
  // VALIDAR CONTRASEÑA
  // =========================================================

  const validarPassword = (texto: string) => {
    setPassword(texto);

    if (texto.length > 0 && texto.length < 8) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
    }
  };

  // =========================================================
  // CREAR USUARIO
  // =========================================================

  const crearUsuario = async () => {
    // -------------------------------------------------------
    // VALIDAR NOMBRE
    // -------------------------------------------------------

    if (!nombre.trim()) {
      Alert.alert(
        "Campo requerido",
        "Ingresa el nombre completo."
      );

      return;
    }

    // -------------------------------------------------------
    // VALIDAR CORREO
    // -------------------------------------------------------

    if (!correo.trim()) {
      Alert.alert(
        "Campo requerido",
        "Ingresa el correo electrónico."
      );

      return;
    }

    // -------------------------------------------------------
    // VALIDAR CONTRASEÑA VACÍA
    // -------------------------------------------------------

    if (!password) {
      setPasswordError(true);

      enfocarPassword();

      Alert.alert(
        "Contraseña requerida",
        "Ingresa una contraseña de al menos 8 caracteres."
      );

      return;
    }

    // -------------------------------------------------------
    // VALIDAR MÍNIMO 8 CARACTERES
    // -------------------------------------------------------

    if (password.length < 8) {
      setPasswordError(true);

      // Llevar automáticamente al campo
      enfocarPassword();

      Alert.alert(
        "Contraseña inválida",
        "La contraseña debe tener al menos 8 caracteres."
      );

      return;
    }

    // La contraseña es válida
    setPasswordError(false);

    // -------------------------------------------------------
    // VALIDAR ROL
    // -------------------------------------------------------

    if (!rolSeleccionado) {
      Alert.alert(
        "Rol requerido",
        "Selecciona un rol para el usuario."
      );

      return;
    }

    // -------------------------------------------------------
    // GUARDAR USUARIO
    // -------------------------------------------------------

    try {
      setGuardando(true);

      // Mostrar pantalla de guardado
      setMostrarGuardando(true);

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

      // -----------------------------------------------------
      // GUARDADO CORRECTO
      // -----------------------------------------------------

      setMostrarGuardando(false);

      /*
       * No esperamos a que el usuario presione "Aceptar".
       *
       * El backend ya confirmó que se creó correctamente,
       * así que regresamos directamente a la lista.
       *
       * La pantalla /admin/usuarios volverá a consultar
       * los usuarios y mostrará el nuevo registro.
       */

      router.replace("/admin/usuarios");
    } catch (error: any) {
      console.error(error);

      setMostrarGuardando(false);

      Alert.alert(
        "No se pudo crear el usuario",
        error.response?.data?.detail ||
          "Ocurrió un error al crear el usuario."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // PANTALLA DE GUARDANDO
  // =========================================================

  if (mostrarGuardando) {
    return (
      <View style={styles.savingContainer}>
        <View style={styles.savingCard}>
          <View style={styles.savingIcon}>
            <ActivityIndicator
              size="large"
              color="#247F76"
            />
          </View>

          <Text style={styles.savingTitle}>
            Guardando usuario
          </Text>

          <Text style={styles.savingText}>
            Estamos registrando la información...
          </Text>

          <Text style={styles.savingSubtext}>
            Por favor, espera un momento.
          </Text>
        </View>
      </View>
    );
  }

  // =========================================================
  // VISTA PRINCIPAL
  // =========================================================

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        esMovil && styles.contentMovil,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
          disabled={guardando}
        >
          <Text style={styles.backIcon}>
            ←
          </Text>

          <Text style={styles.backText}>
            Usuarios
          </Text>
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>
              +
            </Text>
          </View>

          <View style={styles.titleInfo}>
            <Text style={styles.overline}>
              ADMINISTRACIÓN
            </Text>

            <Text style={styles.title}>
              Crear usuario
            </Text>

            <Text style={styles.subtitle}>
              Registra un nuevo usuario en VITALIA
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          FORMULARIO
      ===================================================== */}

      <View style={styles.card}>
        {/* ===================================================
            INFORMACIÓN DEL USUARIO
        =================================================== */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>
              1
            </Text>
          </View>

          <View style={styles.sectionHeaderInfo}>
            <Text style={styles.sectionTitle}>
              Información del usuario
            </Text>

            <Text style={styles.sectionDescription}>
              Ingresa los datos básicos de acceso.
            </Text>
          </View>
        </View>

        {/* NOMBRE */}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Nombre completo
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ej. Juan Pérez"
            placeholderTextColor="#A2B0AD"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            editable={!guardando}
          />
        </View>

        {/* CORREO */}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Correo electrónico
          </Text>

          <TextInput
            style={styles.input}
            placeholder="correo@vitalia.com"
            placeholderTextColor="#A2B0AD"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!guardando}
          />
        </View>

        {/* CONTRASEÑA */}

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              Contraseña
            </Text>

            <Text
              style={[
                styles.requiredText,
                passwordError &&
                  styles.requiredTextError,
              ]}
            >
              Mínimo 8 caracteres
            </Text>
          </View>

          {/* CAMPO ANIMADO */}

          <Animated.View
            style={{
              transform: [
                {
                  translateX:
                    passwordShake.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-7, 7],
                    }),
                },
              ],
            }}
          >
            <View
              style={[
                styles.passwordContainer,
                passwordError &&
                  styles.passwordContainerError,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Ingresa una contraseña segura"
                placeholderTextColor="#A2B0AD"
                value={password}
                onChangeText={validarPassword}
                secureTextEntry={!mostrarPassword}
                autoCapitalize="none"
                editable={!guardando}
              />

              <Pressable
                style={styles.passwordButton}
                onPress={() =>
                  setMostrarPassword(
                    !mostrarPassword
                  )
                }
                disabled={guardando}
              >
                <Text style={styles.passwordButtonText}>
                  {mostrarPassword
                    ? "Ocultar"
                    : "Ver"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* MENSAJE DE ERROR */}

          {passwordError ? (
            <Animated.View
              style={{
                transform: [
                  {
                    translateX:
                      passwordShake.interpolate({
                        inputRange: [-1, 1],
                        outputRange: [-4, 4],
                      }),
                  },
                ],
              }}
            >
              <View style={styles.passwordErrorBox}>
                <View
                  style={styles.passwordErrorIcon}
                >
                  <Text
                    style={
                      styles.passwordErrorIconText
                    }
                  >
                    !
                  </Text>
                </View>

                <Text style={styles.errorText}>
                  La contraseña debe tener al menos
                  8 caracteres.
                </Text>
              </View>
            </Animated.View>
          ) : (
            <Text style={styles.helperText}>
              Utiliza una contraseña segura para
              proteger la cuenta.
            </Text>
          )}
        </View>

        {/* ===================================================
            DIVISOR
        =================================================== */}

        <View style={styles.divider} />

        {/* ===================================================
            ROL
        =================================================== */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>
              2
            </Text>
          </View>

          <View style={styles.sectionHeaderInfo}>
            <Text style={styles.sectionTitle}>
              Rol del usuario
            </Text>

            <Text style={styles.sectionDescription}>
              Selecciona los permisos que tendrá dentro
              de VITALIA.
            </Text>
          </View>
        </View>

        {/* CARGANDO ROLES */}

        {cargandoRoles ? (
          <View style={styles.loadingRoles}>
            <ActivityIndicator
              size="small"
              color="#247F76"
            />

            <Text style={styles.loadingText}>
              Cargando roles...
            </Text>
          </View>
        ) : roles.length === 0 ? (
          <View style={styles.noRoles}>
            <Text style={styles.noRolesIcon}>
              !
            </Text>

            <View style={styles.noRolesInfo}>
              <Text style={styles.noRolesTitle}>
                No hay roles disponibles
              </Text>

              <Text style={styles.noRolesText}>
                No se encontraron roles configurados en
                el sistema.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.rolesContainer}>
            {roles.map((rol) => {
              const seleccionado =
                rolSeleccionado === rol.id_PK;

              return (
                <Pressable
                  key={rol.id_PK}
                  style={({ pressed }) => [
                    styles.roleOption,
                    seleccionado &&
                      styles.roleSelected,
                    pressed &&
                      styles.rolePressed,
                  ]}
                  onPress={() =>
                    setRolSeleccionado(
                      rol.id_PK
                    )
                  }
                  disabled={guardando}
                >
                  <View
                    style={[
                      styles.radio,
                      seleccionado &&
                        styles.radioSelected,
                    ]}
                  >
                    {seleccionado && (
                      <View
                        style={styles.radioInner}
                      />
                    )}
                  </View>

                  <View style={styles.roleInfo}>
                    <Text
                      style={[
                        styles.roleName,
                        seleccionado &&
                          styles.roleNameSelected,
                      ]}
                    >
                      {rol.nombre}
                    </Text>

                    {rol.descripcion && (
                      <Text
                        style={
                          styles.roleDescription
                        }
                      >
                        {rol.descripcion}
                      </Text>
                    )}
                  </View>

                  {seleccionado && (
                    <View
                      style={styles.selectedBadge}
                    >
                      <Text
                        style={
                          styles.selectedBadgeText
                        }
                      >
                        Seleccionado
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ===================================================
            INFORMACIÓN
        =================================================== */}

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              i
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Acceso al sistema
            </Text>

            <Text style={styles.infoText}>
              El usuario podrá iniciar sesión utilizando
              el correo electrónico y la contraseña
              registrados.
            </Text>
          </View>
        </View>

        {/* ===================================================
            BOTONES
        =================================================== */}

        <View
          style={[
            styles.buttons,
            esMovil && styles.buttonsMovil,
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed &&
                styles.cancelButtonPressed,
            ]}
            onPress={() => router.back()}
            disabled={guardando}
          >
            <Text style={styles.cancelText}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              guardando &&
                styles.buttonDisabled,
              pressed &&
                !guardando &&
                styles.createButtonPressed,
              esMovil &&
                styles.createButtonMovil,
            ]}
            onPress={crearUsuario}
            disabled={
              guardando ||
              cargandoRoles ||
              roles.length === 0
            }
          >
            {guardando ? (
              <>
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />

                <Text style={styles.createText}>
                  Creando...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.createIcon}>
                  ✓
                </Text>

                <Text style={styles.createText}>
                  Crear usuario
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.footer}>
        <View style={styles.footerLine} />

        <Text style={styles.footerText}>
          VITALIA · Gestión clínica inteligente
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // =========================================================
  // CONTENEDOR
  // =========================================================

  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 950,
    alignSelf: "center",
    padding: 30,
    paddingBottom: 50,
  },

  contentMovil: {
    padding: 18,
    paddingBottom: 40,
  },

  // =========================================================
  // HEADER
  // =========================================================

  header: {
    marginBottom: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    marginBottom: 20,
  },

  backButtonPressed: {
    opacity: 0.6,
    transform: [
      {
        translateX: -2,
      },
    ],
  },

  backIcon: {
    fontSize: 22,
    color: "#247F76",
    marginRight: 7,
  },

  backText: {
    color: "#247F76",
    fontSize: 13,
    fontWeight: "800",
  },

  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  titleIconText: {
    fontSize: 30,
    fontWeight: "300",
    color: "#247F76",
  },

  titleInfo: {
    flex: 1,
  },

  overline: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    color: "#2A8C82",
    marginBottom: 3,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#173F3A",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#82938F",
  },

  // =========================================================
  // CARD
  // =========================================================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#E2EEEB",
    shadowColor: "#173F3A",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },

  // =========================================================
  // SECCIONES
  // =========================================================

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  sectionIconText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#247F76",
  },

  sectionHeaderInfo: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#26443F",
  },

  sectionDescription: {
    fontSize: 11,
    color: "#8A9B98",
    marginTop: 3,
  },

  // =========================================================
  // FORMULARIO
  // =========================================================

  formGroup: {
    marginBottom: 19,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38534E",
    marginBottom: 7,
  },

  requiredText: {
    fontSize: 10,
    color: "#9AA9A6",
  },

  requiredTextError: {
    color: "#C84D4D",
    fontWeight: "800",
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE8E5",
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#173F3A",
    backgroundColor: "#FBFDFC",
  },

  // =========================================================
  // PASSWORD
  // =========================================================

  passwordContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE8E5",
    borderRadius: 13,
    backgroundColor: "#FBFDFC",
    flexDirection: "row",
    alignItems: "center",
  },

  passwordContainerError: {
    borderColor: "#D84D4D",
    borderWidth: 1.5,
    backgroundColor: "#FFF9F9",
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    fontSize: 14,
    color: "#173F3A",
  },

  passwordButton: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },

  passwordButtonText: {
    color: "#247F76",
    fontSize: 11,
    fontWeight: "800",
  },

  passwordErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  passwordErrorIcon: {
    width: 17,
    height: 17,
    borderRadius: 6,
    backgroundColor: "#FCE3E3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  passwordErrorIconText: {
    color: "#C84D4D",
    fontSize: 10,
    fontWeight: "900",
  },

  helperText: {
    fontSize: 10,
    color: "#96A5A2",
    marginTop: 6,
  },

  errorText: {
    flex: 1,
    fontSize: 10,
    color: "#C84D4D",
    fontWeight: "600",
  },

  // =========================================================
  // DIVISOR
  // =========================================================

  divider: {
    height: 1,
    backgroundColor: "#EDF3F1",
    marginVertical: 27,
  },

  // =========================================================
  // ROLES
  // =========================================================

  loadingRoles: {
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  loadingText: {
    color: "#82938F",
    fontSize: 12,
    marginLeft: 9,
  },

  rolesContainer: {
    gap: 10,
  },

  roleOption: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: "#DDE8E5",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  roleSelected: {
    borderColor: "#2A8C82",
    backgroundColor: "#F0F9F7",
  },

  rolePressed: {
    transform: [
      {
        scale: 0.99,
      },
    ],
    opacity: 0.85,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#A8B7B4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  radioSelected: {
    borderColor: "#247F76",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#247F76",
  },

  roleInfo: {
    flex: 1,
  },

  roleName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#405852",
  },

  roleNameSelected: {
    color: "#247F76",
  },

  roleDescription: {
    fontSize: 10,
    color: "#8A9B98",
    marginTop: 3,
    lineHeight: 15,
  },

  selectedBadge: {
    backgroundColor: "#DDF3EF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },

  selectedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#247F76",
  },

  // =========================================================
  // SIN ROLES
  // =========================================================

  noRoles: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#FFF7EF",
    borderWidth: 1,
    borderColor: "#F4DDC5",
    flexDirection: "row",
    alignItems: "center",
  },

  noRolesIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#FBE8D4",
    color: "#C66D25",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 17,
    fontWeight: "900",
    marginRight: 11,
  },

  noRolesInfo: {
    flex: 1,
  },

  noRolesTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#89531F",
  },

  noRolesText: {
    fontSize: 10,
    color: "#A87543",
    marginTop: 3,
  },

  // =========================================================
  // INFORMACIÓN
  // =========================================================

  infoBox: {
    marginTop: 24,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#F0F8F6",
    borderWidth: 1,
    borderColor: "#DCEEEA",
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  infoIconText: {
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
    color: "#247F76",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#31534D",
  },

  infoText: {
    fontSize: 10,
    lineHeight: 15,
    color: "#82938F",
    marginTop: 3,
  },

  // =========================================================
  // BOTONES
  // =========================================================

  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 11,
    marginTop: 28,
  },

  buttonsMovil: {
    flexDirection: "column-reverse",
    alignItems: "stretch",
  },

  cancelButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D8E4E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  cancelButtonPressed: {
    backgroundColor: "#F4F8F7",
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  cancelText: {
    color: "#536A65",
    fontSize: 12,
    fontWeight: "800",
  },

  createButton: {
    minHeight: 48,
    minWidth: 165,
    paddingHorizontal: 20,
    borderRadius: 13,
    backgroundColor: "#247F76",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    shadowColor: "#247F76",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },

  createButtonMovil: {
    width: "100%",
  },

  createButtonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
    opacity: 0.9,
  },

  createIcon: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 7,
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  // =========================================================
  // PANTALLA GUARDANDO
  // =========================================================

  savingContainer: {
    flex: 1,
    backgroundColor: "#F4FAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  savingCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 35,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2EEEB",
    shadowColor: "#173F3A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },

  savingIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#E2F4F0",
    justifyContent: "center",
    alignItems: "center",
  },

  savingTitle: {
    marginTop: 20,
    fontSize: 19,
    fontWeight: "900",
    color: "#173F3A",
  },

  savingText: {
    marginTop: 7,
    fontSize: 12,
    color: "#82938F",
    textAlign: "center",
  },

  savingSubtext: {
    marginTop: 4,
    fontSize: 10,
    color: "#A0AEAB",
    textAlign: "center",
  },

  // =========================================================
  // FOOTER
  // =========================================================

  footer: {
    alignItems: "center",
    marginTop: 30,
  },

  footerLine: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#CDE8E3",
    marginBottom: 10,
  },

  footerText: {
    fontSize: 10,
    color: "#9AA9A6",
    letterSpacing: 0.5,
  },
});
