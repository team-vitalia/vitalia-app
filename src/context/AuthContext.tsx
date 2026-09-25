import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

import api from "../services/api";

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
  estado: string;
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
  const [usuario, setUsuario] = useState<Usuario | null>(
    null
  );

  const [token, setToken] = useState<string | null>(
    null
  );

  const [cargando, setCargando] = useState(false);

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
      /*
      ----------------------------------------------------------
      AUTENTICACIÓN
      ----------------------------------------------------------
      */

      const respuesta = await api.post(
        "/api/auth/login",
        {
          correo_electronico,
          password,
        }
      );

      const accessToken =
        respuesta.data.access_token;

      if (!accessToken) {
        throw new Error(
          "No se recibió el token de acceso."
        );
      }

      /*
      ----------------------------------------------------------
      OBTENER USUARIO AUTENTICADO
      ----------------------------------------------------------
      */

      const respuestaUsuario = await api.get(
        "/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const usuarioActual =
        respuestaUsuario.data;

      /*
      ----------------------------------------------------------
      GUARDAR SESIÓN
      ----------------------------------------------------------
      */

      setToken(accessToken);
      setUsuario(usuarioActual);

      return usuarioActual;
    } catch (error: any) {
      /*
      ----------------------------------------------------------
      ERROR DE LOGIN
      ----------------------------------------------------------
      */

      const status =
        error?.response?.status;

      const detail =
        error?.response?.data?.detail;

      console.log(
        "ERROR LOGIN:",
        status,
        error?.response?.data
      );

      /*
      ----------------------------------------------------------
      CREDENCIALES INCORRECTAS
      ----------------------------------------------------------
      */

      if (
        status === 401 ||
        detail ===
          "Correo o contraseña incorrectos"
      ) {
        throw new Error(
          "Correo o contraseña incorrectos"
        );
      }

      /*
      ----------------------------------------------------------
      OTRO ERROR
      ----------------------------------------------------------
      */

      throw new Error(
        detail ||
          "No se pudo iniciar sesión."
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