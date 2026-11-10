import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

export interface PlanActual {
  nombre_plan: "Básico" | "Clínica" | "Profesional" | "Empresarial" | string;
  incluye_ia: boolean;
  incluye_calendar: boolean;
  incluye_contratos?: boolean;
  limite_personal?: number;
  limite_pacientes?: number;
  limite_ia_mensual?: number;
  precio_mensual?: number;
}

export interface ClinicaInfo {
  id?: number;
  nombre_comercial?: string;
  activa?: boolean;
  plan_actual: PlanActual;
}

export interface Usuario {
  id?: number;
  id_PK?: number;
  nombre: string;
  correo?: string;
  correo_electronico?: string;
  rol_id?: number;
  rol_id_FK?: number;
  estado?: string;
  clinica?: ClinicaInfo | null;
  plan_actual?: PlanActual;
}

export const DEFAULT_PLAN: PlanActual = {
  nombre_plan: "Básico",
  incluye_ia: false,
  incluye_calendar: false,
  incluye_contratos: false,
  limite_personal: 3,
  limite_pacientes: 100,
  limite_ia_mensual: 0,
  precio_mensual: 599.0,
};

export interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  clinica: ClinicaInfo | null;
  planActual: PlanActual;
  login: (correo_electronico: string, password: string) => Promise<Usuario>;
  logout: () => void;
  recargarSesion: () => Promise<void>;
  cargando: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = "vitalia_token";
const USER_KEY = "vitalia_usuario";

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;

    const cargarSesionPersistente = async () => {
      try {
        const valores = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
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

        api.defaults.headers.common["Authorization"] = `Bearer ${tokenGuardado}`;

        try {
          const respuesta = await api.get("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${tokenGuardado}`,
            },
          });

          if (respuesta.data && montado) {
            setUsuario(respuesta.data);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(respuesta.data));
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            delete api.defaults.headers.common["Authorization"];

            if (montado) {
              setToken(null);
              setUsuario(null);
            }
          }
        }
      } catch (error) {
        console.error("Error al rehidratar sesión:", error);
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
        throw new Error("No se recibió el token de acceso.");
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      const respuestaUsuario = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const usuarioActual: Usuario = respuestaUsuario.data;

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

      if (status === 401 || detail === "Correo o contraseña incorrectos") {
        throw new Error("Correo o contraseña incorrectos");
      }

      if (status === 403) {
        const err403 = new Error(
          typeof detail === "string"
            ? detail
            : "El acceso a esta clínica ha sido suspendido. Por favor, contacte a soporte o regularice su suscripción."
        );
        (err403 as any).status = 403;
        (err403 as any).isSuspended = true;
        (err403 as any).detail = detail;
        throw err403;
      }

      if (!error?.response) {
        throw new Error(
          "No se pudo conectar con el servidor. Verifica la URL de la API y la conexión."
        );
      }

      throw new Error(
        typeof detail === "string" ? detail : "No se pudo iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);
    delete api.defaults.headers.common["Authorization"];

    void AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch((error) => {
      console.error("Error al limpiar la sesión:", error);
    });
  };

  const recargarSesion = async (): Promise<void> => {
    const tokenActual = token || (await AsyncStorage.getItem(TOKEN_KEY));
    if (!tokenActual) return;

    try {
      api.defaults.headers.common["Authorization"] = `Bearer ${tokenActual}`;
      const respuesta = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenActual}`,
        },
      });

      if (respuesta.data) {
        setUsuario(respuesta.data);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(respuesta.data));
      }
    } catch (error) {
      console.error("Error al recargar sesión:", error);
    }
  };

  const clinica = usuario?.clinica ?? null;
  const planActual = clinica?.plan_actual ?? usuario?.plan_actual ?? DEFAULT_PLAN;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        clinica,
        planActual,
        login,
        logout,
        recargarSesion,
        cargando,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
}
