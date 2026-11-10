import { StyleSheet, Text, View } from "react-native";

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

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const nombreMes = (aaaaMm: string) => MESES[Number(aaaaMm.slice(5, 7)) - 1] ?? aaaaMm;
export const miles = (n: number) => Math.round(n).toLocaleString("es-MX");

function Leyenda({ items }: { items: { nombre: string; color: string }[] }) {
  return (
    <View style={s.leyenda}>
      {items.map((i) => (
        <View key={i.nombre} style={s.leyendaItem}>
          <View style={[s.punto, { backgroundColor: i.color }]} />
          <Text style={s.leyendaTexto}>{i.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

/** Columnas apiladas por periodo (p. ej. consumo mensual de medicamentos e insumos). */
export function ColumnasApiladas({
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
  const max = Math.max(1, ...datos.map((d) => d.valores.reduce((a, b) => a + b, 0)));
  return (
    <View accessible accessibilityLabel={descripcion}>
      <View style={[s.columnas, { height: alto + 18 }]}>
        {datos.map((d) => {
          const total = d.valores.reduce((a, b) => a + b, 0);
          return (
            <View key={d.etiqueta} style={s.columnaWrap}>
              <Text style={s.valor}>{total ? miles(total) : ""}</Text>
              <View style={{ height: alto, justifyContent: "flex-end", width: "100%" }}>
                <View style={{ height: (total / max) * alto, width: "100%", justifyContent: "flex-end" }}>
                  {d.valores.map((v, i) =>
                    v > 0 ? <View key={i} style={{ flex: v, backgroundColor: series[i].color, minHeight: 2 }} /> : null
                  )}
                </View>
              </View>
              <Text style={s.etiqueta}>{d.etiqueta}</Text>
            </View>
          );
        })}
      </View>
      <Leyenda items={series} />
    </View>
  );
}

/** Barras horizontales ordenadas (p. ej. los artículos más consumidos). */
export function BarrasHorizontales({
  datos,
  sufijo = "",
  descripcion,
}: {
  datos: { etiqueta: string; valor: number; color?: string }[];
  sufijo?: string;
  descripcion: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 8 }}>
      {datos.map((d) => (
        <View key={d.etiqueta} style={s.filaBarra}>
          <Text style={s.nombreBarra} numberOfLines={1}>{d.etiqueta}</Text>
          <View style={s.pista}>
            <View style={[s.relleno, { width: `${Math.max(2, (d.valor / max) * 100)}%`, backgroundColor: d.color ?? C.primario }]} />
          </View>
          <Text style={s.valorBarra}>{miles(d.valor)}{sufijo}</Text>
        </View>
      ))}
    </View>
  );
}

/** Una barra dividida en segmentos con su porcentaje (p. ej. estado de caducidad). */
export function BarraSegmentada({
  segmentos,
  descripcion,
}: {
  segmentos: { nombre: string; valor: number; color: string }[];
  descripcion: string;
}) {
  const total = segmentos.reduce((a, b) => a + b.valor, 0);
  if (total === 0) return <Text style={s.leyendaTexto}>Sin existencias registradas.</Text>;
  return (
    <View accessible accessibilityLabel={descripcion} style={{ gap: 8 }}>
      <View style={s.segmentada}>
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
export function Sparkline({ serie, color = C.primario, alto = 28 }: { serie: number[]; color?: string; alto?: number }) {
  const max = Math.max(1, ...serie);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: alto }} accessibilityLabel={`Consumo semanal: ${serie.join(", ")}`}>
      {serie.map((v, i) => (
        <View key={i} style={{ width: 5, height: Math.max(2, (v / max) * alto), backgroundColor: color, opacity: 0.4 + (0.6 * (i + 1)) / serie.length, borderRadius: 1 }} />
      ))}
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
