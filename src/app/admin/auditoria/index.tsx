import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../context/AuthContext";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  PantallaC2,
  Paginador,
  Tarjeta,
  Vacio,
  useAccesoC2,
} from "../../../components/c2/ui";
import { BloqueoPlan, CirculoIcono, IconName, RangoFechas, hoyLocal, useEstilosC2, type Paleta } from "../../../components/c2/extra";
import {
  CatalogoAuditoria,
  PageMeta,
  RegistroAuditoria,
  ResumenAuditoria,
  catalogoAuditoria,
  listarAuditoria,
  mensajeError,
  resumenAuditoria,
} from "../../../services/c2Service";

const COLOR_TONO: Record<string, string> = {
  ok: "#16A34A",
  info: "#2563EB",
  warn: "#D97706",
  danger: "#DC2626",
  neutral: "#64748B",
};

const AREAS_FALLBACK: CatalogoAuditoria = {
  areas: [
    { valor: "", etiqueta: "Todas las áreas", icono: "apps-outline" },
    { valor: "salas", etiqueta: "Salas y equipos", icono: "business-outline" },
    { valor: "inventario", etiqueta: "Inventario", icono: "cube-outline" },
    { valor: "citas", etiqueta: "Citas", icono: "calendar-outline" },
    { valor: "clinico", etiqueta: "Pacientes y consultas", icono: "medkit-outline" },
    { valor: "ia", etiqueta: "Inteligencia artificial", icono: "sparkles-outline" },
  ],
  acciones: [
    { valor: "", etiqueta: "Todo tipo de acciones" },
    { valor: "crear", etiqueta: "Creó / registró", tono: "ok" },
    { valor: "modificar", etiqueta: "Modificó", tono: "info" },
    { valor: "estado", etiqueta: "Cambió un estado", tono: "info" },
    { valor: "eliminar", etiqueta: "Eliminó", tono: "danger" },
    { valor: "consultar", etiqueta: "Consultó", tono: "neutral" },
    { valor: "sala", etiqueta: "Reservó / cambió sala", tono: "ok" },
    { valor: "ia", etiqueta: "Usó el asistente IA", tono: "info" },
  ],
};

