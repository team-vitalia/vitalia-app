import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "../../context/ThemeContext";
import {
  ReporteCitasPorDoctor,
  ReporteInventarioBajo,
  ReporteOcupacionSalas,
  ReporteRecetas,
  ReporteTiemposEspera,
  descargarReporte,
  mensajeError,
  reporteCitasPorDoctor,
  reporteInventarioBajo,
  reporteOcupacionSalas,
  reporteRecetas,
  reporteTiemposEspera,
} from "../../services/c2Service";
import { useAccesoC2 } from "../c2/ui";

type TipoReporte = "ocupacion" | "citas" | "espera" | "inventario" | "recetas";

type Resultado =
  | { tipo: "ocupacion"; data: ReporteOcupacionSalas }
  | { tipo: "citas"; data: ReporteCitasPorDoctor }
  | { tipo: "espera"; data: ReporteTiemposEspera }
  | { tipo: "inventario"; data: ReporteInventarioBajo }
  | { tipo: "recetas"; data: ReporteRecetas };

const REPORTES: {
  valor: TipoReporte;
  etiqueta: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  usaFechas: boolean;
}[] = [
  {
    valor: "ocupacion",
    etiqueta: "Ocupación de salas",
    descripcion: "Horas ocupadas por citas médicas y estatus actual de cada sala.",
    icono: "business-outline",
    usaFechas: true,
  },
  {
    valor: "citas",
    etiqueta: "Citas por doctor",
    descripcion: "Volumen y distribución de citas de cada médico por estado.",
    icono: "people-outline",
    usaFechas: true,
  },
  {
    valor: "espera",
    etiqueta: "Tiempos de espera",
    descripcion: "Minutos transcurridos entre el registro en recepción y la atención médica.",
    icono: "timer-outline",
    usaFechas: true,
  },
  {
    valor: "inventario",
    etiqueta: "Inventario bajo",
    descripcion: "Medicamentos con existencias iguales o inferiores al umbral mínimo.",
    icono: "cube-outline",
    usaFechas: false,
  },
  {
    valor: "recetas",
    etiqueta: "Recetas emitidas",
    descripcion: "Cantidad de recetas emitidas por cada médico tratante.",
    icono: "medkit-outline",
    usaFechas: true,
  },
];

