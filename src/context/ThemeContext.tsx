import React, { useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  LIGHT,
  DARK,
  ThemeContext,
  type Theme,
  type ThemeMode,
  type ThemeContextType,
} from "../theme/theme";

export { ThemeContext, type Theme, type ThemeMode, type ThemeContextType };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem("theme");
        if (saved === "dark") return "dark";
      } catch (e) {}
    }
    return "light"; // Claro por defecto
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const isDark = mode === "dark";
      document.body?.classList.toggle("dark-theme", isDark);
      document.documentElement.classList.toggle("dark-theme", isDark);
      try {
        window.localStorage?.setItem("theme", mode);
      } catch (e) {}
    }
  }, [mode]);

  const toggleTheme = () => {
    setModeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const theme: Theme = mode === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        isDark: mode === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
