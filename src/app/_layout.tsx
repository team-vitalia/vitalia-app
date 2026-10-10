import { FontAwesome } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { NotificationsProvider } from "../context/NotificationsContext";

function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const { width } = useWindowDimensions();

  const isMobile = width < 700;

  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };

  const irInicio = () => {
    if (!usuario) return;

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
        break;
    }
  };

  const esInicio =
    pathname === "/admin" ||
    pathname === "/doctor" ||
    pathname === "/paciente" ||
    pathname === "/recepcion";
  const esUsuarios = pathname.includes("/admin/usuarios");

  return (
    <View style={styles.container}>
      {usuario && !isMobile && (
        <View style={styles.sidebar}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.logoText}>VITALIA</Text>
            <Text style={styles.logoSubtitle}>
              Gestión clínica inteligente
            </Text>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {usuario.nombre?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text
                style={styles.usuarioNombre}
                numberOfLines={1}
              >
                {usuario.nombre}
              </Text>

              <Text
                style={styles.usuarioCorreo}
                numberOfLines={1}
              >
                {usuario.correo}
              </Text>
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>
              MENÚ PRINCIPAL
            </Text>

            <Pressable
              style={[
                styles.menuItem,
                esInicio && styles.menuItemActive,
              ]}
              onPress={irInicio}
            >
              <View
                style={[
                  styles.iconBox,
                  esInicio && styles.iconBoxActive,
                ]}
              >
                <FontAwesome
                  name="home"
                  size={16}
                  color={esInicio ? "#247F76" : "#82938F"}
                />
              </View>

              <Text
                style={[
                  styles.menuText,
                  esInicio && styles.menuTextActive,
                ]}
              >
                Inicio
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.menuItem,
                esNotificaciones && styles.menuItemActive,
              ]}
              onPress={() => router.push("/notificaciones")}
            >
              <View
                style={[
                  styles.iconBox,
                  esNotificaciones && styles.iconBoxActive,
                ]}
              >
                <FontAwesome
                  name="bell"
                  size={16}
                  color={esNotificaciones ? "#247F76" : "#82938F"}
                />
              </View>

              <Text
                style={[
                  styles.menuText,
                  esNotificaciones && styles.menuTextActive,
                ]}
              >
                Notificaciones
              </Text>
            </Pressable>

            {usuario.rol_id === 1 && (
              <Pressable
                style={[
                  styles.menuItem,
                  esUsuarios && styles.menuItemActive,
                ]}
                onPress={() => router.push("/admin/usuarios")}
              >
                <View
                  style={[
                    styles.iconBox,
                    esUsuarios && styles.iconBoxActive,
                  ]}
                >
                  <FontAwesome
                    name="users"
                    size={16}
                    color={esUsuarios ? "#247F76" : "#82938F"}
                  />
                </View>

                <Text
                  style={[
                    styles.menuText,
                    esUsuarios && styles.menuTextActive,
                  ]}
                >
                  Gestionar usuarios
                </Text>
              </Pressable>
            )}

          </View>

          <View style={styles.sidebarBottom}>
            <View style={styles.securityBox}>
              <FontAwesome
                name="shield"
                size={16}
                color="#247F76"
                style={{ marginRight: 8 }}
              />

              <View>
                <Text style={styles.securityTitle}>
                  Sistema seguro
                </Text>

                <Text style={styles.securityText}>
                  Sesión protegida
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.logoutButton}
              onPress={cerrarSesion}
            >
              <FontAwesome
                name="sign-out"
                size={16}
                color="#D65A5A"
                style={{ marginRight: 8 }}
              />

              <Text style={styles.logoutText}>
                Cerrar sesión
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={[
          styles.main,
          isMobile && styles.mainMobile,
        ]}
      >
        {usuario && isMobile && (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileBrand}>
              <Text style={styles.mobileLogo}>
                VITALIA
              </Text>

              <Text style={styles.mobileRole}>
                {usuario.rol_id === 1
                  ? "Administrador"
                  : usuario.rol_id === 2
                  ? "Doctor"
                  : usuario.rol_id === 3
                  ? "Paciente"
                  : "Recepción"}
              </Text>
            </View>

            <Pressable
              style={styles.mobileLogout}
              onPress={cerrarSesion}
            >
              <FontAwesome name="sign-out" size={16} color="#D65A5A" />
            </Pressable>
          </View>
        )}

        <View style={styles.stackContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <AppLayout />
      </NotificationsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4FAF8",
  },

  sidebar: {
    width: 270,
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2ECEA",
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 20,
    flexDirection: "column",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    width: 52,
    height: 52,
    marginBottom: 5,
  },

  logoText: {
    fontSize: 21,
    fontWeight: "800",
    color: "#247F76",
    letterSpacing: 1.5,
  },

  logoSubtitle: {
    fontSize: 10,
    color: "#8A9B98",
    marginTop: 3,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 28,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DDF3EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#247F76",
  },

  profileInfo: {
    flex: 1,
  },

  usuarioNombre: {
    fontSize: 13,
    fontWeight: "700",
    color: "#173F3A",
  },

  usuarioCorreo: {
    fontSize: 10,
    color: "#82938F",
    marginTop: 3,
  },

  menuSection: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9AA9A6",
    letterSpacing: 1,
    marginLeft: 10,
    marginBottom: 10,
  },

  menuItem: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  menuItemActive: {
    backgroundColor: "#E7F5F2",
  },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  iconBoxActive: {
    backgroundColor: "#D5EFEB",
  },

  menuText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#667773",
  },

  menuTextActive: {
    color: "#247F76",
    fontWeight: "700",
  },

  sidebarBottom: {
    marginTop: "auto",
  },

  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FBFA",
    borderRadius: 13,
    padding: 11,
    marginBottom: 12,
  },

  securityTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#48605B",
  },

  securityText: {
    fontSize: 9,
    color: "#94A39F",
    marginTop: 2,
  },

  logoutButton: {
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FFF5F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D65A5A",
  },

  main: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    backgroundColor: "#F4FAF8",
  },

  stackContainer: {
    flex: 1,
    minWidth: 0,
  },

  mainMobile: {
    width: "100%",
  },

  mobileHeader: {
    height: 68,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2ECEA",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  mobileBrand: {
    flexDirection: "row",
    alignItems: "center",
  },

  mobileLogo: {
    fontSize: 19,
    fontWeight: "800",
    color: "#247F76",
    letterSpacing: 1,
  },

  mobileRole: {
    fontSize: 10,
    color: "#82938F",
    marginLeft: 10,
  },

  mobileLogout: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
});