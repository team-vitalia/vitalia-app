import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Aviso, Boton, C, Cargando, ConfirmarModal, Etiqueta, Opciones, PantallaC2, soloFecha, Tarjeta, Vacio,
} from "../../components/c2/ui";
import { Caducidad, getCaducidades, registrarMovimientoLote, TipoArticulo } from "../../services/almacenService";
import { mensajeError } from "../../services/c2Service";

export default function Caducidades() {
  const [dias, setDias] = useState<"30" | "60" | "90">("60");
  const [tipo, setTipo] = useState<"todos" | TipoArticulo>("todos");
  const [lotes, setLotes] = useState<Caducidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [baja, setBaja] = useState<Caducidad | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setLotes(await getCaducidades(Number(dias), tipo === "todos" ? undefined : tipo));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las caducidades."));
    } finally {
      setCargando(false);
    }
  }, [dias, tipo]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const darDeBaja = async () => {
    if (!baja) return;
    setEnviando(true);
    try {
      await registrarMovimientoLote(baja.inventario_id, "merma", baja.stock_actual, "Baja por caducidad");
      setExito(`Lote ${baja.numero_lote ?? baja.inventario_id} dado de baja (${baja.stock_actual} u.).`);
      setBaja(null);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo dar de baja el lote."));
      setBaja(null);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaC2 titulo="Caducidades" subtitulo="Lotes vencidos y próximos a vencer" roles={[1, 5, 6]}>
      <Opciones
        valor={dias}
        onChange={setDias}
        opciones={[
          { valor: "30", etiqueta: "30 días" },
          { valor: "60", etiqueta: "60 días" },
          { valor: "90", etiqueta: "90 días" },
        ]}
      />
      <Opciones
        valor={tipo}
        onChange={setTipo}
        opciones={[
          { valor: "todos", etiqueta: "Todo" },
          { valor: "medicamento", etiqueta: "Medicamentos" },
          { valor: "insumo", etiqueta: "Insumos" },
          { valor: "equipo", etiqueta: "Equipo" },
        ]}
      />
      {!!error && <Aviso tipo="error" texto={error} />}
      {!!exito && <Aviso tipo="ok" texto={exito} />}

      {cargando && lotes.length === 0 ? (
        <Cargando />
      ) : lotes.length === 0 ? (
        <Vacio texto="No hay lotes vencidos ni por vencer en este periodo." />
      ) : (
        lotes.map((l) => (
          <Tarjeta key={l.inventario_id} style={{ gap: 6 }}>
            <View style={s.cabecera}>
              <Text style={s.titulo}>{l.medicamento ?? "Medicamento"}</Text>
              <Etiqueta
                texto={l.estado === "vencido" ? `Vencido hace ${Math.abs(l.dias_restantes)} d` : `Vence en ${l.dias_restantes} d`}
                tono={l.estado === "vencido" ? "danger" : "warn"}
              />
            </View>
            <Text style={s.sub}>
              {l.tipo_articulo === "insumo" ? "Insumo" : l.tipo_articulo === "equipo" ? "Equipo" : "Medicamento"} · Lote {l.numero_lote ?? "s/n"} · {l.stock_actual} {l.unidad_medida ?? "u."} · {l.ubicacion ?? "sin ubicación"} · vence {soloFecha(l.fecha_vencimiento)}
            </Text>
            {l.estado === "vencido" && <Boton pequeno variante="peligro" texto="Dar de baja (merma)" onPress={() => setBaja(l)} />}
          </Tarjeta>
        ))
      )}

      <ConfirmarModal
        visible={!!baja}
        titulo="Dar de baja el lote"
        mensaje={`Se retirarán ${baja?.stock_actual ?? 0} unidades de ${baja?.medicamento ?? ""} (lote ${baja?.numero_lote ?? "s/n"}) como merma. Esta acción queda registrada.`}
        textoConfirmar="Dar de baja"
        cargando={enviando}
        onConfirmar={darDeBaja}
        onCancelar={() => setBaja(null)}
      />
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo, flex: 1 },
  sub: { fontSize: 12.5, color: C.texto2 },
});
