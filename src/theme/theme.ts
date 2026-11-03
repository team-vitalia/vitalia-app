import { useColorScheme } from "react-native";

/* ============================================================
   TEMA VITALIA (verde institucional + glassmorphism claro)
   Ubicación sugerida: src/theme/vitaliaTheme.ts
============================================================ */

export const LIGHT = {
  mode: "light" as "light" | "dark",

  // Principales
  primary: "#0F4C45", // verde institucional
  secondary: "#2DD4BF",
  dark: "#0A3732",
  bg: "#F8FAFC",
  bgSoft: "#CCFBF1",

  // Interfaz
  card: "#FFFFFF", // superficies sólidas (menú, barra inferior, hojas)
  text: "#0F4C45", // tipografía principal
  muted: "#64748B",
  border: "#E2E8F0",

  // Glassmorphism claro (tarjetas del panel)
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(148,163,184,0.35)",
  glassShadow: "#0F172A",

  // Estados
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#0284C7",
  errorBg: "#FEF2F2",

  // Derivados
  onPrimary: "#FFFFFF",
  tileBg: "rgba(15,76,69,0.08)", // fondo de iconos
  activeBg: "rgba(15,76,69,0.10)", // elemento activo en menús
  activeFg: "#0F4C45",
  hoverBg: "rgba(15,76,69,0.06)",
  gradFrom: "#0F4C45",
  gradTo: "#0A3732",
  glow: "#2DD4BF", // luces
};

export type Theme = typeof LIGHT;

export const DARK: Theme = {
  mode: "dark",

  primary: "#2DD4BF",
  secondary: "#2DD4BF",
  dark: "#134E4A",
  bg: "#0F172A",
  bgSoft: "#134E4A",

  card: "#1E293B",
  text: "#F8FAFC",
  muted: "#94A3B8",
  border: "#334155",

  glass: "rgba(30,41,59,0.72)",
  glassBorder: "rgba(148,163,184,0.22)",
  glassShadow: "#000000",

  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#38BDF8",
  errorBg: "#3B1D22",

  onPrimary: "#0F172A",
  tileBg: "rgba(45,212,191,0.14)",
  activeBg: "rgba(45,212,191,0.14)",
  activeFg: "#2DD4BF",
  hoverBg: "rgba(255,255,255,0.05)",
  gradFrom: "#0F766E",
  gradTo: "#134E4A",
  glow: "#2DD4BF",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

// Breakpoints de navegación
export const BP_MOBILE = 700; // < 700: cabecera + barra inferior
export const BP_DESKTOP = 1024; // 700 - 1023: menú lateral compacto (solo iconos); >= 1024: menú completo