function hoyISO(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

export function ProfessionalReportsView() {
  const { theme: c, isDark } = useAppTheme();
  const { token } = useAccesoC2();

  const [tipo, setTipo] = useState<TipoReporte>("ocupacion");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [umbral, setUmbral] = useState("10");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState<"pdf" | "excel" | null>(null);

  // Búsqueda y ordenamiento en tablas
  const [filtroTexto, setFiltroTexto] = useState("");
  const [ordenColumna, setOrdenColumna] = useState<string>("principal");
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);

  const actual = REPORTES.find((r) => r.valor === tipo)!;

  const aplicarFiltroRapido = (dias: number | null) => {
    if (dias === null) {
      setDesde("");
      setHasta("");
    } else {
      setDesde(hoyISO(-dias));
      setHasta(hoyISO());
    }
  };

  const generar = useCallback(async () => {
    if (!token) return;

    if (actual.usaFechas) {
      if (desde.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(desde.trim())) {
        return setError("«Desde» debe tener el formato AAAA-MM-DD.");
      }
      if (hasta.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(hasta.trim())) {
        return setError("«Hasta» debe tener el formato AAAA-MM-DD.");
      }
      if (desde.trim() && hasta.trim() && desde.trim() > hasta.trim()) {
        return setError("«Desde» no puede ser posterior a «Hasta».");
      }
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
    try {
      setDescargando(formato);
      setError("");
      await descargarReporte(token, tipo, formato, {
        desde: actual.usaFechas ? desde.trim() || undefined : undefined,
        hasta: actual.usaFechas ? hasta.trim() || undefined : undefined,
        umbral: tipo === "inventario" ? Number(umbral) || 0 : undefined,
      });
    } catch (e) {
      setError(mensajeError(e, "No se pudo descargar el archivo."));
    } finally {
      setDescargando(null);
    }
  };

  useEffect(() => {
    generar();
  }, [token, tipo]);

  // Manejo de orden en columnas
  const alternarOrden = (col: string) => {
    if (ordenColumna === col) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenColumna(col);
      setOrdenAsc(false);
    }
  };

  // Renderizado de tabla interactiva según reporte
  const renderTabla = () => {
    if (!resultado || resultado.tipo !== tipo) return null;

    if (resultado.tipo === "ocupacion") {
      const salas = resultado.data.detalle.filter((s) =>
        s.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (s.tipo || "").toLowerCase().includes(filtroTexto.toLowerCase())
      );
      const ordenadas = [...salas].sort((a, b) => {
        if (ordenColumna === "horas") {
          return ordenAsc ? a.horas_ocupadas - b.horas_ocupadas : b.horas_ocupadas - a.horas_ocupadas;
        }
        if (ordenColumna === "citas") {
          return ordenAsc ? a.total_citas - b.total_citas : b.total_citas - a.total_citas;
        }
        return ordenAsc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
      });

      if (ordenadas.length === 0) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="folder-open-outline" size={38} color={c.muted} />
            <Text style={[styles.emptyTitulo, { color: c.text }]}>Sin actividad de salas</Text>
            <Text style={[styles.emptyDesc, { color: c.muted }]}>
              No se encontraron salas o citas en el periodo filtrado. Prueba ampliando el rango de fechas.
            </Text>
          </View>
        );
      }

      return (
        <View style={[styles.tablaCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.thFila, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
            <Pressable style={styles.thColFlex} onPress={() => alternarOrden("nombre")}>
              <Text style={[styles.thTexto, { color: c.text }]}>SALA {ordenColumna === "nombre" ? (ordenAsc ? "↑" : "↓") : ""}</Text>
            </Pressable>
            <View style={styles.thCol}><Text style={[styles.thTexto, { color: c.text }]}>TIPO / PISO</Text></View>
            <Pressable style={styles.thCol} onPress={() => alternarOrden("citas")}>
              <Text style={[styles.thTexto, { color: c.text }]}>CITAS {ordenColumna === "citas" ? (ordenAsc ? "↑" : "↓") : ""}</Text>
            </Pressable>
            <Pressable style={styles.thCol} onPress={() => alternarOrden("horas")}>
              <Text style={[styles.thTexto, { color: c.text }]}>HORAS {ordenColumna === "horas" ? (ordenAsc ? "↑" : "↓") : ""}</Text>
            </Pressable>
          </View>
          {ordenadas.map((s, idx) => (
            <View
              key={s.sala_id}
              style={[
                styles.tdFila,
                { borderBottomColor: c.border, backgroundColor: idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA") : "transparent" },
              ]}
            >
              <View style={styles.thColFlex}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{s.nombre}</Text>
                <Text style={[styles.tdSub, { color: c.muted }]}>{s.estado || "Disponible"}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTexto, { color: c.text }]}>{s.tipo || "General"}</Text>
                <Text style={[styles.tdSub, { color: c.muted }]}>Piso {s.piso || "1"}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: c.primary }]}>{s.total_citas}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{s.horas_ocupadas} hrs</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (resultado.tipo === "citas") {
      const doctores = resultado.data.detalle.filter((d) =>
        (d.doctor || "Sin doctor").toLowerCase().includes(filtroTexto.toLowerCase())
      );
      const ordenadas = [...doctores].sort((a, b) =>
        ordenAsc ? a.total - b.total : b.total - a.total
      );

      if (ordenadas.length === 0) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="calendar-outline" size={38} color={c.muted} />
            <Text style={[styles.emptyTitulo, { color: c.text }]}>Sin citas registradas</Text>
            <Text style={[styles.emptyDesc, { color: c.muted }]}>No existen citas en este periodo. Amplía las fechas de búsqueda.</Text>
          </View>
        );
      }

      return (
        <View style={[styles.tablaCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.thFila, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
            <View style={styles.thColFlex}><Text style={[styles.thTexto, { color: c.text }]}>MÉDICO</Text></View>
            <Pressable style={styles.thCol} onPress={() => setOrdenAsc(!ordenAsc)}>
              <Text style={[styles.thTexto, { color: c.text }]}>TOTAL CITAS {ordenAsc ? "↑" : "↓"}</Text>
            </Pressable>
            <View style={styles.thColFlex}><Text style={[styles.thTexto, { color: c.text }]}>ESTADOS</Text></View>
          </View>
          {ordenadas.map((d, idx) => (
            <View
              key={`${d.doctor_id}-${idx}`}
              style={[
                styles.tdFila,
                { borderBottomColor: c.border, backgroundColor: idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA") : "transparent" },
              ]}
            >
              <View style={styles.thColFlex}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{d.doctor || `Doctor #${d.doctor_id}`}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: c.primary, fontSize: 14 }]}>{d.total}</Text>
              </View>
              <View style={[styles.thColFlex, { flexDirection: "row", flexWrap: "wrap", gap: 4 }]}>
                {Object.entries(d.por_estado).map(([k, v]) => (
                  <View key={k} style={styles.tagEstado}>
                    <Text style={styles.tagTexto}>{k}: {v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (resultado.tipo === "espera") {
      const docs = resultado.data.detalle.filter((d) =>
        (d.doctor || "Sin doctor").toLowerCase().includes(filtroTexto.toLowerCase())
      );
      const ordenadas = [...docs].sort((a, b) =>
        ordenAsc ? a.promedio_minutos - b.promedio_minutos : b.promedio_minutos - a.promedio_minutos
      );

      if (ordenadas.length === 0) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="hourglass-outline" size={38} color={c.muted} />
            <Text style={[styles.emptyTitulo, { color: c.text }]}>Sin registros de espera</Text>
            <Text style={[styles.emptyDesc, { color: c.muted }]}>No se registraron atenciones en cola de recepción durante este periodo.</Text>
          </View>
        );
      }

      return (
        <View style={[styles.tablaCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.thFila, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
            <View style={styles.thColFlex}><Text style={[styles.thTexto, { color: c.text }]}>MÉDICO</Text></View>
            <View style={styles.thCol}><Text style={[styles.thTexto, { color: c.text }]}>ATENCIONES</Text></View>
            <Pressable style={styles.thCol} onPress={() => setOrdenAsc(!ordenAsc)}>
              <Text style={[styles.thTexto, { color: c.text }]}>ESPERA PROM. {ordenAsc ? "↑" : "↓"}</Text>
            </Pressable>
            <View style={styles.thCol}><Text style={[styles.thTexto, { color: c.text }]}>MÁXIMO</Text></View>
          </View>
          {ordenadas.map((d, idx) => (
            <View
              key={`${d.doctor_id}-${idx}`}
              style={[
                styles.tdFila,
                { borderBottomColor: c.border, backgroundColor: idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA") : "transparent" },
              ]}
            >
              <View style={styles.thColFlex}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{d.doctor || `Doctor #${d.doctor_id}`}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTexto, { color: c.text }]}>{d.atenciones}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: d.promedio_minutos > 20 ? "#DC2626" : c.primary }]}>
                  {d.promedio_minutos} min
                </Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTexto, { color: c.muted }]}>{d.maximo_minutos} min</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (resultado.tipo === "inventario") {
      const items = resultado.data.detalle.filter((m) =>
        m.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        (m.categoria || "").toLowerCase().includes(filtroTexto.toLowerCase())
      );
      const ordenadas = [...items].sort((a, b) =>
        ordenAsc ? a.stock_total - b.stock_total : b.stock_total - a.stock_total
      );

      if (ordenadas.length === 0) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="checkmark-circle-outline" size={38} color="#16A34A" />
            <Text style={[styles.emptyTitulo, { color: c.text }]}>Inventario Saludable</Text>
            <Text style={[styles.emptyDesc, { color: c.muted }]}>
              No hay medicamentos con stock inferior a {umbral} unidades. Todos los suministros se encuentran cubiertos.
            </Text>
          </View>
        );
      }

      return (
        <View style={[styles.tablaCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.thFila, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
            <View style={styles.thColFlex}><Text style={[styles.thTexto, { color: c.text }]}>MEDICAMENTO</Text></View>
            <View style={styles.thCol}><Text style={[styles.thTexto, { color: c.text }]}>CATEGORÍA</Text></View>
            <Pressable style={styles.thCol} onPress={() => setOrdenAsc(!ordenAsc)}>
              <Text style={[styles.thTexto, { color: c.text }]}>STOCK {ordenAsc ? "↑" : "↓"}</Text>
            </Pressable>
            <View style={styles.thCol}><Text style={[styles.thTexto, { color: c.text }]}>PRÓX. VENCE</Text></View>
          </View>
          {ordenadas.map((m, idx) => (
            <View
              key={m.medicamento_id}
              style={[
                styles.tdFila,
                { borderBottomColor: c.border, backgroundColor: idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA") : "transparent" },
              ]}
            >
              <View style={styles.thColFlex}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{m.nombre}</Text>
                <Text style={[styles.tdSub, { color: c.muted }]}>{m.presentacion || "Sin presentación"}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTexto, { color: c.text }]}>{m.categoria || "General"}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: "#DC2626" }]}>{m.stock_total}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTexto, { color: c.muted }]}>{m.proximo_vencimiento ? soloFecha(m.proximo_vencimiento) : "N/D"}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (resultado.tipo === "recetas") {
      const recs = resultado.data.detalle.filter((r) =>
        (r.doctor || "Sin doctor").toLowerCase().includes(filtroTexto.toLowerCase())
      );
      const ordenadas = [...recs].sort((a, b) =>
        ordenAsc ? a.total - b.total : b.total - a.total
      );

      if (ordenadas.length === 0) {
        return (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="medkit-outline" size={38} color={c.muted} />
            <Text style={[styles.emptyTitulo, { color: c.text }]}>Sin recetas emitidas</Text>
            <Text style={[styles.emptyDesc, { color: c.muted }]}>No se registraron recetas médicas en el periodo filtrado.</Text>
          </View>
        );
      }

      return (
        <View style={[styles.tablaCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.thFila, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
            <View style={styles.thColFlex}><Text style={[styles.thTexto, { color: c.text }]}>DOCTOR</Text></View>
            <Pressable style={styles.thCol} onPress={() => setOrdenAsc(!ordenAsc)}>
              <Text style={[styles.thTexto, { color: c.text }]}>RECETAS EMITIDAS {ordenAsc ? "↑" : "↓"}</Text>
            </Pressable>
          </View>
          {ordenadas.map((r, idx) => (
            <View
              key={`${r.doctor_id}-${idx}`}
              style={[
                styles.tdFila,
                { borderBottomColor: c.border, backgroundColor: idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.02)" : "#FAFAFA") : "transparent" },
              ]}
            >
              <View style={styles.thColFlex}>
                <Text style={[styles.tdTextoBold, { color: c.text }]}>{r.doctor || `Doctor #${r.doctor_id}`}</Text>
              </View>
              <View style={styles.thCol}>
                <Text style={[styles.tdTextoBold, { color: c.primary, fontSize: 14 }]}>{r.total}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    return null;
  };

  // Renderizado de tarjetas de KPIs superiores
  const renderKPIs = () => {
    if (!resultado || resultado.tipo !== tipo) return null;

    let kpi1 = { titulo: "", valor: "", icono: "bar-chart-outline" as any, color: c.primary };
    let kpi2 = { titulo: "", valor: "", icono: "stats-chart-outline" as any, color: "#0EA5E9" };
    let kpi3 = { titulo: "", valor: "", icono: "time-outline" as any, color: "#10B981" };

    if (resultado.tipo === "ocupacion") {
      kpi1 = { titulo: "Salas Registradas", valor: String(resultado.data.total_salas), icono: "business", color: c.primary };
      const citasTotal = resultado.data.detalle.reduce((a, x) => a + x.total_citas, 0);
      kpi2 = { titulo: "Citas en Salas", valor: String(citasTotal), icono: "calendar", color: "#0EA5E9" };
      const horasTotales = resultado.data.detalle.reduce((a, x) => a + x.horas_ocupadas, 0);
      kpi3 = { titulo: "Horas Ocupadas", valor: `${horasTotales.toFixed(1)} hrs`, icono: "time", color: "#10B981" };
    } else if (resultado.tipo === "citas") {
      kpi1 = { titulo: "Total de Citas", valor: String(resultado.data.total_citas), icono: "calendar", color: c.primary };
      kpi2 = { titulo: "Doctores Activos", valor: String(resultado.data.detalle.length), icono: "people", color: "#0EA5E9" };
      const atendidas = resultado.data.detalle.reduce((a, x) => a + (x.por_estado?.atendida || 0), 0);
      kpi3 = { titulo: "Citas Atendidas", valor: String(atendidas), icono: "checkmark-done-circle", color: "#10B981" };
    } else if (resultado.tipo === "espera") {
      kpi1 = { titulo: "Espera Promedio", valor: `${resultado.data.promedio_minutos} min`, icono: "timer", color: resultado.data.promedio_minutos > 20 ? "#DC2626" : c.primary };
      kpi2 = { titulo: "Pacientes Atendidos", valor: String(resultado.data.total_atenciones), icono: "people", color: "#0EA5E9" };
      const maxEspera = Math.max(0, ...resultado.data.detalle.map((d) => d.maximo_minutos));
      kpi3 = { titulo: "Espera Máxima", valor: `${maxEspera} min`, icono: "alert-circle", color: "#F59E0B" };
    } else if (resultado.tipo === "inventario") {
      kpi1 = { titulo: "Medicamentos en Riesgo", valor: String(resultado.data.total), icono: "alert-triangle", color: "#DC2626" };
      kpi2 = { titulo: "Umbral de Alerta", valor: `≤ ${resultado.data.umbral} uds`, icono: "shield-checkmark", color: "#0EA5E9" };
      const totalLotes = resultado.data.detalle.reduce((a, x) => a + x.lotes, 0);
      kpi3 = { titulo: "Lotes Afectados", valor: String(totalLotes), icono: "cube", color: "#F59E0B" };
    } else if (resultado.tipo === "recetas") {
      kpi1 = { titulo: "Recetas Emitidas", valor: String(resultado.data.total), icono: "medkit", color: c.primary };
      kpi2 = { titulo: "Doctores Recetando", valor: String(resultado.data.detalle.length), icono: "people", color: "#0EA5E9" };
      const promedio = resultado.data.detalle.length ? Math.round(resultado.data.total / resultado.data.detalle.length) : 0;
      kpi3 = { titulo: "Promedio por Doctor", valor: String(promedio), icono: "stats-chart", color: "#10B981" };
    }

    return (
      <View style={styles.kpiGrid}>
        {[kpi1, kpi2, kpi3].map((k, idx) => (
          <View key={idx} style={[styles.kpiCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: `${k.color}15` }]}>
              <Ionicons name={k.icono} size={22} color={k.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kpiValor, { color: c.text }]}>{k.valor}</Text>
              <Text style={[styles.kpiTitulo, { color: c.muted }]}>{k.titulo}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Cabecera del Módulo Profesional */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: c.text }]}>Reportes</Text>
          <Text style={[styles.subtitulo, { color: c.muted }]}>
            Consulta el estado de citas, médicos, salas de consulta, medicamentos y recetas de tu clínica.
          </Text>
        </View>
      </View>

      {/* Selector de Tipo de Reporte */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {REPORTES.map((r) => {
          const activo = r.valor === tipo;
          return (
            <Pressable
              key={r.valor}
              onPress={() => setTipo(r.valor)}
              style={[
                styles.tabBtn,
                { backgroundColor: activo ? c.primary : c.card, borderColor: activo ? c.primary : c.border },
              ]}
            >
              <Ionicons name={r.icono} size={16} color={activo ? "#FFFFFF" : c.muted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabTexto, { color: activo ? "#FFFFFF" : c.text }]}>{r.etiqueta}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* SECCIÓN 1: BARRA DE FILTROS RÁPIDOS */}
      <View style={[styles.seccionCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.seccionTituloFila}>
          <Ionicons name="filter-outline" size={16} color={c.primary} />
          <Text style={[styles.seccionTitulo, { color: c.text }]}>Filtros de Periodo</Text>
        </View>

        {actual.usaFechas && (
          <View style={styles.filtrosRapidosRow}>
            <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(0)}>
              <Text style={[styles.chipTexto, { color: c.text }]}>Hoy</Text>
            </Pressable>
            <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(7)}>
              <Text style={[styles.chipTexto, { color: c.text }]}>Últimos 7 días</Text>
            </Pressable>
            <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(30)}>
              <Text style={[styles.chipTexto, { color: c.text }]}>Últimos 30 días</Text>
            </Pressable>
            <Pressable style={[styles.chipFiltro, { borderColor: c.border }]} onPress={() => aplicarFiltroRapido(null)}>
              <Text style={[styles.chipTexto, { color: c.text }]}>Todo el historial</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputsFila}>
          {actual.usaFechas ? (
            <>
              <View style={styles.inputCol}>
                <Text style={[styles.labelInput, { color: c.muted }]}>Desde (AAAA-MM-DD)</Text>
                <TextInput
                  value={desde}
                  onChangeText={setDesde}
                  placeholder="2026-10-01"
                  placeholderTextColor={c.muted}
                  style={[styles.inputBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.labelInput, { color: c.muted }]}>Hasta (AAAA-MM-DD)</Text>
                <TextInput
                  value={hasta}
                  onChangeText={setHasta}
                  placeholder="2026-10-31"
                  placeholderTextColor={c.muted}
                  style={[styles.inputBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
                />
              </View>
            </>
          ) : (
            <View style={styles.inputCol}>
              <Text style={[styles.labelInput, { color: c.muted }]}>Umbral de Existencias Mínimas</Text>
              <TextInput
                value={umbral}
                onChangeText={(t) => setUmbral(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={[styles.inputBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC", borderColor: c.border, color: c.text }]}
              />
            </View>
          )}
        </View>
      </View>

      {/* SECCIÓN 2: BARRA SEPARADA DE ACCIONES DE EXPORTACIÓN */}
      <View style={[styles.accionesBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Pressable
          style={[styles.btnGenerar, { backgroundColor: c.primary }]}
          onPress={generar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnGenerarTexto}>Generar reporte</Text>
            </>
          )}
        </Pressable>

        <View style={styles.exportarGrupo}>
          <Pressable
            style={[styles.btnExportar, { borderColor: c.border }]}
            onPress={() => descargar("pdf")}
            disabled={descargando !== null}
          >
            {descargando === "pdf" ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.btnExportarTexto, { color: c.text }]}>Exportar PDF</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.btnExportar, { borderColor: c.border }]}
            onPress={() => descargar("excel")}
            disabled={descargando !== null}
          >
            {descargando === "excel" ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <>
                <Ionicons name="grid-outline" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={[styles.btnExportarTexto, { color: c.text }]}>Exportar Excel</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Aviso de Error */}
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}

      {/* KPIs Destacados */}
      {renderKPIs()}

      {/* Barra de Búsqueda de Tabla */}
      <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={18} color={c.muted} style={{ marginRight: 8 }} />
        <TextInput
          value={filtroTexto}
          onChangeText={setFiltroTexto}
          placeholder="Buscar en la tabla..."
          placeholderTextColor={c.muted}
          style={[styles.searchInput, { color: c.text }]}
        />
        {!!filtroTexto && (
          <Pressable onPress={() => setFiltroTexto("")}>
            <Ionicons name="close-circle" size={18} color={c.muted} />
          </Pressable>
        )}
      </View>

      {/* Tabla y Resultados */}
      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingTexto, { color: c.muted }]}>Calculando indicadores del periodo...</Text>
        </View>
      ) : (
        renderTabla()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  header: { marginBottom: 16 },
  badgeProfesional: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 118, 110, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(15, 118, 110, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  badgeProfesionalTexto: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F766E",
    letterSpacing: 0.5,
  },
  titulo: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitulo: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  tabsScroll: { marginBottom: 14 },
  tabsContainer: { gap: 8 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabTexto: { fontSize: 13, fontWeight: "700" },
  seccionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  seccionTituloFila: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  seccionTitulo: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.3 },
  filtrosRapidosRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chipFiltro: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  chipTexto: { fontSize: 11.5, fontWeight: "600" },
  inputsFila: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  inputCol: { flex: 1, minWidth: 140 },
  labelInput: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  inputBox: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  accionesBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  btnGenerar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnGenerarTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  exportarGrupo: { flexDirection: "row", gap: 8 },
  btnExportar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnExportarTexto: { fontSize: 12, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTexto: { color: "#DC2626", fontSize: 12.5, fontWeight: "600" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValor: { fontSize: 17, fontWeight: "800" },
  kpiTitulo: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  loadingTexto: { marginTop: 10, fontSize: 13 },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
    marginTop: 6,
  },
  emptyTitulo: { fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptyDesc: { fontSize: 12.5, textAlign: "center", marginTop: 6, maxWidth: 380, lineHeight: 18 },
  tablaCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  thFila: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  thColFlex: { flex: 1, minWidth: 110, justifyContent: "center" },
  thCol: { width: 90, alignItems: "center", justifyContent: "center" },
  thTexto: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },
  tdFila: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1 },
  tdTextoBold: { fontSize: 13, fontWeight: "700" },
  tdTexto: { fontSize: 12.5 },
  tdSub: { fontSize: 11, marginTop: 2 },
  tagEstado: { backgroundColor: "rgba(15, 118, 110, 0.1)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTexto: { fontSize: 10, fontWeight: "700", color: "#0F766E" },
});
