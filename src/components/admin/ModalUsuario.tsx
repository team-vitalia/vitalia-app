import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { nombreCompleto, UsuarioFila } from "../../services/usuariosService";
import { useTheme } from "../../theme/theme";
import { Insignia } from "./ui";

/* ───────────────────────── Tipos y configuración ───────────────────────── */

export type TipoModalUsuario = "activar" | "desactivar" | "eliminar";

type Config = {
  icono: React.ComponentProps<typeof FontAwesome>["name"];
  peligro: boolean;
  titulo: string;
  subtitulo: string;
  consecuencias: {
    icono: React.ComponentProps<typeof FontAwesome>["name"];
    texto: string;
  }[];
  confirmar: string;
  /** Texto que hay que escribir para habilitar el botón (solo acciones irreversibles). */
  escribir?: string;
};

const CONFIG: Record<TipoModalUsuario, Config> = {
  activar: {
    icono: "check",
    peligro: false,
    titulo: "Activar cuenta",
    subtitulo: "Recupera el acceso de este usuario.",
    consecuencias: [{ icono: "sign-in", texto: "Podrá volver a iniciar sesión." }],
    confirmar: "Activar cuenta",
  },
  desactivar: {
    icono: "power-off",
    peligro: true,
    titulo: "Desactivar cuenta",
    subtitulo: "Puedes revertirlo cuando quieras.",
    consecuencias: [
      { icono: "ban", texto: "No podrá iniciar sesión." },
      { icono: "refresh", texto: "Podrás reactivar la cuenta en cualquier momento." },
    ],
    confirmar: "Desactivar",
  },
  eliminar: {
    icono: "trash",
    peligro: true,
    titulo: "Eliminar usuario",
    subtitulo: "Esta acción no se puede deshacer.",
    consecuencias: [
      { icono: "times-circle", texto: "La cuenta se elimina de forma permanente." },
      { icono: "ban", texto: "Dejará de tener acceso a la plataforma." },
    ],
    confirmar: "Eliminar",
    escribir: "ELIMINAR",
  },
};

const TONO_ROL: Record<number, "primario" | "ok" | "neutro" | "aviso"> = {
  1: "primario",
  2: "ok",
  3: "neutro",
  4: "aviso",
  5: "primario",
};

/* ───────────────────────── Utilidades ───────────────────────── */

function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h,
    16
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Iniciales: primera letra del nombre + primera letra del apellido paterno.
 * Así "María José López Ruiz" es "ML" y no "MJ".
 */
export function iniciales(u: UsuarioFila): string {
  const nombre = (u.nombre ?? "").trim().split(/\s+/)[0] ?? "";
  const apellido = String((u as any).apellido_paterno ?? "").trim();
  const palabras = nombreCompleto(u).split(/\s+/).filter(Boolean);
  const segunda = apellido ? apellido[0] : palabras.length > 1 ? palabras[1][0] : "";
  return ((nombre[0] ?? "") + segunda).toUpperCase() || "?";
}

/** Avatar de iniciales con tinte estable por usuario (3 tonos del theme). */
export function AvatarIniciales({
  usuario,
  size = 44,
}: {
  usuario: UsuarioFila;
  size?: number;
}) {
  const c = useTheme();
  const paleta = [c.primary, c.info, c.success];
  const color = paleta[usuario.id_PK % paleta.length];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: withAlpha(color, 0.16),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color,
          fontWeight: "800",
          fontSize: size * 0.38,
          letterSpacing: 0.5,
        }}
      >
        {iniciales(usuario)}
      </Text>
    </View>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

