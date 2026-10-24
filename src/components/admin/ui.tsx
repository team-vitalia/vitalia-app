/**
 * Kit de interfaz compartido para las pantallas administrativas.
 * Adaptativo: modo claro (paleta VITALIA original) / modo oscuro (tokens del tema).
 */
import { FontAwesome } from "@expo/vector-icons";
import React, { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTheme, type Theme } from "../../theme/theme";

/* Paleta original (modo claro) */
export const C = {
  primario: "#247F76",
  primarioClaro: "#2A8C82",
  oscuro: "#173F3A",
  texto: "#36564E",
  suave: "#8A9B98",
  placeholder: "#A2B0AD",
  tinte: "#E2F4F0",
  fondo: "#F4FAF8",
  tarjeta: "#FFFFFF",
  borde: "#DDE8E5",
  bordeSuave: "#EDF3F1",
  peligro: "#C84D4D",
  peligroFondo: "#FCEDEC",
  aviso: "#C66D25",
  avisoFondo: "#FFF7EF",
  ok: "#27864A",
  okFondo: "#E5F4F0",
} as const;

type IconName = React.ComponentProps<typeof FontAwesome>["name"];

/* Tokens resueltos por tema */
type Pal = {
  primario: string;
  primarioClaro: string;
  oscuro: string;
  texto: string;
  suave: string;
  placeholder: string;
  tinte: string;
  fondo: string;
  tarjeta: string;
  borde: string;
  bordeSuave: string;
  peligro: string;
  peligroFondo: string;
  aviso: string;
  avisoFondo: string;
  ok: string;
  okFondo: string;
  campoBg: string;
  campoBgFocus: string;
  campoBgDisabled: string;
  modalFondo: string;
  iconoNeutro: string;
  hoverTinte: string;
};

function paleta(c: Theme): Pal {
  const isLight = c.mode !== "dark";
  return {
    primario: c.primary,
    primarioClaro: c.mode === "dark" ? c.primary : C.primarioClaro,
    oscuro: c.text,
    texto: c.mode === "dark" ? c.text : C.texto,
    suave: c.muted,
    placeholder: c.muted,
    tinte: c.activeBg,
    fondo: c.bg,
    tarjeta: c.card,
    borde: c.border,
    bordeSuave: c.glassBorder,
    peligro: c.error,
    peligroFondo: c.errorBg,
    aviso: c.warning,
    avisoFondo: withAlpha(c.warning, 0.14),
    ok: c.success,
    okFondo: withAlpha(c.success, 0.14),
    campoBg: isLight ? "#FBFDFC" : c.tileBg,
    campoBgFocus: isLight ? c.card : withAlpha(c.primary, 0.06),
    campoBgDisabled: isLight ? C.fondo : "rgba(255,255,255,0.03)",
    modalFondo: isLight ? "rgba(23,63,58,0.45)" : "rgba(0,0,0,0.65)",
    iconoNeutro: isLight ? C.suave : c.muted,
    hoverTinte: isLight ? C.tinte : c.hoverBg,
  };
}

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

function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    props: { onHoverIn: () => setHover(true), onHoverOut: () => setHover(false) },
  };
}

function usePal(c?: Theme): Pal {
  const fromCtx = useTheme();
  return paleta(c ?? fromCtx);
}

/* ───────────── Sección (tarjeta con título) ───────────── */

