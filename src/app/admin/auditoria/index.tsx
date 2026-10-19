import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Etiqueta,
  Opciones,
  PantallaC2,
  Paginador,
  Tarjeta,
  Tono,
  C,
  Vacio,
  fechaHora,
  fechaValida,
  useAccesoC2,
} from "../../../components/c2/ui";
import {
  PageMeta,
  RegistroAuditoria,
  listarAuditoria,
  mensajeError,
} from "../../../services/c2Service";

const ACCIONES = ["", "CREATE", "UPDATE", "UPDATE_ESTADO", "DELETE"];
const TABLAS = ["", "salas", "equipamiento_sala"];

const TONO_ACCION: Record<string, Tono> = {
  CREATE: "ok",
  UPDATE: "info",
  UPDATE_ESTADO: "info",
  DELETE: "danger",
};

function valorTexto(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function DetalleCambios({ reg }: { reg: RegistroAuditoria }) {
  const antes = reg.valores_antiguos ?? {};
  const despues = reg.valores_nuevos ?? {};
  const campos = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]));

  if (campos.length === 0) {
    return <Text style={s.detalleVacio}>Este registro no guardó valores.</Text>;
  }

  return (
    <View style={s.diff}>
      <View style={s.diffFila}>
        <Text style={[s.diffCelda, s.diffCampo, s.diffCabecera]}>Campo</Text>
        <Text style={[s.diffCelda, s.diffCabecera]}>Antes</Text>
        <Text style={[s.diffCelda, s.diffCabecera]}>Después</Text>
      </View>
      {campos.map((campo) => {
        const a = antes[campo];
        const d = despues[campo];
        const cambio = valorTexto(a) !== valorTexto(d) && reg.accion !== "CREATE" && reg.accion !== "DELETE";
        return (
          <View key={campo} style={[s.diffFila, cambio && s.diffFilaCambio]}>
            <Text style={[s.diffCelda, s.diffCampo]}>{campo}</Text>
            <Text style={s.diffCelda}>{valorTexto(a)}</Text>
            <Text style={[s.diffCelda, cambio && s.diffNuevo]}>{valorTexto(d)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AuditoriaScreen() {
  const { token } = useAccesoC2();

  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);

  // Valores en edición vs. filtros aplicados
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [desdeInput, setDesdeInput] = useState("");
  const [hastaInput, setHastaInput] = useState("");
  const [errorFiltro, setErrorFiltro] = useState("");
  const [aplicados, setAplicados] = useState({ tabla: "", accion: "", usuario: "", desde: "", hasta: "" });
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setCargando(true);
      setError("");
      const r = await listarAuditoria(token, {
        nombre_tabla: aplicados.tabla,
        accion: aplicados.accion,
        usuario_id: aplicados.usuario,
        desde: aplicados.desde ? `${aplicados.desde}T00:00:00` : undefined,
        hasta: aplicados.hasta ? `${aplicados.hasta}T23:59:59` : undefined,
        page: pagina,
        page_size: 15,
      });
      setRegistros(r.data);
      setMeta(r.meta);
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la auditoría."));
    } finally {
      setCargando(false);
    }
  }, [token, aplicados, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aplicar = () => {
    if (usuarioInput.trim() && !/^\d+$/.test(usuarioInput.trim())) {
      setErrorFiltro("El usuario debe ser un número (ID).");
      return;
    }
    if (desdeInput.trim() && !fechaValida(desdeInput.trim())) {
      setErrorFiltro("«Desde» debe tener el formato AAAA-MM-DD.");
      return;
    }
    if (hastaInput.trim() && !fechaValida(hastaInput.trim())) {
      setErrorFiltro("«Hasta» debe tener el formato AAAA-MM-DD.");
      return;
    }
    if (desdeInput.trim() && hastaInput.trim() && desdeInput.trim() > hastaInput.trim()) {
      setErrorFiltro("«Desde» no puede ser posterior a «Hasta».");
      return;
    }
    setErrorFiltro("");
    setPagina(1);
    setAplicados({
      tabla,
      accion,
      usuario: usuarioInput.trim(),
      desde: desdeInput.trim(),
      hasta: hastaInput.trim(),
    });
  };

  const limpiar = () => {
    setTabla("");
    setAccion("");
    setUsuarioInput("");
    setDesdeInput("");
    setHastaInput("");
    setErrorFiltro("");
    setPagina(1);
    setAplicados({ tabla: "", accion: "", usuario: "", desde: "", hasta: "" });
  };

  return (
    <PantallaC2
      titulo="Auditoría"
      subtitulo="Historial de cambios realizados en el sistema: quién, cuándo y qué se modificó."
    >
      <Tarjeta>
        <Text style={s.etiquetaFiltro}>TABLA</Text>
        <Opciones
          valor={tabla}
          onChange={setTabla}
          opciones={TABLAS.map((t) => ({ valor: t, etiqueta: t === "" ? "Todas" : t }))}
        />
        <Text style={s.etiquetaFiltro}>ACCIÓN</Text>
        <Opciones
          valor={accion}
          onChange={setAccion}
          opciones={ACCIONES.map((a) => ({ valor: a, etiqueta: a === "" ? "Todas" : a }))}
        />
        <View style={s.fila}>
          <Campo
            etiqueta="ID de usuario"
            value={usuarioInput}
            onChangeText={(t) => setUsuarioInput(t.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
          />
          <Campo etiqueta="Desde" value={desdeInput} onChangeText={setDesdeInput} placeholder="AAAA-MM-DD" />
          <Campo etiqueta="Hasta" value={hastaInput} onChangeText={setHastaInput} placeholder="AAAA-MM-DD" />
        </View>
        {!!errorFiltro && <Aviso tipo="error" texto={errorFiltro} />}
        <View style={s.fila}>
          <Boton texto="Aplicar filtros" onPress={aplicar} pequeno />
          <Boton texto="Limpiar" variante="secundario" onPress={limpiar} pequeno />
        </View>
      </Tarjeta>

      {!!error && <Aviso tipo="error" texto={error} />}

      {cargando ? (
        <Cargando />
      ) : registros.length === 0 ? (
        <Vacio texto="No hay registros de auditoría con esos filtros." />
      ) : (
        registros.map((reg) => {
          const expandido = abierto === reg.id_PK;
          return (
            <Pressable key={reg.id_PK} onPress={() => setAbierto(expandido ? null : reg.id_PK)}>
              <Tarjeta>
                <View style={s.cabecera}>
                  <Etiqueta
                    texto={reg.accion ?? "—"}
                    tono={TONO_ACCION[reg.accion ?? ""] ?? "neutral"}
                  />
                  <Text style={s.tabla}>
                    {reg.nombre_tabla ?? "—"}
                    {reg.id_registro != null ? ` #${reg.id_registro}` : ""}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.fecha}>{fechaHora(reg.marca_tiempo)}</Text>
                </View>
                {!!reg.descripcion && <Text style={s.descripcion}>{reg.descripcion}</Text>}
                <Text style={s.meta}>
                  Usuario: {reg.usuario_id_FK != null ? `#${reg.usuario_id_FK}` : "—"} · IP: {reg.direccion_ip ?? "—"}
                </Text>
                <Text style={s.toggle}>{expandido ? "▲ Ocultar cambios" : "▼ Ver cambios"}</Text>
                {expandido && <DetalleCambios reg={reg} />}
              </Tarjeta>
            </Pressable>
          );
        })
      )}

      <Paginador meta={meta} onCambiar={setPagina} />
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  etiquetaFiltro: { fontSize: 11, fontWeight: "800", color: C.texto2, marginBottom: 6, letterSpacing: 0.5 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  tabla: { fontSize: 13, fontWeight: "800", color: C.texto },
  fecha: { fontSize: 11, color: C.muted, fontWeight: "600" },
  descripcion: { fontSize: 13, color: C.texto, marginTop: 8 },
  meta: { fontSize: 11, color: C.muted, marginTop: 4 },
  toggle: { fontSize: 11, color: C.primario, fontWeight: "800", marginTop: 8 },
  detalleVacio: { fontSize: 12, color: C.muted, marginTop: 8 },
  diff: { marginTop: 10, borderWidth: 1, borderColor: C.borde, borderRadius: 12, overflow: "hidden" },
  diffFila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEF4F2" },
  diffFilaCambio: { backgroundColor: "#FFFBEF" },
  diffCelda: { flex: 1, fontSize: 11, color: C.texto, padding: 8 },
  diffCampo: { fontWeight: "800", color: C.texto2, flex: 0.9 },
  diffCabecera: { fontWeight: "800", backgroundColor: "#F1F8F6", color: C.texto2 },
  diffNuevo: { fontWeight: "800", color: C.primario },
});