type Props = {
  visible: boolean;
  tipo: TipoModalUsuario;
  usuario: UsuarioFila | null;
  cargando?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export default function ModalUsuario({
  visible,
  tipo,
  usuario,
  cargando = false,
  onCancelar,
  onConfirmar,
}: Props) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const esMovil = width < 600;

  // Conserva el último contenido para que no "salte" mientras se cierra.
  const ultimo = useRef<{ tipo: TipoModalUsuario; usuario: UsuarioFila | null }>({
    tipo,
    usuario,
  });
  if (usuario) ultimo.current = { tipo, usuario };
  const { tipo: tipoVisible, usuario: u } = ultimo.current;
  const cfg = CONFIG[tipoVisible];

  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (!visible) setTexto("");
  }, [visible]);

  const acento = cfg.peligro ? c.error : c.primary;
  const habilitado =
    !cargando && (!cfg.escribir || texto.trim().toUpperCase() === cfg.escribir);
  const textoBotonPeligro = c.mode === "dark" ? c.onPrimary : "#FFFFFF";

  const cerrar = () => !cargando && onCancelar();

  if (!u) return null;

  const activo = (u.estado ?? "").toLowerCase() === "activo";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={esMovil ? "slide" : "fade"}
      onRequestClose={cerrar}
      statusBarTranslucent
    >
      <Pressable
        accessibilityViewIsModal
        onPress={cerrar}
        style={[
          s.fondo,
          {
            justifyContent: esMovil ? "flex-end" : "center",
            padding: esMovil ? 0 : 24,
            backgroundColor:
              c.mode === "dark" ? "rgba(0,0,0,0.7)" : "rgba(10,55,50,0.5)",
          },
        ]}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            s.hoja,
            {
              backgroundColor: c.card,
              borderColor: c.glassBorder,
              maxWidth: esMovil ? undefined : 460,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: esMovil ? 0 : 24,
              borderBottomRightRadius: esMovil ? 0 : 24,
              paddingBottom: esMovil ? 28 : 22,
            },
            sombra(),
          ]}
        >
          {esMovil && <View style={[s.asa, { backgroundColor: c.border }]} />}

          {/* 1 · Qué acción es */}
          <View style={s.encabezado}>
            <View style={[s.icono, { backgroundColor: withAlpha(acento, 0.14) }]}>
              <FontAwesome name={cfg.icono} size={18} color={acento} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.titulo, { color: c.text }]}>{cfg.titulo}</Text>
              <Text style={[s.subtitulo, { color: c.muted }]}>
                {cfg.subtitulo}
              </Text>
            </View>
          </View>

          {/* 2 · A quién afecta */}
          <View
            style={[
              s.tarjeta,
              { backgroundColor: c.bgSoft, borderColor: c.border },
            ]}
          >
            <AvatarIniciales usuario={u} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.nombre, { color: c.text }]} numberOfLines={1}>
                {nombreCompleto(u)}
              </Text>
              <Text style={[s.correo, { color: c.muted }]} numberOfLines={1}>
                {u.correo_electronico}
              </Text>
              <View style={s.insignias}>
                <Insignia
                  texto={u.rol ?? "Sin rol"}
                  tono={TONO_ROL[u.rol_id_FK ?? 0] ?? "neutro"}
                  c={c}
                />
                <Insignia
                  texto={activo ? "Activo" : "Inactivo"}
                  tono={activo ? "ok" : "peligro"}
                  c={c}
                />
              </View>
            </View>
          </View>

          {/* 3 · Qué pasará */}
          <View
            style={[
              s.consecuencias,
              {
                borderLeftColor: acento,
                backgroundColor: withAlpha(acento, 0.07),
              },
            ]}
          >
            {cfg.consecuencias.map((item) => (
              <View key={item.texto} style={s.consecuencia}>
                <FontAwesome
                  name={item.icono}
                  size={13}
                  color={acento}
                  style={{ width: 16 }}
                />
                <Text style={[s.consecuenciaTxt, { color: c.text }]}>
                  {item.texto}
                </Text>
              </View>
            ))}
          </View>

          {/* Confirmación escrita (solo irreversibles) */}
          {cfg.escribir && (
            <View style={{ gap: 7 }}>
              <Text style={[s.etiqueta, { color: c.text }]}>
                Escribe{" "}
                <Text style={{ fontWeight: "800", color: acento }}>
                  {cfg.escribir}
                </Text>{" "}
                para confirmar
              </Text>
              <TextInput
                value={texto}
                onChangeText={setTexto}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!cargando}
                placeholder={cfg.escribir}
                placeholderTextColor={c.muted}
                accessibilityLabel={`Escribe ${cfg.escribir} para confirmar`}
                style={[
                  s.input,
                  {
                    color: c.text,
                    backgroundColor: c.card,
                    borderColor: habilitado ? acento : c.border,
                  },
                ]}
              />
            </View>
          )}

          {/* 4 · Decidir */}
          <View
            style={[s.acciones, esMovil && { flexDirection: "column-reverse" }]}
          >
            <Pressable
              onPress={cerrar}
              disabled={cargando}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.boton,
                esMovil && { width: "100%" },
                {
                  borderColor: c.border,
                  backgroundColor: pressed ? c.hoverBg : "transparent",
                  borderWidth: 1,
                  opacity: cargando ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[s.botonTxt, { color: c.text }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={onConfirmar}
              disabled={!habilitado}
              accessibilityRole="button"
              accessibilityState={{ disabled: !habilitado, busy: cargando }}
              style={({ pressed }) => [
                s.boton,
                esMovil && { width: "100%" },
                {
                  backgroundColor: acento,
                  opacity: !habilitado ? 0.45 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {cargando ? (
                <ActivityIndicator
                  color={cfg.peligro ? textoBotonPeligro : c.onPrimary}
                />
              ) : (
                <Text
                  style={[
                    s.botonTxt,
                    {
                      color: cfg.peligro ? textoBotonPeligro : c.onPrimary,
                    },
                  ]}
                >
                  {cfg.confirmar}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ───────────────────────── Estilos ───────────────────────── */

const sombra = () =>
  Platform.select({
    web: {
      boxShadow:
        "0 24px 80px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.28)",
    } as any,
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.35,
      shadowRadius: 40,
      elevation: 24,
    },
  });

const s = StyleSheet.create({
  fondo: { flex: 1, alignItems: "center" },
  hoja: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    gap: 16,
  },
  asa: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: -10,
  },

  encabezado: { flexDirection: "row", alignItems: "center", gap: 14 },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 19, fontWeight: "800" },
  subtitulo: { fontSize: 13, marginTop: 2 },

  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  nombre: { fontSize: 15.5, fontWeight: "800" },
  correo: { fontSize: 13 },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },

  consecuencias: { borderLeftWidth: 3, borderRadius: 10, padding: 12, gap: 8 },
  consecuencia: { flexDirection: "row", alignItems: "center", gap: 8 },
  consecuenciaTxt: { flex: 1, fontSize: 13.5, lineHeight: 19 },

  etiqueta: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },

  acciones: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  boton: {
    minHeight: 46,
    minWidth: 120,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botonTxt: { fontSize: 14.5, fontWeight: "800" },
});