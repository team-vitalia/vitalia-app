import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Aviso, Boton, C, Campo, Cargando, Etiqueta, fechaHora, Opciones, PantallaC2, Tarjeta, Vacio,
} from "../../components/c2/ui";
import {
  getInventario, getMedicamentos, getMovimientos, MovimientoInventario,
  registrarMovimientoLote, TipoMovimiento,
} from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

type Lote = { id_PK: number; medicamento_id_FK: number; numero_lote?: string | null; stock_actual: number };

export default function Movimientos() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [nombres, setNombres] = useState<Record<number, string>>({});
  const [historial, setHistorial] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [lote, setLote] = useState<Lote | null>(null);
  const [tipo, setTipo] = useState<TipoMovimiento>("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [inv, meds, movs] = await Promise.all([getInventario(), getMedicamentos(), getMovimientos(50)]);
      setLotes(inv);
      setNombres(Object.fromEntries(meds.map((m) => [m.id_PK, m.nombre])));
      setHistorial(movs);
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el inventario."));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const coincidencias = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (t.length < 2) return [];
    return lotes
      .filter((l) => (nombres[l.medicamento_id_FK] ?? "").toLowerCase().includes(t) || (l.numero_lote ?? "").toLowerCase().includes(t))
      .slice(0, 8);
  }, [busqueda, lotes, nombres]);

  const registrar = async () => {
    setError("");
    setExito("");
    const n = Number(cantidad);
    if (!lote) return setError("Selecciona un lote.");
    if (!Number.isInteger(n) || n < 0 || (tipo !== "ajuste" && n === 0)) return setError("Escribe una cantidad entera válida.");
    setEnviando(true);
    try {
      const r = await registrarMovimientoLote(lote.id_PK, tipo, n, motivo);
      setExito(`Movimiento registrado. Stock actual del lote: ${r.stock_actual}.`);
      setLote(null);
      setCantidad("");
      setMotivo("");
      setBusqueda("");
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar el movimiento."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Movimientos de inventario" subtitulo="Entradas, salidas, mermas y ajustes por lote" roles={[1, 5, 6]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}

      <Tarjeta style={{ gap: 8 }}>
        <Text style={s.titulo}>Registrar movimiento</Text>
        {lote ? (
          <View style={s.seleccion}>
            <Text style={s.item}>
              {nombres[lote.medicamento_id_FK] ?? "Medicamento"} · lote {lote.numero_lote ?? "s/n"} · stock {lote.stock_actual}
            </Text>
            <Boton pequeno variante="secundario" texto="Cambiar" onPress={() => setLote(null)} />
          </View>
        ) : (
          <>
            <Campo etiqueta="Buscar medicamento o lote" value={busqueda} onChangeText={setBusqueda} placeholder="Mínimo 2 letras" />
            {coincidencias.map((l) => (
              <Pressable key={l.id_PK} onPress={() => setLote(l)} style={s.opcionLote}>
                <Text style={s.item}>{nombres[l.medicamento_id_FK] ?? `Medicamento ${l.medicamento_id_FK}`}</Text>
                <Text style={s.sub}>Lote {l.numero_lote ?? "s/n"} · stock {l.stock_actual}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Opciones
          valor={tipo}
          onChange={setTipo}
          opciones={[
            { valor: "entrada", etiqueta: "Entrada" },
            { valor: "salida", etiqueta: "Salida" },
            { valor: "merma", etiqueta: "Merma" },
            { valor: "ajuste", etiqueta: "Ajuste" },
          ]}
        />
        <Campo
          etiqueta={tipo === "ajuste" ? "Stock real contado" : "Cantidad"}
          value={cantidad}
          onChangeText={setCantidad}
          keyboardType="numeric"
          ayuda={tipo === "ajuste" ? "El ajuste fija el stock exacto del lote (conteo físico)." : undefined}
        />
        <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} />
        <Boton texto="Registrar" onPress={registrar} cargando={enviando} />
      </Tarjeta>

      <Text style={[s.titulo, { marginTop: 8 }]}>Últimos movimientos</Text>
      {cargando && historial.length === 0 ? (
        <Cargando />
      ) : historial.length === 0 ? (
        <Vacio texto="Aún no hay movimientos registrados." />
      ) : (
        historial.map((m) => (
          <Tarjeta key={m.id_PK} style={{ gap: 4 }}>
            <View style={s.cabecera}>
              <Text style={s.item}>{m.medicamento ?? "Medicamento"}</Text>
              <Etiqueta texto={m.tipo ?? "—"} tono={(m.cantidad ?? 0) < 0 ? "warn" : "ok"} />
            </View>
            <Text style={s.sub}>
              Lote {m.numero_lote ?? "s/n"} · {(m.cantidad ?? 0) > 0 ? "+" : ""}{m.cantidad} ({m.stock_anterior} → {m.stock_nuevo}) · {fechaHora(m.creado_en)}
              {m.id_referencia ? ` · receta #${m.id_referencia}` : ""}
            </Text>
          </Tarjeta>
        ))
      )}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  item: { fontSize: 14, fontWeight: "700", color: C.texto, flexShrink: 1 },
  sub: { fontSize: 12.5, color: C.texto2 },
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  seleccion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  opcionLote: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo },
});
