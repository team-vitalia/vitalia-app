import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Barra,
  Boton,
  Campo,
  Cargando,
  Estadistica,
  Etiqueta,
  Opciones,
  PantallaC2,
  Tarjeta,
  C,
  Vacio,
  etiquetaEstado,
  fechaValida,
  soloFecha,
  useAccesoC2,
} from "../../../components/c2/ui";
import {
  ReporteCitasPorDoctor,
  ReporteInventarioBajo,
  ReporteOcupacionSalas,
  ReporteRecetas,
  ReporteTiemposEspera,
  mensajeError,
  descargarReporte,
  reporteCitasPorDoctor,
  reporteInventarioBajo,
  reporteOcupacionSalas,
  reporteRecetas,
  reporteTiemposEspera,
} from "../../../services/c2Service";

type TipoReporte = "ocupacion" | "citas" | "espera" | "inventario" | "recetas";

type Resultado =
  | { tipo: "ocupacion"; data: ReporteOcupacionSalas }
  | { tipo: "citas"; data: ReporteCitasPorDoctor }
  | { tipo: "espera"; data: ReporteTiemposEspera }
  | { tipo: "inventario"; data: ReporteInventarioBajo }
  | { tipo: "recetas"; data: ReporteRecetas };

const REPORTES: { valor: TipoReporte; etiqueta: string; descripcion: string; usaFechas: boolean }[] = [
  { valor: "ocupacion", etiqueta: "Ocupación de salas", descripcion: "Estado de las salas y horas ocupadas por citas.", usaFechas: true },
  { valor: "citas", etiqueta: "Citas por doctor", descripcion: "Volumen de citas de cada médico, por estado.", usaFechas: true },
  { valor: "espera", etiqueta: "Tiempos de espera", descripcion: "Minutos entre el registro en cola y el llamado.", usaFechas: true },
  { valor: "inventario", etiqueta: "Inventario bajo", descripcion: "Medicamentos con existencias iguales o menores al umbral.", usaFechas: false },
  { valor: "recetas", etiqueta: "Recetas", descripcion: "Recetas emitidas por estado y por doctor.", usaFechas: true },
];

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}


