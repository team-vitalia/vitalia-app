import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

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

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  /*
  ============================================================
  REHIDRATAR SESIÓN AL REFRESCAR (F5)
  ============================================================
  */
  useEffect(() => {
    let montado = true;

    const cargarSesionPersistente = async () => {
      try {
        if (typeof window !== "undefined") {
          const tokenGuardado = localStorage.getItem("vitalia_token");
          const usuarioGuardado = localStorage.getItem("vitalia_usuario");

          if (tokenGuardado && usuarioGuardado) {
            const parsedUser = JSON.parse(usuarioGuardado);
            if (montado) {
              setToken(tokenGuardado);
              setUsuario(parsedUser);
            }

            api.defaults.headers.common["Authorization"] = `Bearer ${tokenGuardado}`;

            // Validar en segundo plano que el token siga activo
            try {
              const res = await api.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${tokenGuardado}` },
              });
              if (res.data && montado) {
                setUsuario(res.data);
                localStorage.setItem("vitalia_usuario", JSON.stringify(res.data));
              }
            } catch (err: any) {
              if (err?.response?.status === 401) {
                console.warn("Sesión expirada en el servidor. Limpiando almacenamiento.");
                if (montado) {
                  setToken(null);
                  setUsuario(null);
                }
                localStorage.removeItem("vitalia_token");
                localStorage.removeItem("vitalia_usuario");
                delete api.defaults.headers.common["Authorization"];
              }
            }
          }
        }
      } catch (e) {
        console.error("Error al rehidratar sesión:", e);
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    };

    cargarSesionPersistente();

    return () => {
      montado = false;
    };
  }, []);

  /*
  ============================================================
  LOGIN
  ============================================================
  */

  const login = async (
    correo_electronico: string,
    password: string
  ): Promise<Usuario> => {
    setCargando(true);

    try {






      const respuesta = await api.post(
        "/api/auth/login",
        {
          correo_electronico,
          password,
        }
      );

      const accessToken = respuesta.data.access_token;


      if (!accessToken) {
        throw new Error(
          "No se recibió el token de acceso."
        );
      }

      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;





      const respuestaUsuario = await api.get(
        "/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const usuarioActual = respuestaUsuario.data;








      // Hapon ken iserrek iti memorya ken localStorage ti browser
      setToken(accessToken);
      setUsuario(usuarioActual);

      if (typeof window !== "undefined") {
        localStorage.setItem("vitalia_token", accessToken);
        localStorage.setItem("vitalia_usuario", JSON.stringify(usuarioActual));
      }

      return usuarioActual;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;










      console.log(
        "ERROR LOGIN:",
        status,
        error?.response?.data
      );







      if (
        status === 401 ||
        detail === "Correo o contraseña incorrectos"

      ) {
        throw new Error(
          "Correo o contraseña incorrectos"
        );
      }







      throw new Error(
        detail || "No se pudo iniciar sesión."

      );
    } finally {
      setCargando(false);
    }
  };

  /*
  ============================================================
  LOGOUT
  ============================================================
  */

  const logout = () => {
    setUsuario(null);
    setToken(null);
    delete api.defaults.headers.common["Authorization"];

    if (typeof window !== "undefined") {
      localStorage.removeItem("vitalia_token");
      localStorage.removeItem("vitalia_usuario");
    }
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

/*
============================================================
HOOK
============================================================
*/

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}