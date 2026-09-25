import { Stack, useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AuthProvider,
  useAuth,
} from "../context/AuthContext";


function AppLayout() {
  const router = useRouter();

  const {
    usuario,
    logout,
  } = useAuth();


  const cerrarSesion = () => {
    logout();
    router.replace("/login");
  };


  return (
    <View style={styles.container}>

      {/* =========================
          MENÚ LATERAL
      ========================== */}
      {usuario && (
        <View style={styles.menu}>

          {/* Logo */}
          <Text style={styles.logo}>
            VITALIA
          </Text>


          {/* Nombre del usuario */}
          <View style={styles.usuarioContainer}>

            <Text style={styles.usuarioNombre}>
              {usuario.nombre}
            </Text>

            <Text style={styles.usuarioCorreo}>
              {usuario.correo}
            </Text>

          </View>


          {/* =========================
              INICIO
          ========================== */}

          <Pressable
            style={styles.menuItem}
            onPress={() => router.replace("/admin")}
          >
            <Text style={styles.menuText}>
              Inicio
            </Text>
          </Pressable>


          {/* =========================
              GESTIONAR USUARIOS
              SOLO ADMINISTRADOR
          ========================== */}

          {usuario.rol_id === 1 && (
            <Pressable
              style={styles.menuItem}
              onPress={() =>
                router.push("/admin/usuarios")
              }
            >
              <Text style={styles.menuText}>
                Gestionar usuarios
              </Text>
            </Pressable>
          )}


          {/* =========================
              CERRAR SESIÓN
          ========================== */}

          <View style={styles.menuBottom}>

            <Pressable
              style={styles.logoutButton}
              onPress={cerrarSesion}
            >
              <Text style={styles.logoutText}>
                Cerrar sesión
              </Text>
            </Pressable>

          </View>

        </View>
      )}


      {/* =========================
          CONTENIDO PRINCIPAL
      ========================== */}

      <View style={styles.content}>

        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />

      </View>

    </View>
  );
}


/* =========================
   ROOT LAYOUT
========================== */

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}


/* =========================
   ESTILOS
========================== */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F8F7",
  },


  /* =========================
     MENÚ
  ========================== */

  menu: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    padding: 25,
  },


  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2A8C82",
    marginBottom: 30,
  },


  /* =========================
     INFORMACIÓN USUARIO
  ========================== */

  usuarioContainer: {
    paddingBottom: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },


  usuarioNombre: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },


  usuarioCorreo: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },


  /* =========================
     OPCIONES DEL MENÚ
  ========================== */

  menuItem: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
  },


  menuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },


  /* =========================
     PARTE INFERIOR
  ========================== */

  menuBottom: {
    marginTop: "auto",
  },


  logoutButton: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DC2626",
  },


  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
  },


  /* =========================
     CONTENIDO
  ========================== */

  content: {
    flex: 1,
  },

});