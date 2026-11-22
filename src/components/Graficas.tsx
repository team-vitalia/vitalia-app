import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "../theme/theme";
import { C } from "./c2/ui";

/** Gráficas simples hechas con Views (sin librerías externas, funcionan en web y móvil). */
export const COLOR = {
  medicamentos: C.primario,
  insumos: C.info,
  merma: C.peligro,
  aviso: C.aviso,
  peligro: C.peligro,
  ok: C.primario,
  neutro: "#9AA9A5",
};

/** Paleta nueva para la pantalla de analítica. */
export const PALETA = {
  medicamentos: C.primario,
  insumos: C.info,
  vencido: C.peligro,
  porVencer30: C.aviso,
  porVencer90: "#E0B04A",
  vigente: C.primario,
  sinFecha: "#9AA9A5",
  tendencia: C.info,
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const nombreMes = (aaaaMm: string) => MESES[Number(aaaaMm.slice(5, 7)) - 1] ?? aaaaMm;
export const miles = (n: number) => Math.round(n).toLocaleString("es-MX");

function Leyenda({ items, theme }: { items: { nombre: string; color: string }[]; theme: Theme }) {
  return (
    <View style={s.leyenda}>
      {items.map((i) => (
        <View key={i.nombre} style={s.leyendaItem}>
          <View style={[s.punto, { backgroundColor: i.color }]} />
          <Text style={[s.leyendaTexto, { color: theme.muted }]}>{i.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

/* ============================================================
   COMPONENTES ORIGINALES
============================================================ */

/** Columnas apiladas por periodo (p. ej. consumo mensual de medicamentos e insumos). */
function ColumnasApiladasBase({
  datos,
  series,
  alto = 150,
  descripcion,
}: {
  datos: { etiqueta: string; valores: number[] }[];
  series: { nombre: string; color: string }[];
  alto?: number;
  descripcion: string;
}) {
  const theme = useTheme();
  const max = useMemo(() => Math.max(1, ...datos.map((d) => d.valores.reduce((a, b) => a + b, 0))), [datos]);
  return (
    <View accessible accessibilityLabel={descripcion}>
      <View style={[s.columnas, { height: alto + 18 }]}>
        {datos.map((d) => {
          const total = d.valores.reduce((a, b) => a + b, 0);
          return (
            <View key={d.etiqueta} style={s.columnaWrap}>
              <Text style={[s.valor, { color: theme.muted }]}>{total ? miles(total) : ""}</Text>
              <View style={{ height: alto, justifyContent: "flex-end", width: "100%" }}>
                <View style={{ height: (total / max) * alto, width: "100%", justifyContent: "flex-end" }}>
                  {d.valores.map((v, i) =>
                    v > 0 ? <View key={i} style={{ flex: v, backgroundColor: series[i].color, minHeight: 2 }} /> : null
                  )}
                </View>
              </View>
              <Text style={[s.etiqueta, { color: theme.muted }]}>{d.etiqueta}</Text>
            </View>
          );
        })}
      </View>
      <Leyenda items={series} theme={theme} />
    </View>
  );
}

/** Barras horizontales ordenadas (p. ej. los artículos más consumidos). */
function BarrasHorizontalesBase({
  datos,
  sufijo = "",
  descripcion,
}: {
  datos: { etiqueta: string; valor: number; color?: string }[];
  sufijo?: string;
  descripcion: string;
}) {
  const theme = useTheme();
  const max = useMemo(() => Math.max(1, ...datos.map((d) => d.valor)), [datos]);
  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 8 }}>
      {datos.map((d) => (
        <View key={d.etiqueta} style={s.filaBarra}>
          <Text style={[s.nombreBarra, { color: theme.text }]} numberOfLines={1}>{d.etiqueta}</Text>
          <View style={[s.pista, { backgroundColor: theme.border }]}>
            <View style={[s.relleno, { width: `${Math.max(2, (d.valor / max) * 100)}%`, backgroundColor: d.color ?? C.primario }]} />
          </View>
          <Text style={[s.valorBarra, { color: theme.text }]}>{miles(d.valor)}{sufijo}</Text>
        </View>
      ))}
    </View>
  );
}

/** Una barra dividida en segmentos con su porcentaje (p. ej. estado de caducidad). */
function BarraSegmentadaBase({
  segmentos,
  descripcion,
}: {
  segmentos: { nombre: string; valor: number; color: string }[];
  descripcion: string;
}) {
  const theme = useTheme();
  const total = useMemo(() => segmentos.reduce((a, b) => a + b.valor, 0), [segmentos]);
  if (total === 0) return <Text style={[s.leyendaTexto, { color: theme.muted }]}>Sin existencias registradas.</Text>;
  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 8 }}>
      <View style={[s.segmentada, { backgroundColor: theme.border }]}>
        {segmentos.map((g) => (g.valor > 0 ? <View key={g.nombre} style={{ flex: g.valor, backgroundColor: g.color }} /> : null))}
      </View>
      <View style={s.leyenda}>
        {segmentos.map((g) => (
          <View key={g.nombre} style={s.leyendaItem}>
            <View style={[s.punto, { backgroundColor: g.color }]} />
            <Text style={s.leyendaTexto}>
              {g.nombre}: {miles(g.valor)} ({Math.round((g.valor / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Mini gráfica de la evolución semanal de un artículo. */
function SparklineBase({ serie, color = C.primario, alto = 28 }: { serie: number[]; color?: string; alto?: number }) {
  const max = useMemo(() => Math.max(1, ...serie), [serie]);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: alto }} accessibilityLabel={`Consumo semanal: ${serie.join(", ")}`}>
      {serie.map((v, i) => (
        <View key={i} style={{ width: 5, height: Math.max(2, (v / max) * alto), backgroundColor: color, opacity: 0.4 + (0.6 * (i + 1)) / serie.length, borderRadius: 1 }} />
      ))}
    </View>
  );
}

/* ============================================================
   NUEVOS COMPONENTES — Analítica de Almacén
============================================================ */

/** Columnas con total arriba y leyenda (mejora de ColumnasApiladas para dashboards). */
function ColumnasConTendenciaBase({
  datos,
  series,
  alto = 200,
  descripcion,
}: {
  datos: { etiqueta: string; valores: number[] }[];
  series: { nombre: string; color: string }[];
  alto?: number;
  descripcion: string;
}) {
  const theme = useTheme();
  const totales = useMemo(
    () => datos.map((d) => d.valores.reduce((a, b) => a + b, 0)),
    [datos]
  );
  const maxTotal = useMemo(() => Math.max(1, ...totales), [totales]);

  return (
    <View accessible accessibilityLabel={descripcion}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: alto, gap: 10 }}>
        {datos.map((d, i) => {
          const total = totales[i];
          const hTotal = (total / maxTotal) * (alto - 30);
          return (
            <View key={d.etiqueta + i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, marginBottom: 4 }}>
                {total ? miles(total) : ""}
              </Text>
              <View
                style={{
                  width: "70%",
                  height: Math.max(hTotal, 2),
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: theme.border,
                  flexDirection: "column-reverse",
                }}
              >
                {d.valores.map((v, j) => {
                  const h = (v / Math.max(total, 1)) * Math.max(hTotal, 2);
                  return (
                    <View key={j} style={{ height: h, width: "100%", backgroundColor: series[j]?.color ?? C.muted }} />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: theme.border, marginTop: 2 }} />
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {datos.map((d, i) => (
          <Text
            key={d.etiqueta + "-l" + i}
            style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: theme.muted, textTransform: "capitalize" }}
          >
            {d.etiqueta}
          </Text>
        ))}
      </View>
      <Leyenda items={series} theme={theme} />
    </View>
  );
}

/** Barras horizontales con porcentaje del total (mejora de BarrasHorizontales). */
function BarrasConPorcentajeBase({
  datos,
  descripcion,
  sufijo = "",
}: {
  datos: { etiqueta: string; valor: number; color: string }[];
  descripcion: string;
  sufijo?: string;
}) {
  const theme = useTheme();
  const total = useMemo(() => datos.reduce((a, b) => a + b.valor, 0) || 1, [datos]);
  const max = useMemo(() => Math.max(1, ...datos.map((d) => d.valor)), [datos]);

  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 10 }}>
      {datos.map((d) => {
        const pct = (d.valor / total) * 100;
        const ancho = (d.valor / max) * 100;
        return (
          <View key={d.etiqueta}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: theme.text, fontWeight: "600" }}>
                {d.etiqueta}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: "800", color: d.color, marginLeft: 8 }}>
                {miles(d.valor)}{sufijo}{" "}
                <Text style={{ fontWeight: "600", color: theme.muted }}>({pct.toFixed(1)}%)</Text>
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: "hidden" }}>
              <View style={{ width: `${ancho}%`, height: "100%", backgroundColor: d.color, borderRadius: 4 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Barra segmentada de caducidad con resumen textual de riesgo. */
function BarraCaducidadBase({
  segmentos,
  descripcion,
}: {
  segmentos: { nombre: string; valor: number; color: string }[];
  descripcion: string;
}) {
  const theme = useTheme();
  const total = useMemo(() => segmentos.reduce((a, b) => a + b.valor, 0), [segmentos]);
  const critico = segmentos.find((s) => s.nombre.toLowerCase().includes("vencido"))?.valor ?? 0;
  const porVencer = segmentos.find((s) => s.nombre.includes("30"))?.valor ?? 0;
  const pctCritico = total ? ((critico + porVencer) / total) * 100 : 0;

  if (total === 0) {
    return <Text style={[s.leyendaTexto, { color: theme.muted }]}>Sin existencias registradas.</Text>;
  }

  return (
    <View accessible accessibilityLabel={descripcion}>
      <View style={{ flexDirection: "row", height: 18, borderRadius: 9, overflow: "hidden", backgroundColor: theme.border }}>
        {segmentos.map((g) => {
          const w = (g.valor / total) * 100;
          if (w <= 0) return null;
          return <View key={g.nombre} style={{ width: `${w}%`, backgroundColor: g.color }} />;
        })}
      </View>
      <View style={s.leyenda}>
        {segmentos.map((g) => (
          <View key={g.nombre} style={s.leyendaItem}>
            <View style={[s.punto, { backgroundColor: g.color }]} />
            <Text style={[s.leyendaTexto, { color: theme.muted }]}>
              {g.nombre}: {miles(g.valor)} ({total ? Math.round((g.valor / total) * 100) : 0}%)
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 10,
          backgroundColor: pctCritico > 20 ? C.peligroSuave : C.infoSuave,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: pctCritico > 20 ? C.peligro : C.info, fontWeight: "700" }}>
          {pctCritico > 20
            ? `${pctCritico.toFixed(1)}% del stock está vencido o por vencer en 30 días`
            : `Solo ${pctCritico.toFixed(1)}% del stock está en riesgo de caducidad`}
        </Text>
      </View>
    </View>
  );
}

/** Cobertura (días de stock vs horizonte) con marca vertical del horizonte. */
function CoberturaBarrasBase({
  items,
  horizonte,
  descripcion,
}: {
  items: { nombre: string; coberturaDias: number | null; color: string }[];
  horizonte: number;
  descripcion: string;
}) {
  const theme = useTheme();
  const max = useMemo(
    () => Math.max(horizonte, ...items.map((i) => i.coberturaDias ?? 0), 1),
    [items, horizonte]
  );

  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 10 }}>
      {items.map((i) => {
        const dias = i.coberturaDias ?? 0;
        const ancho = (dias / max) * 100;
        const enRiesgo = dias < horizonte * 0.5;
        return (
          <View key={i.nombre}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: theme.text, fontWeight: "600" }}>
                {i.nombre}
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "800",
                  color: enRiesgo ? C.peligro : C.primario,
                  marginLeft: 8,
                }}
              >
                {i.coberturaDias === null ? "sin historial" : `~${dias} d`}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: "hidden", position: "relative" }}>
              <View
                style={{
                  position: "absolute",
                  left: `${(horizonte / max) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: C.info,
                  opacity: 0.5,
                }}
              />
              <View style={{ width: `${ancho}%`, height: "100%", backgroundColor: i.color, borderRadius: 4 }} />
            </View>
          </View>
        );
      })}
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
        La línea vertical marca el horizonte de {horizonte} días.
      </Text>
    </View>
  );
}

/** Sparkline con relleno suave y punto final resaltado. */
function SparklineRellenoBase({
  serie,
  color = C.primario,
  width = 120,
  height = 36,
}: {
  serie: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const theme = useTheme();
  const puntos = useMemo(() => {
    if (!serie.length) return [];
    const max = Math.max(...serie, 1);
    const min = Math.min(...serie, 0);
    const rango = max - min || 1;
    return serie.map((v, i) => {
      const x = (i / (serie.length - 1 || 1)) * width;
      const y = height - ((v - min) / rango) * (height - 4) - 2;
      return { x, y };
    });
  }, [serie, width, height]);

  if (!serie.length) return null;

  return (
    <View style={{ width, height }} accessibilityLabel={`Consumo semanal: ${serie.join(", ")}`}>
      <View style={{ flex: 1, position: "relative" }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: height * 0.5,
            backgroundColor: color + "22",
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        />
        {puntos.slice(0, -1).map((p, i) => {
          const n = puntos[i + 1];
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx);
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: len,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: `${ang}rad` }],
                transformOrigin: "left center" as any,
              }}
            />
          );
        })}
        {puntos.length > 0 && (
          <View
            style={{
              position: "absolute",
              left: puntos[puntos.length - 1].x - 3,
              top: puntos[puntos.length - 1].y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  columnas: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  columnaWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  valor: { fontSize: 10, color: C.texto2, marginBottom: 2, height: 14 },
  etiqueta: { fontSize: 11, color: C.muted, marginTop: 4, textTransform: "capitalize" },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 12, color: C.texto2 },
  filaBarra: { flexDirection: "row", alignItems: "center", gap: 8 },
  nombreBarra: { width: "34%", fontSize: 12.5, color: C.texto },
  pista: { flex: 1, height: 12, backgroundColor: C.borde, borderRadius: 6, overflow: "hidden" },
  relleno: { height: "100%", borderRadius: 6 },
  valorBarra: { width: 64, textAlign: "right", fontSize: 12, fontWeight: "700", color: C.titulo },
  segmentada: { flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: C.borde },
});

// Componentes memoizados: evitan repintar gráficas cuando el contenedor actualiza
// estado ajeno a sus datos (por ejemplo, navegación o avisos de la pantalla).
export const ColumnasApiladas = React.memo(ColumnasApiladasBase);
export const BarrasHorizontales = React.memo(BarrasHorizontalesBase);
export const BarraSegmentada = React.memo(BarraSegmentadaBase);
export const Sparkline = React.memo(SparklineBase);

/* --- Nuevos (memoizados igual que los originales) --- */
export const ColumnasConTendencia = React.memo(ColumnasConTendenciaBase);
export const BarrasConPorcentaje = React.memo(BarrasConPorcentajeBase);
export const BarraCaducidad = React.memo(BarraCaducidadBase);
export const CoberturaBarras = React.memo(CoberturaBarrasBase);
export const SparklineRelleno = React.memo(SparklineRellenoBase);