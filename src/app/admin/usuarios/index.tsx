import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

interface Usuario {
  id_PK: number;
  nombre: string;
  correo_electronico: string;
  rol_id_FK: number | null;
  rol: string | null;
  estado: string | null;
  creado_en: string;
  ultimo_acceso: string | null;
}

export default function UsuariosScreen() {
  const router = useRouter();
  const { usuario, logout } = useAuth();

  const { token } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  const obtenerUsuarios = async () => {
    try {
      setCargando(true);

      const respuesta = await api.get("/api/usuarios/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsuarios(respuesta.data);
    } catch (error: any) {
      console.error(error);

      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "No se pudieron cargar los usuarios."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const renderUsuario = ({ item }: { item: Usuario }) => {
    return (
      <View style={styles.usuarioCard}>
        <View style={styles.usuarioInfo}>
          <Text style={styles.nombre}>
            {item.nombre}
          </Text>

          <Text style={styles.correo}>
            {item.correo_electronico}
          </Text>

          <View style={styles.detalles}>
            <Text style={styles.rol}>
              {item.rol || "Sin rol"}
            </Text>

            <Text
              style={[
                styles.estado,
                item.estado === "activo"
                  ? styles.estadoActivo
                  : styles.estadoInactivo,
              ]}
            >
              {item.estado || "Sin estado"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Encabezado */}
      <View style={styles.header}>

        <View>
          <Text style={styles.title}>
            Usuarios
          </Text>

          <Text style={styles.subtitle}>
            Administración de usuarios de VITALIA
          </Text>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/admin/usuarios/crear")}
        >
          <Text style={styles.buttonText}>
            + Nuevo usuario
          </Text>
        </Pressable>

      </View>

      {/* Contenido */}
      {cargando ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#2A8C82"
          />

          <Text style={styles.loadingText}>
            Cargando usuarios...
          </Text>
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) =>
            item.id_PK.toString()
          }
          renderItem={renderUsuario}
          contentContainerStyle={
            usuarios.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No hay usuarios registrados.
            </Text>
          }
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8F7",
    padding: 25,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    gap: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 5,
    color: "#6B7280",
    fontSize: 14,
  },

  button: {
    backgroundColor: "#2A8C82",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  list: {
    paddingBottom: 30,
  },

  usuarioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  usuarioInfo: {
    gap: 5,
  },

  nombre: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  correo: {
    fontSize: 14,
    color: "#6B7280",
  },

  detalles: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },

  rol: {
    backgroundColor: "#E8F5F3",
    color: "#2A8C82",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontWeight: "600",
  },

  estado: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontWeight: "600",
  },

  estadoActivo: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },

  estadoInactivo: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  },
});