/** "Hoy, 10:32" · "Ayer, 18:05" · "12 nov 2026, 09:10" */
function cuando(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const mismo = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismo(d, hoy)) return `Hoy, ${hora}`;
  if (mismo(d, ayer)) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}, ${hora}`;
}

function Cambios({ reg }: { reg: RegistroAuditoria }) {
  const { s } = useEstilosC2(crearEstilos);
  const cambios = reg.cambios ?? [];
  if (cambios.length === 0) return <Text style={s.nota}>Este movimiento no guardó más datos.</Text>;
  const modo = reg.modo_cambios;
  return (
    <View style={s.tabla}>
      <View style={s.tablaFila}>
        <Text style={[s.celda, s.celdaCampo, s.cab]}>Dato</Text>
        {modo === "cambio" && <Text style={[s.celda, s.cab]}>Antes</Text>}
        <Text style={[s.celda, s.cab]}>{modo === "baja" ? "Valor que tenía" : modo === "alta" ? "Valor registrado" : "Ahora"}</Text>
      </View>
      {cambios.map((c) => (
        <View key={c.campo} style={[s.tablaFila, modo === "cambio" && s.filaCambio]}>
          <Text style={[s.celda, s.celdaCampo]}>{c.etiqueta}</Text>
          {modo === "cambio" && <Text style={[s.celda, s.antes]}>{c.antes}</Text>}
          <Text style={[s.celda, modo === "cambio" && s.ahora]}>{modo === "baja" ? c.antes : c.despues}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AuditoriaScreen() {
  const { C, s } = useEstilosC2(crearEstilos);
  const { token } = useAccesoC2();
  const { planActual } = useAuth();

  const plan = (planActual?.nombre_plan || "basico").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const tieneAcceso = plan === "empresarial";

  const [catalogo, setCatalogo] = useState<CatalogoAuditoria>(AREAS_FALLBACK);
  const [resumen, setResumen] = useState<ResumenAuditoria | null>(null);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [tecnico, setTecnico] = useState<number | null>(null);

  const [area, setArea] = useState("");
  const [tipoAccion, setTipoAccion] = useState("");
  const [buscarInput, setBuscarInput] = useState("");
  const [buscar, setBuscar] = useState("");
  const [desde, setDesde] = useState(hoyLocal(-7));
  const [hasta, setHasta] = useState(hoyLocal());
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (!token || !tieneAcceso) return;
    catalogoAuditoria(token).then(setCatalogo).catch(() => setCatalogo(AREAS_FALLBACK));
  }, [token, tieneAcceso]);

  const cargar = useCallback(async () => {
    if (!token || !tieneAcceso) {
      setCargando(false);
      return;
    }
    try {
      setCargando(true);
      setError("");
      const d = desde ? `${desde}T00:00:00` : undefined;
      const h = hasta ? `${hasta}T23:59:59` : undefined;
      const [lista, res] = await Promise.all([
        listarAuditoria(token, { area, tipo_accion: tipoAccion, buscar, desde: d, hasta: h, page: pagina, page_size: 15 }),
        resumenAuditoria(token, d, h),
      ]);
      setRegistros(lista.data);
      setMeta(lista.meta);
      setResumen(res);
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el historial de actividad."));
    } finally {
      setCargando(false);
    }
  }, [token, tieneAcceso, area, tipoAccion, buscar, desde, hasta, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const limpiar = () => {
    setArea("");
    setTipoAccion("");
    setBuscarInput("");
    setBuscar("");
    setDesde(hoyLocal(-7));
    setHasta(hoyLocal());
    setPagina(1);
  };

  if (!tieneAcceso) {
    return (
      <PantallaC2 titulo="Historial de actividad" subtitulo="Quién hizo qué y cuándo dentro de la clínica.">
        <BloqueoPlan
          etiqueta="FUNCIÓN EXCLUSIVA PLAN EMPRESARIAL"
          titulo="Auditoría y trazabilidad"
          descripcion="Consulta quién entregó medicamentos, quién cambió el estado de una sala o quién modificó un equipo, con explicaciones claras para cualquier persona del equipo."
          planRequerido="Empresarial"
          modulo="Auditoría"
        />
      </PantallaC2>
    );
  }

  const conteoArea = (valor: string) => (valor === "" ? resumen?.total : resumen?.por_area?.[valor]);

  return (
    <PantallaC2 titulo="Historial de actividad" subtitulo="Quién hizo qué y cuándo dentro de la clínica: inventario, salas, citas y más.">
      {/* Resumen por área: tocar para filtrar */}
      <View style={s.areas}>
        {catalogo.areas.map((a) => {
          const activo = area === a.valor;
          const n = conteoArea(a.valor);
          return (
            <Pressable key={a.valor} onPress={() => { setPagina(1); setArea(a.valor); }} style={[s.area, activo && s.areaActiva]}>
              <Ionicons name={a.icono as IconName} size={20} color={activo ? "#FFFFFF" : C.primario} />
              <Text style={[s.areaTexto, activo && { color: "#FFFFFF" }]} numberOfLines={2}>{a.etiqueta}</Text>
              {n !== undefined && <Text style={[s.areaNum, activo && { color: "#FFFFFF" }]}>{n}</Text>}
            </Pressable>
          );
        })}
      </View>

      <Tarjeta>
        <Text style={s.filtroTitulo}>¿QUÉ TIPO DE ACCIÓN?</Text>
        <View style={s.chips}>
          {catalogo.acciones.map((a) => {
            const color = COLOR_TONO[a.tono ?? "neutral"];
            const activo = tipoAccion === a.valor;
            return (
              <Pressable key={a.valor} onPress={() => { setPagina(1); setTipoAccion(a.valor); }} style={[s.chip, { borderColor: color, backgroundColor: activo ? color : `${color}14` }]}>
                <Text style={[s.chipTexto, { color: activo ? "#FFFFFF" : color }]}>{a.etiqueta}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.filtroTitulo}>¿CUÁNDO?</Text>
        <RangoFechas desde={desde} hasta={hasta} onChange={(d, h) => { setPagina(1); setDesde(d); setHasta(h); }} />

        <View style={s.filaBuscar}>
          <Campo etiqueta="Buscar (persona, artículo, sala…)" value={buscarInput} onChangeText={setBuscarInput} placeholder="Ej. Paracetamol, Quirófano, Laura" />
          <Boton texto="Buscar" pequeno onPress={() => { setPagina(1); setBuscar(buscarInput.trim()); }} />
          <Boton texto="Quitar filtros" variante="secundario" pequeno onPress={limpiar} />
        </View>
      </Tarjeta>

      {!!error && <Aviso tipo="error" texto={error} />}

      {cargando ? (
        <Cargando mensaje="Consultando el registro de actividad del sistema…" />
      ) : registros.length === 0 ? (
        <Vacio texto="No hay actividad con estos filtros. Prueba ampliando las fechas." />
      ) : (
        registros.map((reg) => {
          const color = COLOR_TONO[reg.tono ?? "neutral"];
          const expandido = abierto === reg.id_PK;
          const verTecnico = tecnico === reg.id_PK;
          return (
            <Tarjeta key={reg.id_PK} style={{ borderLeftWidth: 5, borderLeftColor: color }}>
              <Pressable onPress={() => setAbierto(expandido ? null : reg.id_PK)}>
                <View style={s.cabecera}>
                  <CirculoIcono name={(reg.icono ?? "document-text-outline") as IconName} color={color} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.resumen}>{reg.resumen ?? reg.descripcion ?? "Movimiento registrado"}</Text>
                    <Text style={s.meta}>
                      <Text style={s.quien}>{reg.usuario_nombre ?? "El sistema"}</Text>
                      {reg.usuario_rol ? ` (${reg.usuario_rol})` : ""} · {cuando(reg.marca_tiempo)}
                    </Text>
                    <View style={s.etiquetas}>
                      {!!reg.area_texto && <View style={s.etiqueta}><Text style={s.etiquetaTexto}>{reg.area_texto}</Text></View>}
                      {!!reg.accion_texto && <View style={[s.etiqueta, { backgroundColor: `${color}1A` }]}><Text style={[s.etiquetaTexto, { color }]}>{reg.accion_texto}</Text></View>}
                    </View>
                  </View>
                  <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
                </View>
              </Pressable>

              {expandido && (
                <View style={{ marginTop: 10 }}>
                  <Text style={s.subtitulo}>{reg.modo_cambios === "cambio" ? "Qué cambió" : reg.modo_cambios === "baja" ? "Datos que se eliminaron" : "Datos registrados"}</Text>
                  <Cambios reg={reg} />
                  <Pressable onPress={() => setTecnico(verTecnico ? null : reg.id_PK)}>
                    <Text style={s.toggle}>{verTecnico ? "▲ Ocultar detalles técnicos" : "▼ Detalles técnicos (para soporte)"}</Text>
                  </Pressable>
                  {verTecnico && (
                    <Text style={s.tecnico}>
                      Registro n.º {reg.id_PK} · Código de acción: {reg.accion ?? "—"} · Tabla: {reg.nombre_tabla ?? "—"}
                      {reg.id_registro != null ? ` #${reg.id_registro}` : ""} · Dirección IP: {reg.direccion_ip ?? "—"}
                    </Text>
                  )}
                </View>
              )}
            </Tarjeta>
          );
        })
      )}

      <Paginador meta={meta} onCambiar={setPagina} />
    </PantallaC2>
  );
}

