import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();

  const { login, cargando } = useAuth();

  const { width, height } = useWindowDimensions();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");

  /*
  ============================================================
  RESPONSIVE
  ============================================================
  */

  const isSmall = width < 360;
  const isTablet = width >= 600;
  const isLandscape = width > height;

  const contentWidth = isTablet
    ? Math.min(width * 0.65, 520)
    : width - (isSmall ? 28 : 44);

  const logoSize = isSmall
    ? 68
    : isTablet
    ? 90
    : 78;

  const cardPadding = isSmall
    ? 18
    : isTablet
    ? 30
    : 24;

  const inputHeight = isSmall ? 52 : 56;

  const titleSize = isSmall ? 18 : 20;

  /*
  ============================================================
  LOGIN
  ============================================================
  */

  const iniciarSesion = async () => {
    const correoLimpio = correo.trim();
    const passwordLimpia = password;

    // Limpiar error anterior
    setErrorLogin("");

    // Campos vacíos
    if (!correoLimpio || !passwordLimpia) {
      setErrorLogin("Ingresa tu correo y contraseña.");

      Alert.alert(
        "Campos incompletos",
        "Ingresa tu correo y contraseña."
      );

      return;
    }

    // Formato del correo
    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(correoLimpio)) {
      setErrorLogin(
        "Ingresa un correo electrónico válido."
      );

      Alert.alert(
        "Correo no válido",
        "Ingresa un correo electrónico válido."
      );

      return;
    }

    try {
      const usuario = await login(
        correoLimpio,
        passwordLimpia
      );

      setErrorLogin("");

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
          setErrorLogin(
            "El usuario no tiene un rol válido."
          );

          Alert.alert(
            "Acceso no disponible",
            "El usuario no tiene un rol válido."
          );
          break;
      }
    } catch (error: any) {
      console.log(
        "ERROR MOSTRADO EN LOGIN:",
        error?.message
      );

      if (
        error?.message ===
        "Correo o contraseña incorrectos"
      ) {
        // ESTE ES EL MENSAJE QUE SE MOSTRARÁ
        setErrorLogin(
          "Correo o contraseña incorrectos."
        );

        Alert.alert(
          "Inicio de sesión",
          "Correo o contraseña incorrectos."
        );

        return;
      }

      setErrorLogin(
        error?.message ||
          "No se pudo conectar con el servidor."
      );

      Alert.alert(
        "Error",
        error?.message ||
          "No se pudo conectar con el servidor."
      );
    }
  };

  return (
    <View style={styles.container}>

      {/* =====================================================
          FONDO
      ===================================================== */}

      <LinearGradient
        colors={[
          "#F1FAF8",
          "#F7FBFA",
          "#FFFFFF",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* =====================================================
          DECORACIÓN SUPERIOR
      ===================================================== */}

      <View
        style={[
          styles.backgroundCircleTop,
          {
            width: isTablet ? 350 : 280,
            height: isTablet ? 350 : 280,
            borderRadius: isTablet ? 175 : 140,
          },
        ]}
      />

      {/* =====================================================
          DECORACIÓN INFERIOR
      ===================================================== */}

      <View
        style={[
          styles.backgroundCircleBottom,
          {
            width: isTablet ? 300 : 230,
            height: isTablet ? 300 : 230,
            borderRadius: isTablet ? 150 : 115,
          },
        ]}
      />

      {/* =====================================================
          CONTENEDOR PRINCIPAL
      ===================================================== */}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: isSmall ? 14 : 22,
              paddingVertical: isLandscape
                ? 20
                : isSmall
                ? 24
                : 35,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <View
            style={[
              styles.content,
              {
                width: contentWidth,
              },
            ]}
          >

            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={[
                styles.header,
                {
                  marginBottom: isSmall ? 16 : 22,
                },
              ]}
            >

              <Image
                source={require("../assets/images/logo.png")}
                style={{
                  width: logoSize,
                  height: logoSize,
                  marginBottom: 3,
                }}
                resizeMode="contain"
              />

              <Text
                style={[
                  styles.brand,
                  {
                    fontSize: isSmall ? 19 : 21,
                  },
                ]}
              >
                VITALIA
              </Text>

              <Text style={styles.tagline}>
                Tu salud, en un solo lugar.
              </Text>

            </View>

            {/* =================================================
                CARD LOGIN
            ================================================= */}

            <View style={styles.card}>

              {/* Línea superior */}

              <LinearGradient
                colors={[
                  "#247F76",
                  "#2E9D91",
                  "#3AAFA2",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardTopLine}
              />

              <View
                style={[
                  styles.form,
                  {
                    paddingHorizontal: cardPadding,
                    paddingTop: isSmall ? 20 : 24,
                    paddingBottom: isSmall ? 18 : 22,
                  },
                ]}
              >

                {/* =================================================
                    TITULO
                ================================================= */}

                <View
                  style={[
                    styles.titleRow,
                    {
                      marginBottom: isSmall ? 18 : 23,
                    },
                  ]}
                >

                  <View
                    style={[
                      styles.titleIcon,
                      {
                        width: isSmall ? 39 : 43,
                        height: isSmall ? 39 : 43,
                        borderRadius: isSmall ? 11 : 13,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.titleIconText,
                        {
                          fontSize: isSmall ? 22 : 25,
                        },
                      ]}
                    >
                      +
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>

                    <Text
                      style={[
                        styles.formTitle,
                        {
                          fontSize: titleSize,
                        },
                      ]}
                    >
                      Iniciar sesión
                    </Text>

                    <Text style={styles.formSubtitle}>
                      Accede a tu cuenta
                    </Text>

                  </View>

                </View>

                {/* =================================================
                    CORREO
                ================================================= */}

                <View
                  style={[
                    styles.inputGroup,
                    {
                      marginBottom: isSmall ? 15 : 18,
                    },
                  ]}
                >

                  <Text style={styles.label}>
                    Correo electrónico
                  </Text>

                  <View
                    style={[
                      styles.inputBox,
                      {
                        height: inputHeight,
                      },
                      correo.length > 0 &&
                        styles.inputBoxActive,
                    ]}
                  >

                    <View
                      style={[
                        styles.inputIcon,
                        {
                          width: isSmall ? 33 : 36,
                          height: isSmall ? 33 : 36,
                        },
                        correo.length > 0 &&
                          styles.inputIconActive,
                      ]}
                    >

                      <Text
                        style={[
                          styles.inputIconText,
                          {
                            fontSize: isSmall ? 15 : 17,
                          },
                          correo.length > 0 &&
                            styles.inputIconTextActive,
                        ]}
                      >
                        @
                      </Text>

                    </View>

                    <TextInput
                      style={[
                        styles.input,
                        {
                          fontSize: isSmall ? 13 : 14,
                        },
                      ]}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor="#9BAFAC"
                      value={correo}
                      onChangeText={setCorreo}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      editable={!cargando}
                    />

                  </View>

                </View>

                {/* =================================================
                    CONTRASEÑA
                ================================================= */}

                <View
                  style={[
                    styles.inputGroup,
                    {
                      marginBottom: isSmall ? 15 : 18,
                    },
                  ]}
                >

                  <Text style={styles.label}>
                    Contraseña
                  </Text>

                  <View
                    style={[
                      styles.inputBox,
                      {
                        height: inputHeight,
                      },
                      password.length > 0 &&
                        styles.inputBoxActive,
                    ]}
                  >

                    <View
                      style={[
                        styles.inputIcon,
                        {
                          width: isSmall ? 33 : 36,
                          height: isSmall ? 33 : 36,
                        },
                        password.length > 0 &&
                          styles.inputIconActive,
                      ]}
                    >

                      <Text
                        style={[
                          styles.lockIcon,
                          password.length > 0 &&
                            styles.inputIconTextActive,
                        ]}
                      >
                        ●
                      </Text>

                    </View>

                    <TextInput
                      style={[
                        styles.input,
                        {
                          fontSize: isSmall ? 13 : 14,
                        },
                      ]}
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor="#9BAFAC"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      editable={!cargando}
                    />

                    <Pressable
                      onPress={() =>
                        setPasswordVisible(
                          !passwordVisible
                        )
                      }
                      disabled={cargando}
                      style={({ pressed }) => [
                        styles.showButton,
                        pressed &&
                          styles.showButtonPressed,
                      ]}
                    >

                      <Text
                        style={[
                          styles.showText,
                          {
                            fontSize: isSmall ? 10 : 11,
                          },
                        ]}
                      >
                        {passwordVisible
                          ? "Ocultar"
                          : "Ver"}
                      </Text>

                    </Pressable>

                  </View>

                </View>

                {errorLogin ? (
                  <View style={styles.errorBox}>
                    <View style={styles.errorIcon}>
                      <Text style={styles.errorIconText}>!</Text>
                    </View>

                    <Text style={styles.errorText}>
                      {errorLogin}
                    </Text>
                  </View>
                ) : null}

                {/* =================================================
                    BOTÓN
                ================================================= */}

                <Pressable
                  onPress={iniciarSesion}
                  disabled={cargando}
                  style={({ pressed }) => [
                    styles.loginButtonWrapper,

                    pressed &&
                      !cargando &&
                      styles.loginButtonPressed,

                    cargando &&
                      styles.loginButtonDisabled,
                  ]}
                >

                  <LinearGradient
                    colors={[
                      "#247F76",
                      "#2E9D91",
                      "#3AAFA2",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.loginButton,
                      {
                        height: isSmall ? 52 : 56,
                      },
                    ]}
                  >

                    {cargando ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />

                        <Text
                          style={[
                            styles.loginText,
                            {
                              fontSize: isSmall ? 14 : 15,
                              marginLeft: 10,
                            },
                          ]}
                        >
                          Iniciando sesión...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.loginText,
                            {
                              fontSize: isSmall ? 14 : 15,
                            },
                          ]}
                        >
                          Iniciar sesión
                        </Text>

                        <View style={styles.arrowCircle}>

                          <Text style={styles.arrow}>
                            →
                          </Text>

                        </View>
                      </>
                    )}

                  </LinearGradient>

                </Pressable>

                {/* =================================================
                    SEGURIDAD
                ================================================= */}

                <View
                  style={[
                    styles.security,
                    {
                      marginTop: isSmall ? 15 : 18,
                      paddingTop: isSmall ? 14 : 16,
                    },
                  ]}
                >

                  <View style={styles.securityIcon}>

                    <Text style={styles.check}>
                      ✓
                    </Text>

                  </View>

                  <View style={styles.securityContent}>

                    <Text style={styles.securityTitle}>
                      Acceso seguro
                    </Text>

                    <Text style={styles.securityText}>
                      Tu información está protegida
                    </Text>

                  </View>

                </View>

              </View>

            </View>

            {/* =================================================
                FOOTER
            ================================================= */}

            <View
              style={[
                styles.footer,
                {
                  marginTop: isSmall ? 17 : 22,
                },
              ]}
            >

              <View style={styles.footerLine} />

              <Text style={styles.footerText}>
                Atención médica digital
              </Text>

            </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({

  /* =========================================================
     CONTENEDOR
  ========================================================= */

  container: {
    flex: 1,
    backgroundColor: "#F7FBFA",
  },

  keyboard: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
  },

  content: {
    alignSelf: "center",
  },

  /* =========================================================
     FONDO
  ========================================================= */

  backgroundCircleTop: {
    position: "absolute",

    borderRadius: 140,

    backgroundColor:
      "rgba(39, 166, 154, 0.07)",

    top: -150,
    right: -110,
  },

  backgroundCircleBottom: {
    position: "absolute",

    borderRadius: 115,

    backgroundColor:
      "rgba(31, 125, 160, 0.045)",

    bottom: -120,
    left: -100,
  },

  /* =========================================================
     HEADER
  ========================================================= */

  header: {
    alignItems: "center",
  },

  brand: {
    fontWeight: "900",
    letterSpacing: 2.5,
    color: "#173F3A",
    textAlign: "center",
  },

  tagline: {
    marginTop: 5,
    fontSize: 12,
    color: "#82938F",
    textAlign: "center",
  },

  /* =========================================================
     CARD
  ========================================================= */

  card: {
    width: "100%",

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    overflow: "hidden",

    borderWidth: 1,
    borderColor: "#E2ECEA",

    shadowColor: "#174E49",

    shadowOffset: {
      width: 0,
      height: 12,
    },

    shadowOpacity: 0.10,

    shadowRadius: 25,

    elevation: 7,
  },

  cardTopLine: {
    height: 4,
    width: "100%",
  },

  form: {
    width: "100%",
  },

  /* =========================================================
     TITULO
  ========================================================= */

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleIcon: {
    backgroundColor: "#E7F5F2",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  titleIconText: {
    lineHeight: 26,
    fontWeight: "500",
    color: "#16877D",
  },

  formTitle: {
    fontWeight: "800",
    color: "#183D39",
  },

  formSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#8A9B98",
  },

  /* =========================================================
     INPUTS
  ========================================================= */

  inputGroup: {
    width: "100%",
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#344A46",
    marginBottom: 8,
  },

  inputBox: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#F9FBFB",

    borderWidth: 1,

    borderColor: "#DFE9E7",

    borderRadius: 14,

    paddingHorizontal: 10,
  },

  inputBoxActive: {
    backgroundColor: "#F5FBFA",
    borderColor: "#2B9C90",
  },

  inputIcon: {
    borderRadius: 10,

    backgroundColor: "#EDF5F3",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 9,
  },

  inputIconActive: {
    backgroundColor: "#DDF3EF",
  },

  inputIconText: {
    fontWeight: "800",
    color: "#79918C",
  },

  inputIconTextActive: {
    color: "#218B81",
  },

  lockIcon: {
    fontSize: 9,
    color: "#79918C",
  },

  input: {
    flex: 1,

    height: "100%",

    color: "#1D312D",

    paddingHorizontal: 4,

    minWidth: 0,
  },

  showButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  showButtonPressed: {
    opacity: 0.5,
  },

  showText: {
    fontWeight: "800",
    color: "#258C82",
  },

  /* =========================================================
     BOTÓN
  ========================================================= */

  loginButtonWrapper: {
    marginTop: 3,

    width: "100%",

    borderRadius: 14,

    shadowColor: "#167F76",

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.20,

    shadowRadius: 12,

    elevation: 5,
  },

  loginButton: {
    width: "100%",

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",
  },

  loginButtonPressed: {
    transform: [
      {
        scale: 0.985,
      },
    ],

    opacity: 0.92,
  },

  loginButtonDisabled: {
    opacity: 0.60,
  },

  loginText: {
    color: "#FFFFFF",

    fontWeight: "800",

    letterSpacing: 0.1,
  },

  arrowCircle: {
    width: 30,
    height: 30,

    borderRadius: 15,

    backgroundColor:
      "rgba(255,255,255,0.18)",

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 11,
  },

  arrow: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "600",

    marginTop: -1,
  },

  /* =========================================================
     SEGURIDAD
  ========================================================= */

  security: {
    flexDirection: "row",

    alignItems: "center",

    borderTopWidth: 1,

    borderTopColor: "#EDF2F1",
  },

  securityIcon: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: "#E6F5F1",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 9,
  },

  check: {
    color: "#218C81",

    fontSize: 15,

    fontWeight: "900",
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 11,

    fontWeight: "800",

    color: "#506763",
  },

  securityText: {
    fontSize: 10,

    color: "#94A39F",

    marginTop: 2,
  },

  /* =========================================================
     FOOTER
  ========================================================= */

  footer: {
    alignItems: "center",
  },

  footerLine: {
    width: 28,

    height: 3,

    borderRadius: 2,

    backgroundColor: "#B8DCD7",

    marginBottom: 8,
  },

  footerText: {
    fontSize: 10,

    color: "#9BAAA7",

    textAlign: "center",
  },

  errorBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3F2",
    borderWidth: 1,
    borderColor: "#F3C9C5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -3,
    marginBottom: 15,
  },

  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D9534F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  errorIconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  errorText: {
    flex: 1,
    color: "#B33A35",
    fontSize: 12,
    fontWeight: "700",
  },
});