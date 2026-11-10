import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Aviso, Boton, C, Campo, Etiqueta, Opciones, PantallaC2, Tarjeta } from "../../components/c2/ui";
import { getMedicamentos, Medicamento, registrarConsumo } from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

const AREAS = ["Consultorio", "Curaciones", "Urgencias", "Esterilización", "Otra"];

/** Registro de uso interno de insumos (guantes, jeringas, alcohol...). Alimenta las gráficas y la predicción. */
export default function ConsumoInterno() {
  const [articulos, setArticulos] = useState<Medicamento[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<Medicamento | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => setArticulos(await getMedicamentos()), []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const coincidencias = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (t.length < 2) return [];
    return articulos.filter((a) => a.nombre.toLowerCase().includes(t)).slice(0, 8);
  }, [busqueda, articulos]);

  const registrar = async () => {
    setError("");
    setExito("");
    const n = Number(cantidad);
    if (!sel) return setError("Selecciona el artículo.");
    if (!Number.isInteger(n) || n <= 0) return setError("Escribe una cantidad entera mayor a 0.");
    setEnviando(true);
    try {
      const r = await registrarConsumo({ medicamentoId: sel.id_PK, cantidad: n, area, motivo: motivo.trim() });
      const lotes = r.lotes.map((l) => `${l.numero_lote ?? "s/n"} (${l.cantidad})`).join(", ");
      setExito(`Consumo registrado: ${r.cantidad} de ${r.medicamento}. Lotes usados: ${lotes}. Quedan ${r.stock_restante}.`);
      setSel(null); setCantidad(""); setMotivo(""); setBusqueda("");
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo registrar el consumo."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Registrar consumo" subtitulo="Salida de insumos y material para uso en la clínica" roles={[1, 6]}>
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}
      <Tarjeta style={{ gap: 8 }}>
        {sel ? (
          <View style={s.fila}>
            <View style={{ flex: 1 }}>
              <Text style={s.item}>{sel.nombre}</Text>
              <Text style={s.sub}>Existencia vigente: {sel.stock_actual ?? 0} {sel.unidad_medida ?? "u."}</Text>
            </View>
            <Boton pequeno variante="secundario" texto="Cambiar" onPress={() => setSel(null)} />
          </View>
        ) : (
          <>
            <Campo etiqueta="Buscar artículo" value={busqueda} onChangeText={setBusqueda} placeholder="Ej. guantes, jeringa, alcohol" />
            {coincidencias.map((a) => (
              <Pressable key={a.id_PK} onPress={() => setSel(a)} style={s.opcion}>
                <View style={s.fila}>
                  <Text style={[s.item, { flex: 1 }]}>{a.nombre}</Text>
                  <Etiqueta texto={a.tipo_articulo ?? "medicamento"} tono={a.tipo_articulo === "insumo" ? "info" : "neutral"} />
                </View>
                <Text style={s.sub}>Existencia: {a.stock_actual ?? 0} {a.unidad_medida ?? "u."}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Campo etiqueta="Cantidad" value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />
        <Text style={s.etiqueta}>Área</Text>
        <Opciones valor={area} onChange={setArea} opciones={AREAS.map((a) => ({ valor: a, etiqueta: a }))} />
        <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} />
        <Boton texto="Registrar consumo" onPress={registrar} cargando={enviando} />
      </Tarjeta>
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: 8 },
  item: { fontSize: 14, fontWeight: "700", color: C.texto },
  sub: { fontSize: 12.5, color: C.texto2 },
  etiqueta: { fontSize: 12.5, fontWeight: "700", color: C.texto },
  opcion: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo },
});
