import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  C,
  Tarjeta,
  Vacio,
  useAccesoC2,
  PantallaC2,
} from "../../../components/c2/ui";
import api from "../../../services/api";
import {
  AsignacionSala,
  DIAS_SEMANA,
  Sala,
  asignarSalas,
  hhmm,
  listarSalas,
  mensajeError,
  salasDeDoctor,
} from "../../../services/c2Service";

type DoctorItem = { id_PK: number; nombre: string };

type Fila = {
  sala_id_FK: number | null;
  dia_semana: number | null;
  hora_inicio: string;
  hora_fin: string;
};

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, activo && s.chipActivo]}>
      <Text style={[s.chipTexto, activo && s.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

export default function AsignarSalasScreen() {
  const { token } = useAccesoC2();

  const [doctores, setDoctores] = useState<DoctorItem[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargarBase = useCallback(async () => {
    if (!token) return;
    try {
      setCargando(true);
      const [d, p] = await Promise.all([
        api.get("/api/doctores/", { headers: { Authorization: `Bearer ${token}` } }),
        listarSalas(token, { page_size: 100 } as any),
      ]);
      setDoctores(d.data);
      setSalas(p.data);
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar doctores y salas."));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  const elegirDoctor = async (id: number) => {
    if (!token) return;
    setDoctorId(id);
    setError("");
    setOk("");
    try {
      const a: AsignacionSala[] = await salasDeDoctor(token, id);
      setFilas(
        a.map((x) => ({
          sala_id_FK: x.sala_id_FK,
          dia_semana: x.dia_semana,
          hora_inicio: hhmm(x.hora_inicio),
          hora_fin: hhmm(x.hora_fin),
        }))
      );
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las asignaciones."));
    }
  };

  const cambiar = (i: number, parcial: Partial<Fila>) =>
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, ...parcial } : x)));

  const guardar = async () => {
    if (!token || doctorId == null) return;
    setOk("");
    for (const [i, f] of filas.entries()) {
      if (f.sala_id_FK == null) return setError(`Fila ${i + 1}: selecciona una sala.`);
      if (!HORA_RE.test(f.hora_inicio) || !HORA_RE.test(f.hora_fin))
        return setError(`Fila ${i + 1}: usa el formato HH:MM (24 h) en las horas.`);
      if (f.hora_fin <= f.hora_inicio) return setError(`Fila ${i + 1}: la hora de fin debe ser posterior al inicio.`);
    }
    try {
      setGuardando(true);
      setError("");
      await asignarSalas(
        token,
        doctorId,
        filas.map((f) => ({
          sala_id_FK: f.sala_id_FK as number,
          dia_semana: f.dia_semana,
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
        }))
      );
      setOk("Salas y horarios guardados correctamente.");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar las asignaciones."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PantallaC2 titulo="Salas por doctor" subtitulo="Asigna a cada médico las salas que usará y su horario de uso.">
      {cargando ? (
        <Cargando />
      ) : (
        <>
          <Text style={s.label}>1. Elige al doctor</Text>
          {doctores.length === 0 ? (
            <Vacio texto="No hay doctores activos." />
          ) : (
            <View style={s.chips}>
              {doctores.map((d) => (
                <Chip key={d.id_PK} texto={d.nombre} activo={doctorId === d.id_PK} onPress={() => elegirDoctor(d.id_PK)} />
              ))}
            </View>
          )}

          {doctorId != null && (
            <>
              <Text style={[s.label, { marginTop: 18 }]}>2. Salas y horarios</Text>
              {filas.length === 0 && <Vacio texto="Este doctor no tiene salas asignadas." />}
              {filas.map((f, i) => (
                <Tarjeta key={i} style={{ marginBottom: 12 }}>
                  <Text style={s.sub}>Sala</Text>
                  <View style={s.chips}>
                    {salas.map((sa) => (
                      <Chip
                        key={sa.id_PK}
                        texto={sa.nombre}
                        activo={f.sala_id_FK === sa.id_PK}
                        onPress={() => cambiar(i, { sala_id_FK: sa.id_PK })}
                      />
                    ))}
                  </View>
                  <Text style={s.sub}>Día</Text>
                  <View style={s.chips}>
                    <Chip texto="Todos" activo={f.dia_semana == null} onPress={() => cambiar(i, { dia_semana: null })} />
                    {DIAS_SEMANA.map((dn, k) => (
                      <Chip key={k} texto={dn.slice(0, 3)} activo={f.dia_semana === k} onPress={() => cambiar(i, { dia_semana: k })} />
                    ))}
                  </View>
                  <View style={s.horas}>
                    <View style={{ flex: 1 }}>
                      <Campo etiqueta="Hora inicio" value={f.hora_inicio} onChangeText={(t) => cambiar(i, { hora_inicio: t })} placeholder="08:00" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Campo etiqueta="Hora fin" value={f.hora_fin} onChangeText={(t) => cambiar(i, { hora_fin: t })} placeholder="14:00" />
                    </View>
                  </View>
                  <Boton texto="Quitar" variante="peligro" pequeno onPress={() => setFilas((x) => x.filter((_, j) => j !== i))} />
                </Tarjeta>
              ))}

              <View style={s.chips}>
                <Boton
                  texto="+ Agregar sala"
                  variante="secundario"
                  onPress={() =>
                    setFilas((x) => [...x, { sala_id_FK: null, dia_semana: null, hora_inicio: "08:00", hora_fin: "14:00" }])
                  }
                />
                <Boton texto="Guardar asignaciones" onPress={guardar} cargando={guardando} />
              </View>
            </>
          )}

          {!!error && <Aviso tipo="error" texto={error} />}
          {!!ok && <Aviso tipo="ok" texto={ok} />}
        </>
      )}
    </PantallaC2>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "800", color: C.texto, marginBottom: 8 },
  sub: { fontSize: 12, fontWeight: "700", color: C.muted, marginTop: 6, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.primario, backgroundColor: "#FFFFFF" },
  chipActivo: { backgroundColor: C.primario },
  chipTexto: { fontSize: 12, fontWeight: "700", color: C.primario },
  chipTextoActivo: { color: "#FFFFFF" },
  horas: { flexDirection: "row", gap: 10 },
});
