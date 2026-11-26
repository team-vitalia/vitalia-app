import { createContext, useContext } from "react";

/* ============================================================
   TEMA VITALIA (verde institucional + glassmorphism claro)
   Ubicación sugerida: src/theme/vitaliaTheme.ts
============================================================ */

export const LIGHT = {
  mode: "light" as "light" | "dark",

  // Principales
  primary: "#0F4C45", // verde institucional
  secondary: "#08BFA4", // verde azulado vibrante
  dark: "#0A3732",
  bg: "#F8FAFC",
  bgSoft: "#E6FBF7",

  // Interfaz
  card: "#FFFFFF", // superficies sólidas (menú, barra inferior, hojas)
  text: "#242D35", // tipografía principal (gris carbón suave)
  muted: "#566573",
  border: "#E2E8F0",

  // Glassmorphism claro (tarjetas del panel)
  glass: "rgba(255,255,255,0.85)",
  glassBorder: "rgba(148,163,184,0.35)",
  glassShadow: "#0F172A",


  // Estados
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#0284C7",
  errorBg: "#FEF2F2",
  successBg: "rgba(22,163,74,0.12)",
  warningBg: "rgba(245,158,11,0.14)",

  // Derivados
  onPrimary: "#FFFFFF",
  tileBg: "rgba(15,76,69,0.08)", // fondo de iconos
  activeBg: "rgba(15,76,69,0.10)", // elemento activo en menús
  activeFg: "#0F4C45",
  hoverBg: "rgba(15,76,69,0.06)",
  gradFrom: "#0F4C45",
  gradTo: "#08BFA4",
  glow: "#08BFA4", // luces
};

export type Theme = typeof LIGHT;

export const DARK: Theme = {
  mode: "dark",

  primary: "#08BFA4",
  secondary: "#2DD4BF",
  dark: "#069882",
  bg: "#121212",
  bgSoft: "#1E2D2A",
  successBg: "rgba(74,222,128,0.16)",
  warningBg: "rgba(251,191,36,0.16)",

  card: "#1E1E1E",
  text: "#E0E0E0",
  muted: "#A0AEC0",
  border: "#2D3748",

  glass: "rgba(30,41,59,0.72)",
  glassBorder: "rgba(148,163,184,0.22)",
  glassShadow: "#000000",

  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#38BDF8",
  errorBg: "#3B1B1B",

  onPrimary: "#121212",
  tileBg: "rgba(8,191,164,0.14)",
  activeBg: "rgba(8,191,164,0.16)",
  activeFg: "#08BFA4",
  hoverBg: "rgba(255,255,255,0.05)",
  gradFrom: "#069882",
  gradTo: "#08BFA4",
  glow: "#08BFA4",
};

export type ThemeMode = "light" | "dark";

export interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  theme: LIGHT,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  return ctx?.theme ?? LIGHT;
}

// Breakpoints de navegación
export const BP_MOBILE = 700; // < 700: cabecera + barra inferior
export const BP_DESKTOP = 1024; // 700 - 1023: menú lateral compacto (solo iconos); >= 1024: menú completo