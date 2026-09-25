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

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const login = async (
    correo_electronico: string,
    password: string
  ): Promise<Usuario> => {
    try {
      setCargando(true);

      const respuesta = await api.post("/api/auth/login", {
        correo_electronico,
        password,
      });

      const accessToken = respuesta.data.access_token;

      setToken(accessToken);

      const usuarioRespuesta = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setUsuario(usuarioRespuesta.data);

      return usuarioRespuesta.data;

    } catch (error: any) {
      if (error.response) {
        throw new Error(
          error.response.data.detail ||
            "Correo o contraseña incorrectos"
        );
      }

      throw new Error(
        "No se pudo conectar con el servidor"
      );

    } finally {
      setCargando(false);
    }
  };

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

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}