const crearEstilos = (C: Paleta) =>
  StyleSheet.create({
  areas: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  area: { flexGrow: 1, flexBasis: 130, flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.borde, backgroundColor: C.tarjeta },
  areaActiva: { backgroundColor: C.primario, borderColor: C.primario },
  areaTexto: { flex: 1, fontSize: 12, fontWeight: "800", color: C.texto },
  areaNum: { fontSize: 14, fontWeight: "900", color: C.primario },
  filtroTitulo: { fontSize: 11, fontWeight: "800", color: C.texto2, marginBottom: 6, letterSpacing: 0.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  chipTexto: { fontSize: 12, fontWeight: "800" },
  filaBuscar: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
  cabecera: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  resumen: { fontSize: 14, fontWeight: "700", color: C.texto, lineHeight: 20 },
  meta: { fontSize: 12, color: C.muted, marginTop: 4 },
  quien: { fontWeight: "800", color: C.texto2 },
  etiquetas: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  etiqueta: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: C.fondo },
  etiquetaTexto: { fontSize: 10.5, fontWeight: "800", color: C.texto2 },
  subtitulo: { fontSize: 12, fontWeight: "800", color: C.titulo, marginBottom: 6 },
  nota: { fontSize: 12, color: C.muted },
  tabla: { borderWidth: 1, borderColor: C.borde, borderRadius: 12, overflow: "hidden" },
  tablaFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEF4F2" },
  filaCambio: { backgroundColor: C.avisoSuave },
  celda: { flex: 1, fontSize: 12, color: C.texto, padding: 8 },
  celdaCampo: { fontWeight: "800", color: C.texto2, flex: 0.9 },
  cab: { fontWeight: "800", backgroundColor: C.primarioSuave, color: C.texto2 },
  antes: { color: "#B45309", textDecorationLine: "line-through" },
  ahora: { fontWeight: "800", color: C.primario },
  toggle: { fontSize: 11, color: C.primario, fontWeight: "800", marginTop: 10 },
  tecnico: { fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 16 },
});