export function Seccion({
  titulo,
  subtitulo,
  icono,
  children,
  derecha,
  c,
}: {
  titulo: string;
  subtitulo?: string;
  icono?: IconName;
  derecha?: ReactNode;
  children: ReactNode;
  c?: Theme;
}) {
  const p = usePal(c);
  return (
    <View
      style={[
        s.seccion,
        { backgroundColor: p.tarjeta, borderColor: p.borde },
      ]}
    >
      <View style={s.seccionCabecera}>
        {icono && (
          <View style={[s.seccionIcono, { backgroundColor: p.tinte }]}>
            <FontAwesome name={icono} size={15} color={p.primario} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.seccionTitulo, { color: p.oscuro }]}>{titulo}</Text>
          {subtitulo ? (
            <Text style={[s.seccionSub, { color: p.suave }]}>{subtitulo}</Text>
          ) : null}
        </View>
        {derecha}
      </View>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

/* ───────────── Campo con validación en tiempo real ───────────── */

export interface CampoProps {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
  error?: string;
  mostrarError?: boolean;
  ayuda?: string;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  secreto?: boolean;
  multilinea?: boolean;
  editable?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  derecha?: ReactNode;
  icono?: IconName;
  c?: Theme;
}

export function Campo({
  etiqueta,
  valor,
  onChange,
  requerido,
  error = "",
  mostrarError,
  ayuda,
  placeholder,
  teclado,
  secreto,
  multilinea,
  editable = true,
  maxLength,
  autoCapitalize,
  derecha,
  icono,
  c,
}: CampoProps) {
  const p = usePal(c);
  const [enfocado, setEnfocado] = useState(false);
  const [tocado, setTocado] = useState(false);
  const { hover, props: hoverProps } = useHover();

  const hayError = !!error && (tocado || !!mostrarError);
  const esValido = !error && tocado && valor.trim().length > 0;
  const borde = hayError
    ? p.peligro
    : enfocado
      ? p.primario
      : hover && editable
        ? p.primarioClaro
        : p.borde;

  return (
    <View style={{ gap: 6 }}>
      <View style={s.campoEtiquetaFila}>
        <Text style={[s.campoEtiqueta, { color: p.texto }]}>
          {etiqueta}
          {requerido ? <Text style={{ color: p.peligro }}> *</Text> : null}
        </Text>
        {esValido && <FontAwesome name="check-circle" size={13} color={p.ok} />}
      </View>

      <View
        {...hoverProps}
        style={[
          s.campoCaja,
          {
            borderColor: borde,
            backgroundColor: !editable
              ? p.campoBgDisabled
              : enfocado
                ? p.campoBgFocus
                : p.campoBg,
            borderWidth: enfocado || hayError ? 1.5 : 1,
          },
          multilinea && { alignItems: "flex-start" },
        ]}
      >
        {icono && (
          <FontAwesome
            name={icono}
            size={14}
            color={hayError ? p.peligro : enfocado ? p.primario : p.iconoNeutro}
            style={{ marginRight: 10, marginTop: multilinea ? 14 : 0 }}
          />
        )}
        <TextInput
          value={valor}
          onChangeText={onChange}
          onFocus={() => setEnfocado(true)}
          onBlur={() => {
            setEnfocado(false);
            setTocado(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={p.placeholder}
          keyboardType={teclado}
          secureTextEntry={secreto}
          multiline={multilinea}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          accessibilityLabel={etiqueta}
          style={[
            s.campoInput,
            { color: p.oscuro },
            multilinea && { minHeight: 76, textAlignVertical: "top", paddingTop: 12 },
          ]}
        />
        {derecha}
      </View>

      {hayError ? (
        <View style={s.mensajeFila}>
          <FontAwesome name="exclamation-circle" size={12} color={p.peligro} />
          <Text style={[s.mensaje, { color: p.peligro }]}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={[s.mensaje, { color: p.suave }]}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

/* ───────────── Botón ───────────── */

export function Boton({
  texto,
  onPress,
  variante = "primario",
  icono,
  cargando,
  deshabilitado,
  chico,
  accesibilidad,
  c,
}: {
  texto?: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  icono?: IconName;
  cargando?: boolean;
  deshabilitado?: boolean;
  chico?: boolean;
  accesibilidad?: string;
  c?: Theme;
}) {
  const p = usePal(c);
  const { hover, props } = useHover();
  const off = deshabilitado || cargando;

  const paletaBtn = {
    primario: {
      bg: hover ? p.primarioClaro : p.primario,
      fg: c?.mode === "dark" ? c.onPrimary : "#FFFFFF",
      bd: "transparent",
    },
    secundario: { bg: hover ? p.tinte : p.tarjeta, fg: p.primario, bd: p.borde },
    peligro: {
      bg: hover ? withAlpha(p.peligro, 0.85) : p.peligro,
      fg: "#FFFFFF",
      bd: "transparent",
    },
    fantasma: { bg: hover ? p.tinte : "transparent", fg: p.texto, bd: "transparent" },
  }[variante];

  return (
    <Pressable
      {...props}
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accesibilidad ?? texto}
      accessibilityState={{ disabled: !!off, busy: !!cargando }}
      style={({ pressed }) => [
        s.boton,
        chico && s.botonChico,
        { backgroundColor: paletaBtn.bg, borderColor: paletaBtn.bd, opacity: off ? 0.55 : 1 },
        pressed && !off && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={paletaBtn.fg} />
      ) : icono ? (
        <FontAwesome name={icono} size={chico ? 12 : 14} color={paletaBtn.fg} />
      ) : null}
      {texto ? (
        <Text style={[s.botonTexto, { color: paletaBtn.fg }, chico && { fontSize: 12.5 }]}>
          {texto}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Botón-ícono cuadrado para acciones rápidas en tablas. */
export function BotonIcono({
  icono,
  onPress,
  etiqueta,
  tono = "neutro",
  deshabilitado,
  c,
}: {
  icono: IconName;
  onPress: () => void;
  etiqueta: string;
  tono?: "neutro" | "peligro" | "ok";
  deshabilitado?: boolean;
  c?: Theme;
}) {
  const p = usePal(c);
  const { hover, props } = useHover();

  const color = tono === "peligro" ? p.peligro : tono === "ok" ? p.ok : p.primario;
  const fondo = tono === "peligro" ? p.peligroFondo : tono === "ok" ? p.okFondo : p.tinte;

  return (
    <Pressable
      {...props}
      onPress={deshabilitado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      // @ts-expect-error `title` solo existe en react-native-web
      title={etiqueta}
      style={[
        s.botonIcono,
        {
          backgroundColor: hover && !deshabilitado ? fondo : "transparent",
          opacity: deshabilitado ? 0.35 : 1,
        },
      ]}
    >
      <FontAwesome name={icono} size={15} color={color} />
    </Pressable>
  );
}

/* ───────────── Insignia, Chip, Aviso ───────────── */

export function Insignia({
  texto,
  tono = "neutro",
  c,
}: {
  texto: string;
  tono?: "ok" | "peligro" | "aviso" | "neutro" | "primario";
  c?: Theme;
}) {
  const p = usePal(c);
  const t = {
    ok: [p.okFondo, p.ok],
    peligro: [p.peligroFondo, p.peligro],
    aviso: [p.avisoFondo, p.aviso],
    neutro: [p.tinte, p.texto],
    primario: [p.tinte, p.primario],
  }[tono] as [string, string];
  return (
    <View style={[s.insignia, { backgroundColor: t[0] }]}>
      <Text style={[s.insigniaTexto, { color: t[1] }]}>{texto}</Text>
    </View>
  );
}

export function Chip({
  texto,
  activo,
  onPress,
  icono,
  c,
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: IconName;
  c?: Theme;
}) {
  const p = usePal(c);
  const { hover, props } = useHover();
  const fg = activo
    ? c?.mode === "dark"
      ? c.onPrimary
      : "#FFFFFF"
    : p.texto;
  return (
    <Pressable
      {...props}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={[
        s.chip,
        {
          backgroundColor: activo ? p.primario : hover ? p.tinte : p.tarjeta,
          borderColor: activo ? p.primario : hover ? p.primarioClaro : p.borde,
        },
      ]}
    >
      {activo ? (
        <FontAwesome name="check" size={11} color={fg} />
      ) : icono ? (
        <FontAwesome name={icono} size={11} color={p.primario} />
      ) : null}
      <Text style={[s.chipTexto, { color: fg }]}>{texto}</Text>
    </Pressable>
  );
}

export function Aviso({
  tipo,
  texto,
  onCerrar,
  c,
}: {
  tipo: "ok" | "error" | "info" | "aviso";
  texto: string;
  onCerrar?: () => void;
  c?: Theme;
}) {
  const p = usePal(c);
  const t = {
    ok: [p.okFondo, p.ok, "check-circle"],
    error: [p.peligroFondo, p.peligro, "exclamation-circle"],
    aviso: [p.avisoFondo, p.aviso, "exclamation-triangle"],
    info: [p.tinte, p.primario, "info-circle"],
  }[tipo] as [string, string, IconName];
  return (
    <View
      style={[s.aviso, { backgroundColor: t[0], borderColor: withAlpha(t[1], 0.35) }]}
      accessibilityRole="alert"
    >
      <FontAwesome name={t[2]} size={15} color={t[1]} style={{ marginTop: 2 }} />
      <Text style={[s.avisoTexto, { color: t[1] }]}>{texto}</Text>
      {onCerrar && (
        <Pressable onPress={onCerrar} accessibilityLabel="Cerrar aviso" hitSlop={8}>
          <FontAwesome name="times" size={14} color={t[1]} />
        </Pressable>
      )}
    </View>
  );
}

/* ───────────── Pestañas ───────────── */

export function Pestanas<T extends string>({
  items,
  activa,
  onChange,
  c,
}: {
  items: { clave: T; etiqueta: string; icono?: IconName }[];
  activa: T;
  onChange: (c: T) => void;
  c?: Theme;
}) {
  const p = usePal(c);
  return (
    <View
      style={[s.pestanas, { borderBottomColor: p.borde }]}
      accessibilityRole="tablist"
    >
      {items.map((it) => {
        const on = it.clave === activa;
        return (
          <Pressable
            key={it.clave}
            onPress={() => onChange(it.clave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.pestana, on && { borderBottomColor: p.primario }]}
          >
            {it.icono && (
              <FontAwesome name={it.icono} size={13} color={on ? p.primario : p.suave} />
            )}
            <Text style={[s.pestanaTexto, { color: on ? p.primario : p.suave }]}>
              {it.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Selector ───────────── */

export interface Opcion {
  valor: string;
  etiqueta: string;
  detalle?: string;
}

export function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
  placeholder = "Seleccionar",
  deshabilitado,
  compacto,
  icono,
  c,
}: {
  etiqueta?: string;
  valor: string;
  opciones: Opcion[];
  onChange: (v: string) => void;
  placeholder?: string;
  deshabilitado?: boolean;
  compacto?: boolean;
  icono?: IconName;
  c?: Theme;
}) {
  const p = usePal(c);
  const [abierto, setAbierto] = useState(false);
  const { hover, props } = useHover();
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View style={{ gap: 6, minWidth: compacto ? 150 : undefined }}>
      {etiqueta ? <Text style={[s.campoEtiqueta, { color: p.texto }]}>{etiqueta}</Text> : null}
      <Pressable
        {...props}
        onPress={() => !deshabilitado && setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta ?? placeholder}: ${actual?.etiqueta ?? "sin seleccionar"}`}
        style={[
          s.campoCaja,
          {
            borderColor: hover && !deshabilitado ? p.primarioClaro : p.borde,
            backgroundColor: deshabilitado ? p.campoBgDisabled : p.campoBg,
            opacity: deshabilitado ? 0.7 : 1,
            justifyContent: "space-between",
          },
        ]}
      >
        {icono && (
          <FontAwesome name={icono} size={13} color={p.iconoNeutro} style={{ marginRight: 8 }} />
        )}
        <Text
          style={[
            s.campoInput,
            { paddingVertical: 12, color: actual ? p.oscuro : p.placeholder },
          ]}
          numberOfLines={1}
        >
          {actual?.etiqueta ?? placeholder}
        </Text>
        <FontAwesome name="angle-down" size={16} color={p.iconoNeutro} />
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={[s.modalFondo, { backgroundColor: p.modalFondo }]} onPress={() => setAbierto(false)}>
          <Pressable
            style={[s.selectorHoja, { backgroundColor: p.tarjeta, borderColor: p.borde }]}
            onPress={() => undefined}
          >
            <Text style={[s.selectorTitulo, { color: p.oscuro }]}>{etiqueta ?? placeholder}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {opciones.map((o) => {
                const on = o.valor === valor;
                return (
                  <Pressable
                    key={o.valor}
                    onPress={() => {
                      onChange(o.valor);
                      setAbierto(false);
                    }}
                    accessibilityRole="menuitem"
                    style={({ pressed }) => [
                      s.selectorOpcion,
                      on && { backgroundColor: p.tinte },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.selectorTexto,
                          { color: p.texto },
                          on && { color: p.primario, fontWeight: "700" },
                        ]}
                      >
                        {o.etiqueta}
                      </Text>
                      {o.detalle ? (
                        <Text style={[s.mensaje, { color: p.suave }]}>{o.detalle}</Text>
                      ) : null}
                    </View>
                    {on && <FontAwesome name="check" size={14} color={p.primario} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ───────────── Avatar con iniciales ───────────── */

export function Avatar({ nombre, tam = 38, c }: { nombre: string; tam?: number; c?: Theme }) {
  const p = usePal(c);
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: tam / 2,
        backgroundColor: p.tinte,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: p.primario, fontWeight: "800", fontSize: tam * 0.36 }}>
        {iniciales || "?"}
      </Text>
    </View>
  );
}

/* ───────────── Fecha legible ───────────── */

export function fechaLegible(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const fecha = d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return conHora
    ? `${fecha}, ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
    : fecha;
}

/* ───────────── Estilos estáticos ───────────── */

const s = StyleSheet.create({
  seccion: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 16 },
  seccionCabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  seccionIcono: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  seccionTitulo: { fontSize: 16, fontWeight: "800" },
  seccionSub: { fontSize: 12.5, marginTop: 1 },

  campoEtiquetaFila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  campoEtiqueta: { fontSize: 13, fontWeight: "700" },
  campoCaja: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  campoInput: { flex: 1, fontSize: 14.5, paddingVertical: 11, outlineStyle: "none" } as any,
  mensajeFila: { flexDirection: "row", alignItems: "center", gap: 6 },
  mensaje: { fontSize: 12, lineHeight: 17 },

  boton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  botonChico: { minHeight: 36, paddingHorizontal: 14, borderRadius: 10 },
  botonTexto: { fontSize: 14, fontWeight: "700" },
  botonIcono: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  insignia: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  insigniaTexto: { fontSize: 11.5, fontWeight: "800" },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTexto: { fontSize: 13, fontWeight: "600" },

  aviso: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },

  pestanas: { flexDirection: "row", borderBottomWidth: 1, gap: 4 },
  pestana: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  pestanaTexto: { fontSize: 13.5, fontWeight: "700" },

  modalFondo: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  selectorHoja: { width: "100%", maxWidth: 420, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1 },
  selectorTitulo: { fontSize: 15, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 8 },
  selectorOpcion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  selectorTexto: { fontSize: 14.5 },
});