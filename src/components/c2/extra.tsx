import React, { ComponentProps, ReactNode, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SelectorFecha from "../SelectorFecha";
import { UpgradeModal, CrownSvg } from "../UpgradeModal";
import { useC2Colors } from "./ui";

export type Paleta = ReturnType<typeof useC2Colors>;

/** Colores del tema actual (claro/oscuro) + estilos construidos con ellos. */
export function useEstilosC2<T>(crear: (C: Paleta) => T): { C: Paleta; s: T } {
  const C = useC2Colors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const s = useMemo(() => crear(C), [C.isDark]);
  return { C, s };
}

export type IconName = ComponentProps<typeof Ionicons>["name"];

/* ============================================================
   Fechas (en hora LOCAL: toISOString() usa UTC y por la tarde
   en México devolvía el día siguiente)
============================================================ */
const dos = (n: number) => String(n).padStart(2, "0");
export function aISO(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}
export function hoyLocal(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return aISO(d);
}
export function inicioDeMes(): string {
  const d = new Date();
  return aISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

/* ============================================================
   Campo de fecha con calendario (en lugar de escribir AAAA-MM-DD)
============================================================ */
export function CampoFecha({
  etiqueta,
  value,
  onChange,
  min,
  max,
  placeholder = "Elegir fecha",
  ayuda,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  ayuda?: string;
}) {
  const { s } = useEstilosC2(crear);
  return (
    <View style={s.campo}>
      <View style={s.campoCab}>
        <Text style={s.campoEtiqueta}>{etiqueta}</Text>
        {!!value && (
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <Text style={s.quitar}>Quitar</Text>
          </Pressable>
        )}
      </View>
      <SelectorFecha value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} />
      {!!ayuda && <Text style={s.ayuda}>{ayuda}</Text>}
    </View>
  );
}

/** Rango «desde / hasta» con calendario y atajos (Hoy, 7 días, 30 días, Este mes, Todo). */
export function RangoFechas({
  desde,
  hasta,
  onChange,
  atajos = true,
}: {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  atajos?: boolean;
}) {
  const { s } = useEstilosC2(crear);
  const hoy = hoyLocal();
  const lista: { t: string; d: string; h: string }[] = [
    { t: "Hoy", d: hoy, h: hoy },
    { t: "Últimos 7 días", d: hoyLocal(-7), h: hoy },
    { t: "Últimos 30 días", d: hoyLocal(-30), h: hoy },
    { t: "Este mes", d: inicioDeMes(), h: hoy },
    { t: "Todo el historial", d: "", h: "" },
  ];
  return (
    <View>
      <View style={s.fila}>
        <CampoFecha etiqueta="Desde" value={desde} onChange={(v) => onChange(v, hasta && v && v > hasta ? v : hasta)} max={hasta || undefined} />
        <CampoFecha etiqueta="Hasta" value={hasta} onChange={(v) => onChange(desde, v)} min={desde || undefined} />
      </View>
      {atajos && (
        <View style={s.atajos}>
          {lista.map((a) => {
            const activo = desde === a.d && hasta === a.h;
            return (
              <Pressable key={a.t} onPress={() => onChange(a.d, a.h)} style={[s.atajo, activo && s.atajoActivo]}>
                <Text style={[s.atajoTexto, activo && { color: "#FFFFFF" }]}>{a.t}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ============================================================
   Iconos y colores
============================================================ */
export function CirculoIcono({ name, color, size = 40, suave = true }: { name: IconName; color: string; size?: number; suave?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: suave ? `${color}1F` : color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={suave ? color : "#FFFFFF"} />
    </View>
  );
}

/** Chip seleccionable con SU PROPIO color (cada opción se distingue de un vistazo). */
export function ChipColor({
  texto,
  color,
  activo,
  onPress,
  icono,
  deshabilitado,
}: {
  texto: string;
  color: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: IconName;
  deshabilitado?: boolean;
}) {
  const { s } = useEstilosC2(crear);
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={[
        s.chip,
        { borderColor: color, backgroundColor: activo ? color : `${color}14` },
        deshabilitado && { opacity: 0.5 },
      ]}
    >
      {!!icono && <Ionicons name={icono} size={14} color={activo ? "#FFFFFF" : color} />}
      <Text style={[s.chipTexto, { color: activo ? "#FFFFFF" : color }]}>{texto}</Text>
    </Pressable>
  );
}

export type OpcionIcono = { valor: string; etiqueta: string; icono: IconName; color: string };

/** Rejilla de botones grandes con icono (para elegir el tipo de equipo). */
export function SelectorIconos({
  opciones,
  valor,
  onChange,
}: {
  opciones: OpcionIcono[];
  valor: string;
  onChange: (v: string) => void;
}) {
  const { C, s } = useEstilosC2(crear);
  return (
    <View style={s.rejilla}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onChange(o.valor)}
            style={[s.celdaIcono, { borderColor: activo ? o.color : C.borde, backgroundColor: activo ? `${o.color}1A` : C.tarjeta }]}
            accessibilityRole="button"
            accessibilityLabel={o.etiqueta}
          >
            <CirculoIcono name={o.icono} color={o.color} size={38} suave={!activo} />
            <Text style={[s.celdaTexto, activo && { color: o.color }]} numberOfLines={2}>
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Salas ---------- */
export const ESTADOS_SALA = [
  { valor: "disponible", etiqueta: "Disponible", color: "#16A34A", icono: "checkmark-circle-outline" as IconName },
  { valor: "ocupada", etiqueta: "Ocupada", color: "#D97706", icono: "people-outline" as IconName },
  { valor: "mantenimiento", etiqueta: "En mantenimiento", color: "#2563EB", icono: "construct-outline" as IconName },
  { valor: "inactiva", etiqueta: "Inactiva", color: "#64748B", icono: "close-circle-outline" as IconName },
];
export const colorEstadoSala = (e?: string | null) => ESTADOS_SALA.find((x) => x.valor === e)?.color ?? "#64748B";
export const etiquetaEstadoSala = (e?: string | null) => ESTADOS_SALA.find((x) => x.valor === e)?.etiqueta ?? "Sin estado";

export const TIPOS_SALA: { valor: string; color: string; icono: IconName; palabras: string[] }[] = [
  { valor: "Consultorio", color: "#0D9488", icono: "medkit-outline", palabras: ["consult"] },
  { valor: "Quirófano", color: "#7C3AED", icono: "cut-outline", palabras: ["quirof", "operaci", "cirug"] },
  { valor: "Urgencias", color: "#E11D48", icono: "alert-circle-outline", palabras: ["urgenc", "emergen"] },
  { valor: "Procedimientos", color: "#EA580C", icono: "bandage-outline", palabras: ["procedim", "curaci"] },
  { valor: "Recuperación", color: "#0284C7", icono: "bed-outline", palabras: ["recuper", "observ", "hospital"] },
  { valor: "Laboratorio", color: "#DB2777", icono: "flask-outline", palabras: ["laborat"] },
  { valor: "Imagenología", color: "#4F46E5", icono: "scan-outline", palabras: ["imagen", "rayos", "radiolog", "ultraso"] },
];
const TIPO_OTRO = { color: "#475569", icono: "business-outline" as IconName };
export function estiloTipoSala(tipo?: string | null): { color: string; icono: IconName } {
  const t = (tipo ?? "").toLowerCase();
  const hit = TIPOS_SALA.find((x) => x.palabras.some((p) => t.includes(p)));
  return hit ? { color: hit.color, icono: hit.icono } : TIPO_OTRO;
}

/* ---------- Equipos ---------- */
export const TIPOS_EQUIPO: (OpcionIcono & { ejemplo: string })[] = [
  { valor: "diagnostico", etiqueta: "Diagnóstico", icono: "scan-outline", color: "#2563EB", ejemplo: "Electrocardiógrafo, ultrasonido…" },
  { valor: "monitoreo", etiqueta: "Monitoreo", icono: "pulse-outline", color: "#059669", ejemplo: "Monitor de signos vitales…" },
  { valor: "cirugia", etiqueta: "Cirugía", icono: "cut-outline", color: "#7C3AED", ejemplo: "Electrobisturí, lámpara quirúrgica…" },
  { valor: "soporte_vital", etiqueta: "Soporte vital", icono: "heart-outline", color: "#E11D48", ejemplo: "Desfibrilador, ventilador…" },
  { valor: "laboratorio", etiqueta: "Laboratorio", icono: "flask-outline", color: "#DB2777", ejemplo: "Centrífuga, microscopio…" },
  { valor: "esterilizacion", etiqueta: "Esterilización", icono: "water-outline", color: "#0284C7", ejemplo: "Autoclave…" },
  { valor: "mobiliario", etiqueta: "Mobiliario", icono: "bed-outline", color: "#D97706", ejemplo: "Camilla, mesa de exploración…" },
  { valor: "otro", etiqueta: "Otro", icono: "cube-outline", color: "#64748B", ejemplo: "Otro tipo de equipo" },
];
export const infoTipoEquipo = (t?: string | null) => TIPOS_EQUIPO.find((x) => x.valor === t) ?? TIPOS_EQUIPO[TIPOS_EQUIPO.length - 1];

export const ESTADOS_EQUIPO = [
  { valor: "operativo", etiqueta: "Funcionando", color: "#16A34A", icono: "checkmark-circle-outline" as IconName },
  { valor: "mantenimiento", etiqueta: "En mantenimiento", color: "#D97706", icono: "construct-outline" as IconName },
  { valor: "fuera_de_servicio", etiqueta: "Fuera de servicio", color: "#DC2626", icono: "close-circle-outline" as IconName },
];
export const colorEstadoEquipo = (e?: string | null) => ESTADOS_EQUIPO.find((x) => x.valor === e)?.color ?? "#64748B";
export const etiquetaEstadoEquipo = (e?: string | null) => ESTADOS_EQUIPO.find((x) => x.valor === e)?.etiqueta ?? "Sin estado";

export const MANTENIMIENTO: Record<string, { etiqueta: string; color: string }> = {
  al_dia: { etiqueta: "Mantenimiento al día", color: "#16A34A" },
  proximo: { etiqueta: "Mantenimiento próximo", color: "#D97706" },
  vencido: { etiqueta: "Mantenimiento vencido", color: "#DC2626" },
  sin_programar: { etiqueta: "Sin mantenimiento programado", color: "#64748B" },
};

/* ============================================================
   Tarjeta de dato clave (clicable si se le pasa onPress)
============================================================ */
export function Kpi({
  icono,
  valor,
  titulo,
  color: colorProp,
  onPress,
}: {
  icono: IconName;
  valor: string | number;
  titulo: string;
  color?: string;
  onPress?: () => void;
}) {
  const { C, s } = useEstilosC2(crear);
  const color = colorProp ?? C.primario;
  const Cont: any = onPress ? Pressable : View;
  return (
    <Cont onPress={onPress} style={[s.kpi, { backgroundColor: `${color}12`, borderColor: `${color}33` }]}>
      <CirculoIcono name={icono} color={color} size={34} />
      <View style={{ flex: 1 }}>
        <Text style={[s.kpiValor, { color }]}>{valor}</Text>
        <Text style={s.kpiTitulo} numberOfLines={2}>
          {titulo}
        </Text>
      </View>
    </Cont>
  );
}

export function Seccion({ titulo, icono, children, derecha }: { titulo: string; icono?: IconName; children: ReactNode; derecha?: ReactNode }) {
  const { C, s } = useEstilosC2(crear);
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={s.seccionCab}>
        {!!icono && <Ionicons name={icono} size={16} color={C.primario} />}
        <Text style={s.seccionTitulo}>{titulo}</Text>
        <View style={{ flex: 1 }} />
        {derecha}
      </View>
      {children}
    </View>
  );
}

/* ============================================================
   Pantalla de función bloqueada por plan (Reportes / Auditoría)
============================================================ */
export function BloqueoPlan({
  etiqueta,
  titulo,
  descripcion,
  planRequerido,
  modulo,
}: {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  planRequerido: string;
  modulo: string;
}) {
  const { s } = useEstilosC2(crear);
  const [visible, setVisible] = useState(false);
  return (
    <>
      <View style={s.bloqueoWrap}>
        <View style={s.bloqueoCard}>
          <View style={s.bloqueoIcono}>
            <CrownSvg size={36} color="#FBBF24" />
          </View>
          <View style={s.bloqueoBadge}>
            <Text style={s.bloqueoBadgeTexto}>{etiqueta}</Text>
          </View>
          <Text style={s.bloqueoTitulo}>{titulo}</Text>
          <Text style={s.bloqueoDesc}>{descripcion}</Text>
          <Pressable style={s.bloqueoBoton} onPress={() => setVisible(true)} accessibilityRole="button">
            <Text style={s.bloqueoBotonTexto}>Ver planes de mejora</Text>
          </Pressable>
        </View>
      </View>
      <UpgradeModal
        visible={visible}
        modulo={modulo}
        planRequerido={planRequerido}
        descripcion={`${modulo} está disponible a partir del Plan ${planRequerido}. Actualiza tu suscripción para desbloquear este módulo.`}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

/** Texto para fechas "2026-11-05" -> "05/11/2026". */
export function fechaCorta(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const crear = (C: Paleta) =>
  StyleSheet.create({
  campo: { flex: 1, minWidth: 150, marginBottom: 12 },
  campoCab: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  campoEtiqueta: { fontSize: 11, fontWeight: "800", color: C.texto2 },
  quitar: { fontSize: 11, fontWeight: "800", color: C.peligro },
  ayuda: { fontSize: 10, color: C.muted, marginTop: 3 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  atajos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  atajo: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.borde, backgroundColor: C.tarjeta },
  atajoActivo: { backgroundColor: C.primario, borderColor: C.primario },
  atajoTexto: { fontSize: 11, fontWeight: "700", color: C.texto2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  chipTexto: { fontSize: 12, fontWeight: "800" },
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  celdaIcono: { width: 96, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 6 },
  celdaTexto: { fontSize: 11, fontWeight: "800", color: C.texto2, textAlign: "center" },
  kpi: { flex: 1, minWidth: 150, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  kpiValor: { fontSize: 22, fontWeight: "900" },
  kpiTitulo: { fontSize: 11, fontWeight: "700", color: C.texto2 },
  seccionCab: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 8 },
  seccionTitulo: { fontSize: 13, fontWeight: "800", color: C.titulo },
  bloqueoWrap: { paddingHorizontal: 20, paddingTop: 16, alignItems: "center" },
  bloqueoCard: { width: "100%", maxWidth: 580, backgroundColor: C.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: C.borde, paddingVertical: 36, paddingHorizontal: 26, alignItems: "center" },
  bloqueoIcono: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(251,191,36,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(251,191,36,0.35)" },
  bloqueoBadge: { backgroundColor: "rgba(251,191,36,0.15)", borderColor: "rgba(251,191,36,0.35)", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  bloqueoBadgeTexto: { color: "#B45309", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  bloqueoTitulo: { fontSize: 22, fontWeight: "800", color: C.titulo, textAlign: "center", marginBottom: 10 },
  bloqueoDesc: { fontSize: 14, lineHeight: 22, color: C.muted, textAlign: "center", marginBottom: 24, paddingHorizontal: 12 },
  bloqueoBoton: { backgroundColor: "#0EA5E9", paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  bloqueoBotonTexto: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "700", letterSpacing: 0.2 },
});