/* ---------- Gráficos ---------- */
const PALETA = ["#247F76", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#EC4899", "#64748B"];

function GraficoBarras({ titulo, datos }: { titulo: string; datos: { etiqueta: string; valor: number }[] }) {
  const items = datos.slice(0, 10);
  if (items.length === 0) return null;
  const max = Math.max(1, ...items.map((d) => d.valor));
  return (
    <Tarjeta style={{ marginBottom: 12 }}>
      <Text style={s.graficoTitulo}>{titulo}</Text>
      <View style={s.grafico}>
        {items.map((d, i) => (
          <View key={`${d.etiqueta}-${i}`} style={s.columna}>
            <Text style={s.columnaValor}>{d.valor}</Text>
            <View style={[s.columnaBarra, { height: Math.max((d.valor / max) * 120, 2), backgroundColor: PALETA[i % PALETA.length] }]} />
            <Text style={s.columnaEtiqueta} numberOfLines={2}>{d.etiqueta}</Text>
          </View>
        ))}
      </View>
    </Tarjeta>
  );
}

function GraficoDistribucion({ titulo, datos }: { titulo: string; datos: Record<string, number> }) {
  const claves = Object.keys(datos).filter((k) => datos[k] > 0);
  const total = claves.reduce((a, k) => a + datos[k], 0);
  if (total === 0) return null;
  return (
    <Tarjeta style={{ marginBottom: 12 }}>
      <Text style={s.graficoTitulo}>{titulo}</Text>
      <View style={s.apilada}>
        {claves.map((k, i) => (
          <View key={k} style={{ flex: datos[k], backgroundColor: PALETA[i % PALETA.length] }} />
        ))}
      </View>
      <View style={s.leyenda}>
        {claves.map((k, i) => (
          <View key={k} style={s.leyendaItem}>
            <View style={[s.punto, { backgroundColor: PALETA[i % PALETA.length] }]} />
            <Text style={s.leyendaTexto}>
              {etiquetaEstado(k)}: {datos[k]} ({Math.round((datos[k] / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </Tarjeta>
  );
}

const nombreDoctor = (x: { doctor: string | null; doctor_id: number | null }) =>
  x.doctor ?? (x.doctor_id != null ? `Doctor #${x.doctor_id}` : "Sin doctor");

function Fila({ izquierda, derecha, sub }: { izquierda: string; derecha?: string; sub?: string }) {
  return (
    <View style={s.fila}>
      <View style={{ flex: 1 }}>
        <Text style={s.filaTitulo}>{izquierda}</Text>
        {!!sub && <Text style={s.filaSub}>{sub}</Text>}
      </View>
      {!!derecha && <Text style={s.filaValor}>{derecha}</Text>}
    </View>
  );
}

function PorEstado({ datos }: { datos: Record<string, number> }) {
  const claves = Object.keys(datos);
  if (claves.length === 0) return null;
  return (
    <View style={s.chips}>
      {claves.map((k) => (
        <Etiqueta key={k} texto={`${etiquetaEstado(k)}: ${datos[k]}`} tono="info" />
      ))}
    </View>
  );
}

export default function ReportesScreen() {
  const { token } = useAccesoC2();

  const [tipo, setTipo] = useState<TipoReporte>("ocupacion");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [umbral, setUmbral] = useState("10");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

  const actual = REPORTES.find((r) => r.valor === tipo)!;

  const generar = useCallback(async () => {
    if (!token) return;

    if (actual.usaFechas) {
      if (desde.trim() && !fechaValida(desde.trim())) return setError("«Desde» debe tener el formato AAAA-MM-DD.");
      if (hasta.trim() && !fechaValida(hasta.trim())) return setError("«Hasta» debe tener el formato AAAA-MM-DD.");
      if (desde.trim() && hasta.trim() && desde.trim() > hasta.trim())
        return setError("«Desde» no puede ser posterior a «Hasta».");
    }
    const umbralNum = Number(umbral);
    if (tipo === "inventario" && (!Number.isInteger(umbralNum) || umbralNum < 0)) {
      return setError("El umbral debe ser un número entero mayor o igual a 0.");
    }

    try {
      setCargando(true);
      setError("");
      const d = desde.trim() || undefined;
      const h = hasta.trim() || undefined;
      switch (tipo) {
        case "ocupacion":
          setResultado({ tipo, data: await reporteOcupacionSalas(token, d, h) });
          break;
        case "citas":
          setResultado({ tipo, data: await reporteCitasPorDoctor(token, d, h) });
          break;
        case "espera":
          setResultado({ tipo, data: await reporteTiemposEspera(token, d, h) });
          break;
        case "inventario":
          setResultado({ tipo, data: await reporteInventarioBajo(token, umbralNum) });
          break;
        case "recetas":
          setResultado({ tipo, data: await reporteRecetas(token, d, h) });
          break;
      }
    } catch (e) {
      setError(mensajeError(e, "No se pudo generar el reporte."));
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }, [token, tipo, desde, hasta, umbral, actual.usaFechas]);

  const descargar = async (formato: "pdf" | "excel") => {
    if (!token) return;
    if (actual.usaFechas) {
      if (desde.trim() && !fechaValida(desde.trim())) return setError("«Desde» debe tener el formato AAAA-MM-DD.");
      if (hasta.trim() && !fechaValida(hasta.trim())) return setError("«Hasta» debe tener el formato AAAA-MM-DD.");
    }
    try {
      setDescargando(formato);
      setError("");
      await descargarReporte(token, tipo, formato, {
        desde: actual.usaFechas ? desde.trim() || undefined : undefined,
        hasta: actual.usaFechas ? hasta.trim() || undefined : undefined,
        umbral: tipo === "inventario" ? Number(umbral) || 0 : undefined,
      });
    } catch (e) {
      setError(mensajeError(e, "No se pudo descargar el reporte."));
    } finally {
      setDescargando(null);
    }
  };

  // Genera automáticamente al abrir la pantalla y al cambiar de reporte
  useEffect(() => {
    generar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tipo]);

  const rango = (d: string | null, h: string | null) =>
    d || h ? `Periodo: ${d ? soloFecha(d) : "inicio"} → ${h ? soloFecha(h) : "hoy"}` : "Periodo: todo el historial";

  const renderResultado = () => {
    if (!resultado || resultado.tipo !== tipo) return null;

    switch (resultado.tipo) {
      case "ocupacion": {
        const r = resultado.data;
        const maxHoras = Math.max(0, ...r.detalle.map((x) => x.horas_ocupadas));
        return (
          <>
            <Text style={s.periodo}>{rango(r.desde, r.hasta)}</Text>
            <View style={s.estadisticas}>
              <Estadistica titulo="Salas registradas" valor={r.total_salas} />
              <Estadistica titulo="Citas en salas" valor={r.detalle.reduce((a, x) => a + x.total_citas, 0)} tono="info" />
            </View>
            <PorEstado datos={r.por_estado} />
            <GraficoDistribucion titulo="Salas por estado" datos={r.por_estado} />
            <GraficoBarras titulo="Horas ocupadas por sala" datos={r.detalle.map((x) => ({ etiqueta: x.nombre, valor: x.horas_ocupadas }))} />
            {r.detalle.length === 0 ? (
              <Vacio texto="No hay salas registradas." />
            ) : (
              <Tarjeta>
                {r.detalle.map((x) => (
                  <View key={x.sala_id} style={s.bloque}>
                    <Fila
                      izquierda={x.nombre}
                      sub={[x.tipo, x.piso ? `Piso ${x.piso}` : null, etiquetaEstado(x.estado)].filter(Boolean).join(" · ")}
                      derecha={`${x.horas_ocupadas} h · ${x.total_citas} citas`}
                    />
                    <Barra valor={x.horas_ocupadas} maximo={maxHoras} />
                  </View>
                ))}
                <Text style={s.nota}>
                  Las citas se asocian a una sala cuando la ubicación de su evento de calendario coincide con el nombre de la sala.
                </Text>
              </Tarjeta>
            )}
          </>
        );
      }

      case "citas": {
        const r = resultado.data;
        const max = Math.max(0, ...r.detalle.map((x) => x.total));
        return (
          <>
            <Text style={s.periodo}>{rango(r.desde, r.hasta)}</Text>
            <View style={s.estadisticas}>
              <Estadistica titulo="Total de citas" valor={r.total_citas} />
              <Estadistica titulo="Doctores con citas" valor={r.detalle.length} tono="info" />
            </View>
            <GraficoBarras titulo="Citas por doctor" datos={r.detalle.map((x) => ({ etiqueta: nombreDoctor(x), valor: x.total }))} />
            <GraficoDistribucion
              titulo="Citas por estado"
              datos={r.detalle.reduce((acc: Record<string, number>, x) => {
                Object.entries(x.por_estado).forEach(([k, v]) => (acc[k] = (acc[k] ?? 0) + v));
                return acc;
              }, {})}
            />
            {r.detalle.length === 0 ? (
              <Vacio texto="No hay citas en este periodo." />
            ) : (
              <Tarjeta>
                {r.detalle.map((x, i) => (
                  <View key={`${x.doctor_id}-${i}`} style={s.bloque}>
                    <Fila
                      izquierda={x.doctor ?? (x.doctor_id != null ? `Doctor #${x.doctor_id}` : "Sin doctor asignado")}
                      derecha={`${x.total} citas`}
                      sub={Object.entries(x.por_estado)
                        .map(([k, v]) => `${etiquetaEstado(k)}: ${v}`)
                        .join(" · ")}
                    />
                    <Barra valor={x.total} maximo={max} />
                  </View>
                ))}
              </Tarjeta>
            )}
          </>
        );
      }

      case "espera": {
        const r = resultado.data;
        const max = Math.max(0, ...r.detalle.map((x) => x.promedio_minutos));
        return (
          <>
            <Text style={s.periodo}>{rango(r.desde, r.hasta)}</Text>
            <View style={s.estadisticas}>
              <Estadistica titulo="Espera promedio (min)" valor={r.promedio_minutos} tono={r.promedio_minutos > 30 ? "warn" : "ok"} />
              <Estadistica titulo="Pacientes atendidos" valor={r.total_atenciones} tono="info" />
            </View>
            <GraficoBarras titulo="Espera promedio por doctor (min)" datos={r.detalle.map((x) => ({ etiqueta: nombreDoctor(x), valor: x.promedio_minutos }))} />
            {r.detalle.length === 0 ? (
              <Vacio texto="No hay turnos llamados en este periodo." />
            ) : (
              <Tarjeta>
                {r.detalle.map((x, i) => (
                  <View key={`${x.doctor_id}-${i}`} style={s.bloque}>
                    <Fila
                      izquierda={x.doctor ?? (x.doctor_id != null ? `Doctor #${x.doctor_id}` : "Sin doctor asignado")}
                      sub={`${x.atenciones} atenciones · máximo ${x.maximo_minutos} min`}
                      derecha={`${x.promedio_minutos} min`}
                    />
                    <Barra valor={x.promedio_minutos} maximo={max} color={C.aviso} />
                  </View>
                ))}
              </Tarjeta>
            )}
          </>
        );
      }

      case "inventario": {
        const r = resultado.data;
        return (
          <>
            <View style={s.estadisticas}>
              <Estadistica titulo={`Medicamentos con ≤ ${r.umbral} unidades`} valor={r.total} tono={r.total > 0 ? "danger" : "ok"} />
            </View>
            <GraficoBarras titulo="Existencias por medicamento" datos={r.detalle.map((x) => ({ etiqueta: x.nombre, valor: x.stock_total }))} />
            {r.detalle.length === 0 ? (
              <Vacio texto="Ningún medicamento está por debajo del umbral." />
            ) : (
              <Tarjeta>
                {r.detalle.map((x) => (
                  <View key={x.medicamento_id} style={s.bloque}>
                    <Fila
                      izquierda={x.nombre}
                      sub={[
                        x.presentacion,
                        x.categoria,
                        `${x.lotes} ${x.lotes === 1 ? "lote" : "lotes"}`,
                        x.proximo_vencimiento ? `vence ${soloFecha(x.proximo_vencimiento)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      derecha={`${x.stock_total} uds`}
                    />
                  </View>
                ))}
              </Tarjeta>
            )}
          </>
        );
      }

      case "recetas": {
        const r = resultado.data;
        const max = Math.max(0, ...r.detalle.map((x) => x.total));
        return (
          <>
            <Text style={s.periodo}>{rango(r.desde, r.hasta)}</Text>
            <View style={s.estadisticas}>
              <Estadistica titulo="Recetas emitidas" valor={r.total} />
            </View>
            <PorEstado datos={r.por_estado} />
            <GraficoDistribucion titulo="Recetas por estado" datos={r.por_estado} />
            <GraficoBarras titulo="Recetas por doctor" datos={r.detalle.map((x) => ({ etiqueta: nombreDoctor(x), valor: x.total }))} />
            {r.detalle.length === 0 ? (
              <Vacio texto="No hay recetas en este periodo." />
            ) : (
              <Tarjeta>
                {r.detalle.map((x, i) => (
                  <View key={`${x.doctor_id}-${i}`} style={s.bloque}>
                    <Fila
                      izquierda={x.doctor ?? (x.doctor_id != null ? `Doctor #${x.doctor_id}` : "Sin doctor asignado")}
                      derecha={`${x.total} recetas`}
                    />
                    <Barra valor={x.total} maximo={max} />
                  </View>
                ))}
              </Tarjeta>
            )}
          </>
        );
      }
    }
  };

  return (
    <PantallaC2 titulo="Reportes" subtitulo="Indicadores de operación de la clínica calculados con los datos del sistema.">
      <Opciones valor={tipo} onChange={setTipo} opciones={REPORTES.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))} />
      <Text style={s.descripcion}>{actual.descripcion}</Text>

      <Tarjeta>
        <View style={s.filtros}>
          {actual.usaFechas ? (
            <>
              <Campo etiqueta="Desde" value={desde} onChangeText={setDesde} placeholder="AAAA-MM-DD" />
              <Campo etiqueta="Hasta" value={hasta} onChangeText={setHasta} placeholder="AAAA-MM-DD" />
            </>
          ) : (
            <Campo
              etiqueta="Umbral de stock"
              value={umbral}
              onChangeText={(t) => setUmbral(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              ayuda="Se listan los medicamentos con existencias iguales o menores a este número."
            />
          )}
        </View>
        <View style={s.filtros}>
          <Boton texto="Generar reporte" onPress={generar} cargando={cargando} />
          <Boton texto="Descargar PDF" variante="secundario" onPress={() => descargar("pdf")} cargando={descargando === "pdf"} />
          <Boton texto="Descargar Excel" variante="secundario" onPress={() => descargar("excel")} cargando={descargando === "excel"} />
          {actual.usaFechas && (
            <>
              <Boton
                texto="Últimos 30 días"
                variante="secundario"
                onPress={() => {
                  setDesde(hoyISO(-30));
                  setHasta(hoyISO());
                }}
              />
              <Boton
                texto="Todo el historial"
                variante="secundario"
                onPress={() => {
                  setDesde("");
                  setHasta("");
                }}
              />
            </>
          )}
        </View>
      </Tarjeta>

      {!!error && <Aviso tipo="error" texto={error} />}
      {cargando ? <Cargando /> : renderResultado()}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  descripcion: { fontSize: 12, color: C.muted, marginBottom: 12 },
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
  periodo: { fontSize: 12, color: C.muted, fontWeight: "700", marginBottom: 10 },
  estadisticas: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  bloque: { marginBottom: 14 },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  filaTitulo: { fontSize: 13, fontWeight: "800", color: C.texto },
  filaSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  filaValor: { fontSize: 13, fontWeight: "800", color: C.primario },
  graficoTitulo: { fontSize: 13, fontWeight: "800", color: C.texto, marginBottom: 10 },
  grafico: { flexDirection: "row", alignItems: "flex-end", gap: 8, minHeight: 170 },
  columna: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  columnaValor: { fontSize: 10, fontWeight: "800", color: C.muted, marginBottom: 3 },
  columnaBarra: { width: "70%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  columnaEtiqueta: { fontSize: 9, color: C.muted, marginTop: 4, textAlign: "center" },
  apilada: { flexDirection: "row", height: 22, borderRadius: 11, overflow: "hidden", marginBottom: 10 },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 11, color: C.texto },
  nota: { fontSize: 10, color: C.muted, marginTop: 4 },
});
