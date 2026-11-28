import { Platform, type ViewStyle } from "react-native";

/**
 * Sombras sin avisos en consola.
 *
 * En web, react-native-web avisa de que los estilos `shadow*` y `textShadow*`
 * están obsoletos y pide `boxShadow` / `textShadow`. En iOS/Android se siguen
 * usando `shadow*` + `elevation`, así que el aspecto en móvil no cambia.
 */

export const aRgba = (color: string, opacidad: number): string => {
  const c = color.trim();
  if (c.startsWith("#")) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? (parseInt(h.slice(6, 8), 16) / 255) * opacidad : opacidad;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(",").map((x) => x.trim());
    const a = p.length > 3 ? parseFloat(p[3]) * opacidad : opacidad;
    return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${a})`;
  }
  return c; // nombre de color u otro formato: se usa tal cual
};

export type OpcionesSombra = {
  color?: string;
  x?: number;
  y?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
};

export function sombra({ color = "#000", x = 0, y = 0, opacity = 1, radius = 0, elevation }: OpcionesSombra = {}): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: `${x}px ${y}px ${radius * 2}px ${aRgba(color, opacity)}` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: x, height: y },
    shadowOpacity: opacity,
    shadowRadius: radius,
    ...(elevation !== undefined ? { elevation } : null),
  };
}

export function sombraTexto(color: string, x: number, y: number, radius: number): object {
  if (Platform.OS === "web") return { textShadow: `${x}px ${y}px ${radius}px ${color}` };
  return { textShadowColor: color, textShadowOffset: { width: x, height: y }, textShadowRadius: radius };
}
