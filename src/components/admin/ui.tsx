/**
 * Kit de interfaz compartido para las pantallas administrativas.
 * Usa exactamente la paleta VITALIA (verde azulado #247F76).
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

function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    props: { onHoverIn: () => setHover(true), onHoverOut: () => setHover(false) },
  };
}

/* ───────────── Sección (tarjeta con título) ───────────── */

export function Seccion({
  titulo,
  subtitulo,
  icono,
  children,
  derecha,
}: {
  titulo: string;
  subtitulo?: string;
  icono?: IconName;
  derecha?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={s.seccion}>
      <View style={s.seccionCabecera}>
        {icono && (
          <View style={s.seccionIcono}>
            <FontAwesome name={icono} size={15} color={C.primario} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.seccionTitulo}>{titulo}</Text>
          {subtitulo ? <Text style={s.seccionSub}>{subtitulo}</Text> : null}
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
  /** Mensaje de error ("" si el valor es válido). */
  error?: string;
  /** Muestra el error aunque el campo no se haya tocado (intento de envío). */
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
}: CampoProps) {
  const [enfocado, setEnfocado] = useState(false);
  const [tocado, setTocado] = useState(false);
  const { hover, props: hoverProps } = useHover();

  const hayError = !!error && (tocado || !!mostrarError);
  const esValido = !error && tocado && valor.trim().length > 0;

  const borde = hayError ? C.peligro : enfocado ? C.primario : hover && editable ? C.primarioClaro : C.borde;

  return (
    <View style={{ gap: 6 }}>
      <View style={s.campoEtiquetaFila}>
        <Text style={s.campoEtiqueta}>
          {etiqueta}
          {requerido ? <Text style={{ color: C.peligro }}> *</Text> : null}
        </Text>
        {esValido && <FontAwesome name="check-circle" size={13} color={C.ok} />}
      </View>

      <View
        {...hoverProps}
        style={[
          s.campoCaja,
          {
            borderColor: borde,
            backgroundColor: !editable ? C.fondo : enfocado ? C.tarjeta : "#FBFDFC",
            borderWidth: enfocado || hayError ? 1.5 : 1,
          },
          multilinea && { alignItems: "flex-start" },
        ]}
      >
        {icono && (
          <FontAwesome
            name={icono}
            size={14}
            color={hayError ? C.peligro : enfocado ? C.primario : C.suave}
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
          placeholderTextColor={C.placeholder}
          keyboardType={teclado}
          secureTextEntry={secreto}
          multiline={multilinea}
          editable={editable}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          accessibilityLabel={etiqueta}
          style={[s.campoInput, multilinea && { minHeight: 76, textAlignVertical: "top", paddingTop: 12 }]}
        />
        {derecha}
      </View>

      {hayError ? (
        <View style={s.mensajeFila}>
          <FontAwesome name="exclamation-circle" size={12} color={C.peligro} />
          <Text style={[s.mensaje, { color: C.peligro }]}>{error}</Text>
        </View>
      ) : ayuda ? (
        <Text style={[s.mensaje, { color: C.suave }]}>{ayuda}</Text>
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
}: {
  texto?: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  icono?: IconName;
  cargando?: boolean;
  deshabilitado?: boolean;
  chico?: boolean;
  accesibilidad?: string;
}) {
  const { hover, props } = useHover();
  const off = deshabilitado || cargando;

  const paleta = {
    primario: { bg: hover ? C.primarioClaro : C.primario, fg: "#FFFFFF", bd: "transparent" },
    secundario: { bg: hover ? C.tinte : C.tarjeta, fg: C.primario, bd: C.borde },
    peligro: { bg: hover ? "#B64242" : C.peligro, fg: "#FFFFFF", bd: "transparent" },
    fantasma: { bg: hover ? C.tinte : "transparent", fg: C.texto, bd: "transparent" },
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
        { backgroundColor: paleta.bg, borderColor: paleta.bd, opacity: off ? 0.55 : 1 },
        pressed && !off && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {cargando ? (
        <ActivityIndicator size="small" color={paleta.fg} />
      ) : icono ? (
        <FontAwesome name={icono} size={chico ? 12 : 14} color={paleta.fg} />
      ) : null}
      {texto ? <Text style={[s.botonTexto, { color: paleta.fg }, chico && { fontSize: 12.5 }]}>{texto}</Text> : null}
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
}: {
  icono: IconName;
  onPress: () => void;
  etiqueta: string;
  tono?: "neutro" | "peligro" | "ok";
  deshabilitado?: boolean;
}) {
  const { hover, props } = useHover();
  const color = tono === "peligro" ? C.peligro : tono === "ok" ? C.ok : C.primario;
  const fondo = tono === "peligro" ? C.peligroFondo : tono === "ok" ? C.okFondo : C.tinte;

  return (
    <Pressable
      {...props}
      onPress={deshabilitado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      // @ts-expect-error `title` solo existe en react-native-web (tooltip nativo del navegador)
      title={etiqueta}
      style={[
        s.botonIcono,
        { backgroundColor: hover && !deshabilitado ? fondo : "transparent", opacity: deshabilitado ? 0.35 : 1 },
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
}: {
  texto: string;
  tono?: "ok" | "peligro" | "aviso" | "neutro" | "primario";
}) {
  const t = {
    ok: [C.okFondo, C.ok],
    peligro: [C.peligroFondo, C.peligro],
    aviso: [C.avisoFondo, C.aviso],
    neutro: ["#EDF2F0", C.texto],
    primario: [C.tinte, C.primario],
  }[tono];
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
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: IconName;
}) {
  const { hover, props } = useHover();
  return (
    <Pressable
      {...props}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={[
        s.chip,
        {
          backgroundColor: activo ? C.primario : hover ? C.tinte : C.tarjeta,
          borderColor: activo ? C.primario : hover ? C.primarioClaro : C.borde,
        },
      ]}
    >
      {activo ? (
        <FontAwesome name="check" size={11} color="#FFFFFF" />
      ) : icono ? (
        <FontAwesome name={icono} size={11} color={C.primario} />
      ) : null}
      <Text style={[s.chipTexto, { color: activo ? "#FFFFFF" : C.texto }]}>{texto}</Text>
    </Pressable>
  );
}

export function Aviso({
  tipo,
  texto,
  onCerrar,
}: {
  tipo: "ok" | "error" | "info" | "aviso";
  texto: string;
  onCerrar?: () => void;
}) {
  const t = {
    ok: [C.okFondo, C.ok, "check-circle"],
    error: [C.peligroFondo, C.peligro, "exclamation-circle"],
    aviso: [C.avisoFondo, C.aviso, "exclamation-triangle"],
    info: [C.tinte, C.primario, "info-circle"],
  }[tipo] as [string, string, IconName];
  return (
    <View style={[s.aviso, { backgroundColor: t[0], borderColor: t[1] + "55" }]} accessibilityRole="alert">
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
}: {
  items: { clave: T; etiqueta: string; icono?: IconName }[];
  activa: T;
  onChange: (c: T) => void;
}) {
  return (
    <View style={s.pestanas} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.clave === activa;
        return (
          <Pressable
            key={it.clave}
            onPress={() => onChange(it.clave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.pestana, on && s.pestanaActiva]}
          >
            {it.icono && <FontAwesome name={it.icono} size={13} color={on ? C.primario : C.suave} />}
            <Text style={[s.pestanaTexto, { color: on ? C.primario : C.suave }]}>{it.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Selector (lista en modal, funciona igual en web y móvil) ───────────── */

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
}: {
  etiqueta?: string;
  valor: string;
  opciones: Opcion[];
  onChange: (v: string) => void;
  placeholder?: string;
  deshabilitado?: boolean;
  compacto?: boolean;
  icono?: IconName;
}) {
  const [abierto, setAbierto] = useState(false);
  const { hover, props } = useHover();
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View style={{ gap: 6, minWidth: compacto ? 150 : undefined }}>
      {etiqueta ? <Text style={s.campoEtiqueta}>{etiqueta}</Text> : null}
      <Pressable
        {...props}
        onPress={() => !deshabilitado && setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta ?? placeholder}: ${actual?.etiqueta ?? "sin seleccionar"}`}
        style={[
          s.campoCaja,
          {
            borderColor: hover && !deshabilitado ? C.primarioClaro : C.borde,
            backgroundColor: deshabilitado ? C.fondo : "#FBFDFC",
            opacity: deshabilitado ? 0.7 : 1,
            justifyContent: "space-between",
          },
        ]}
      >
        {icono && <FontAwesome name={icono} size={13} color={C.suave} style={{ marginRight: 8 }} />}
        <Text style={[s.campoInput, { paddingVertical: 12, color: actual ? C.oscuro : C.placeholder }]} numberOfLines={1}>
          {actual?.etiqueta ?? placeholder}
        </Text>
        <FontAwesome name="angle-down" size={16} color={C.suave} />
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.modalFondo} onPress={() => setAbierto(false)}>
          <Pressable style={s.selectorHoja} onPress={() => undefined}>
            <Text style={s.selectorTitulo}>{etiqueta ?? placeholder}</Text>
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
                    style={({ pressed }) => [s.selectorOpcion, on && { backgroundColor: C.tinte }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.selectorTexto, on && { color: C.primario, fontWeight: "700" }]}>{o.etiqueta}</Text>
                      {o.detalle ? <Text style={s.mensaje}>{o.detalle}</Text> : null}
                    </View>
                    {on && <FontAwesome name="check" size={14} color={C.primario} />}
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

export function Avatar({ nombre, tam = 38 }: { nombre: string; tam?: number }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: C.tinte, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.primario, fontWeight: "800", fontSize: tam * 0.36 }}>{iniciales || "?"}</Text>
    </View>
  );
}

/* ───────────── Fecha legible ───────────── */

export function fechaLegible(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const fecha = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  return conHora ? `${fecha}, ${d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : fecha;
}

/* ───────────── Estilos ───────────── */

const s = StyleSheet.create({
  seccion: {
    backgroundColor: C.tarjeta,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 20,
    gap: 16,
  },
  seccionCabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  seccionIcono: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.tinte, alignItems: "center", justifyContent: "center" },
  seccionTitulo: { fontSize: 16, fontWeight: "800", color: C.oscuro },
  seccionSub: { fontSize: 12.5, color: C.suave, marginTop: 1 },

  campoEtiquetaFila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  campoEtiqueta: { fontSize: 13, fontWeight: "700", color: C.texto },
  campoCaja: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, minHeight: 46 },
  campoInput: { flex: 1, fontSize: 14.5, color: C.oscuro, paddingVertical: 11, outlineStyle: "none" } as any,
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

  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipTexto: { fontSize: 13, fontWeight: "600" },

  aviso: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },

  pestanas: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.borde, gap: 4 },
  pestana: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: "transparent", marginBottom: -1 },
  pestanaActiva: { borderBottomColor: C.primario },
  pestanaTexto: { fontSize: 13.5, fontWeight: "700" },

  modalFondo: { flex: 1, backgroundColor: "rgba(23,63,58,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  selectorHoja: { width: "100%", maxWidth: 420, backgroundColor: C.tarjeta, borderRadius: 18, padding: 14, gap: 6 },
  selectorTitulo: { fontSize: 15, fontWeight: "800", color: C.oscuro, paddingHorizontal: 10, paddingVertical: 8 },
  selectorOpcion: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  selectorTexto: { fontSize: 14.5, color: C.texto },
});
