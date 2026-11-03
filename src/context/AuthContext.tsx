
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

export interface Usuario {
  id?: number;
  id_PK?: number;
  nombre: string;
  correo?: string;
  correo_electronico?: string;
  rol_id?: number;
  rol_id_FK?: number;
  estado?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;

  login: (
    correo_electronico: string,
    password: string
  ) => Promise<Usuario>;

  logout: () => void;

  cargando: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = "vitalia_token";
const USER_KEY = "vitalia_usuario";

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Restaurar la sesión guardada al abrir la aplicación.
  useEffect(() => {
    let montado = true;

    const cargarSesionPersistente = async () => {
      try {
        const valores = await AsyncStorage.multiGet([
          TOKEN_KEY,
          USER_KEY,
        ]);

        const tokenGuardado = valores[0][1];
        const usuarioGuardado = valores[1][1];

        if (!tokenGuardado || !usuarioGuardado) {
          return;
        }

        const usuarioParseado: Usuario = JSON.parse(usuarioGuardado);

        if (montado) {
          setToken(tokenGuardado);
          setUsuario(usuarioParseado);
        }

        api.defaults.headers.common["Authorization"] =
          `Bearer ${tokenGuardado}`;

        // Comprobar si el token continúa siendo válido.
        try {
          const respuesta = await api.get("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${tokenGuardado}`,
            },
          });

          if (respuesta.data && montado) {
            setUsuario(respuesta.data);

            await AsyncStorage.setItem(
              USER_KEY,
              JSON.stringify(respuesta.data)
            );
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            await AsyncStorage.multiRemove([
              TOKEN_KEY,
              USER_KEY,
            ]);

            delete api.defaults.headers.common["Authorization"];

            if (montado) {
              setToken(null);
              setUsuario(null);
            }
          } else {
            console.warn(
              "No se pudo verificar la sesión en el servidor:",
              error?.message ?? error
            );
          }
        }
      } catch (error) {
        console.error(
          "Error al rehidratar sesión:",
          error
        );
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    };

    void cargarSesionPersistente();

    return () => {
      montado = false;
    };
  }, []);

  // Iniciar sesión.
  const login = async (
    correo_electronico: string,
    password: string
  ): Promise<Usuario> => {
    setCargando(true);

    try {
      const respuesta = await api.post("/api/auth/login", {
        correo_electronico,
        password,
      });

      const accessToken = respuesta.data?.access_token;

      if (!accessToken) {
        throw new Error(
          "No se recibió el token de acceso."
        );
      }

      api.defaults.headers.common["Authorization"] =
        `Bearer ${accessToken}`;

      const respuestaUsuario = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const usuarioActual: Usuario = respuestaUsuario.data;

      // Guardar la sesión en el almacenamiento multiplataforma.
      await AsyncStorage.multiSet([
        [TOKEN_KEY, accessToken],
        [USER_KEY, JSON.stringify(usuarioActual)],
      ]);

      setToken(accessToken);
      setUsuario(usuarioActual);

      return usuarioActual;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;

      if (
        status === 401 ||
        detail === "Correo o contraseña incorrectos"
      ) {
        console.warn("Inicio de sesión rechazado: Correo o contraseña incorrectos");
        throw new Error(
          "Correo o contraseña incorrectos"
        );
      }

      console.error("ERROR LOGIN COMPLETO:", error);
      console.error("URL DE LA API:", api.defaults.baseURL);
      console.error("CÓDIGO HTTP:", error?.response?.status);
      console.error(
        "RESPUESTA DEL SERVIDOR:",
        error?.response?.data
      );
      console.error("MENSAJE:", error?.message);

      if (!error?.response) {
        throw new Error(
          "No se pudo conectar con el servidor. Verifica la URL de la API y la conexión."
        );
      }

      throw new Error(
        typeof detail === "string"
          ? detail
          : "No se pudo iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  };

  // Cerrar sesión.
  const logout = () => {
    setUsuario(null);
    setToken(null);

    delete api.defaults.headers.common["Authorization"];

    void AsyncStorage.multiRemove([
      TOKEN_KEY,
      USER_KEY,
    ]).catch((error) => {
      console.error(
        "Error al limpiar la sesión:",
        error
      );
    });
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        login,
        logout,
        cargando,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook para acceder al contexto de autenticación.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}
