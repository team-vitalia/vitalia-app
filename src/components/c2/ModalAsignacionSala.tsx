import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SelectorHora from "../SelectorHora";
import { Aviso, Boton, ModalBase } from "./ui";
import { ChipColor, CirculoIcono, estiloTipoSala, useEstilosC2, type Paleta } from "./extra";
import { DIAS_LARGO, aHHMM, cruzaMedianoche, deHHMM, diaSiguiente } from "./calendarioTipos";
import {
  NuevaAsignacion,
  ValidacionAsignacion,
  crearAsignacion,
  mensajeError,
  moverAsignacion,
  quitarAsignacion,
  validarAsignacion,
} from "../../services/c2Service";

const TURNOS: { texto: string; ini: string; fin: string; color: string; icono: "sunny-outline" | "partly-sunny-outline" | "moon-outline" }[] = [
  { texto: "Matutino 07:00–15:00", ini: "07:00", fin: "15:00", color: "#D97706", icono: "sunny-outline" },
  { texto: "Vespertino 15:00–23:00", ini: "15:00", fin: "23:00", color: "#2563EB", icono: "partly-sunny-outline" },
  { texto: "Nocturno 23:00–07:00", ini: "23:00", fin: "07:00", color: "#7C3AED", icono: "moon-outline" },
];

export type DatosAsignacion = {
  /** undefined = asignación nueva */
  asignacionId?: number;
  doctor: { id: number; nombre: string; especialidad?: string | null };
  sala: { id: number; nombre: string; tipo?: string | null; piso?: string | null; estado?: string | null };
  dia: number | null;
  ini: number; // minutos
  fin: number; // si es <= ini el turno termina al día siguiente
  /** true cuando el bloque se acaba de arrastrar a otra posición */
  movido?: boolean;
};

type Props = {
  token: string | null;
  datos: DatosAsignacion | null;
  onCerrar: () => void;
  onListo: (mensaje: string) => void;
};

export default function ModalAsignacionSala({ token, datos, onCerrar, onListo }: Props) {
  const { C, s } = useEstilosC2(crearEstilos);
  const esNueva = datos?.asignacionId === undefined;

  const [dia, setDia] = useState<number | null>(0);
  const [ini, setIni] = useState("08:00");
  const [fin, setFin] = useState("09:00");
  const [notificar, setNotificar] = useState(true);
  const [validacion, setValidacion] = useState<ValidacionAsignacion | null>(null);
  const [validando, setValidando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [error, setError] = useState("");

  // Al abrir con otros datos se reinicia el formulario
  useEffect(() => {
    if (!datos) return;
    setDia(datos.dia);
    setIni(aHHMM(datos.ini % 1440));
    setFin(aHHMM(datos.fin % 1440));
    setNotificar(true);
    setValidacion(null);
    setConfirmarQuitar(false);
    setError("");
  }, [datos]);

  // fin < inicio es válido: el turno cruza la medianoche (p. ej. 23:00 → 04:00 del día siguiente)
  const formatoOk = /^\d{2}:\d{2}$/.test(ini) && /^\d{2}:\d{2}$/.test(fin);
  const horasOk = formatoOk && deHHMM(fin) !== deHHMM(ini);
  const cruza = formatoOk && horasOk && cruzaMedianoche(ini, fin);

  const cuerpo = (): NuevaAsignacion | null =>
    datos && horasOk
      ? { doctor_id: datos.doctor.id, sala_id: datos.sala.id, dia_semana: dia, hora_inicio: ini, hora_fin: fin, notificar }
      : null;

  // Revisa en vivo (sin guardar) si el doctor y la sala están libres en ese horario
  useEffect(() => {
    const body = cuerpo();
    if (!datos || !token || !body) {
      setValidacion(null);
      return;
    }
    let vigente = true;
    setValidando(true);
    const t = setTimeout(async () => {
      try {
        const r = await validarAsignacion(token, body, datos.asignacionId);
        if (vigente) setValidacion(r);
      } catch (e) {
        if (vigente) setValidacion({ valido: false, conflictos: [{ tipo: "error", mensaje: mensajeError(e, "No se pudo comprobar la disponibilidad.") }] });
      } finally {
        if (vigente) setValidando(false);
      }
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, dia, ini, fin, token]);

  if (!datos) return null;
  const est = estiloTipoSala(datos.sala.tipo);
  const puedeConfirmar = horasOk && !!validacion?.valido && !validando && !guardando;

  const confirmar = async () => {
    const body = cuerpo();
    if (!token || !body) return;
    try {
      setGuardando(true);
      setError("");
      const r = esNueva ? await crearAsignacion(token, body) : await moverAsignacion(token, datos.asignacionId as number, body);
      const aviso = !notificar
        ? "No se envió aviso al doctor."
        : r.doctor_notificado
          ? `Se avisó a ${datos.doctor.nombre}.`
          : "No se pudo enviar el aviso al doctor; verás el cambio en su agenda.";
      onListo(`${esNueva ? "Sala asignada" : "Asignación actualizada"}: ${datos.sala.nombre} · ${dia == null ? "todos los días" : DIAS_LARGO[dia]} ${ini}–${fin}${cruza ? " (termina al día siguiente)" : ""}. ${aviso}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la asignación."));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!token || datos.asignacionId === undefined) return;
    try {
      setGuardando(true);
      setError("");
      const r = await quitarAsignacion(token, datos.asignacionId, notificar);
      onListo(`Se quitó la sala ${datos.sala.nombre} a ${datos.doctor.nombre}. ${notificar ? (r.doctor_notificado ? "El doctor fue avisado." : "No se pudo avisar al doctor.") : "No se envió aviso."}`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo quitar la asignación."));
    } finally {
      setGuardando(false);
    }
  };

  const titulo = esNueva ? "Confirmar asignación de sala" : datos.movido ? "Confirmar cambio de horario" : "Asignación de sala";

  return (
    <ModalBase visible={!!datos} titulo={titulo} onClose={onCerrar}>
      <Text style={s.ayuda}>
        {esNueva
          ? "Revisa los datos. Al confirmar, la sala quedará reservada para el doctor en ese horario."
          : "Puedes cambiar el día o el horario, o quitar la asignación."}
      </Text>

      <View style={s.tarjetas}>
        <View style={[s.tarjeta, { borderColor: "#2563EB55" }]}>
          <CirculoIcono name="person-outline" color="#2563EB" size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.etiqueta}>DOCTOR</Text>
            <Text style={s.nombre}>{datos.doctor.nombre}</Text>
            {!!datos.doctor.especialidad && <Text style={s.sub}>{datos.doctor.especialidad}</Text>}
          </View>
        </View>
        <Ionicons name="arrow-forward" size={20} color={C.muted} />
        <View style={[s.tarjeta, { borderColor: `${est.color}55` }]}>
          <CirculoIcono name={est.icono} color={est.color} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.etiqueta}>SALA</Text>
            <Text style={s.nombre}>{datos.sala.nombre}</Text>
            <Text style={s.sub}>{[datos.sala.tipo, datos.sala.piso ? `Piso ${datos.sala.piso}` : null].filter(Boolean).join(" · ") || "—"}</Text>
          </View>
        </View>
      </View>

      <Text style={s.etiqueta}>DÍA</Text>
      <View style={s.chips}>
        {DIAS_LARGO.map((d, i) => (
          <ChipColor key={d} texto={d} color="#247F76" activo={dia === i} onPress={() => setDia(i)} />
        ))}
        <ChipColor texto="Todos los días" color="#7C3AED" activo={dia === null} onPress={() => setDia(null)} />
      </View>

      <View style={s.horas}>
        <View style={{ flex: 1, minWidth: 130 }}>
          <Text style={s.etiqueta}>HORA DE INICIO</Text>
          <SelectorHora value={ini} onChange={setIni} />
        </View>
        <View style={{ flex: 1, minWidth: 130 }}>
          <Text style={s.etiqueta}>HORA DE FIN</Text>
          <SelectorHora value={fin} onChange={setFin} />
        </View>
      </View>

      <Text style={s.etiqueta}>ATAJOS DE TURNO</Text>
      <View style={s.chips}>
        {TURNOS.map((t) => (
          <ChipColor
            key={t.texto}
            texto={t.texto}
            color={t.color}
            icono={t.icono}
            activo={ini === t.ini && fin === t.fin}
            onPress={() => {
              setIni(t.ini);
              setFin(t.fin);
            }}
          />
        ))}
      </View>

      {formatoOk && !horasOk && <Aviso tipo="error" texto="La hora de fin no puede ser igual a la de inicio." />}
      {cruza && (
        <Aviso
          tipo="info"
          texto={
            dia === null
              ? `Turno nocturno: cada noche empieza a las ${ini} y termina a las ${fin} del día siguiente.`
              : `Turno nocturno: empieza el ${DIAS_LARGO[dia].toLowerCase()} a las ${ini} y termina el ${DIAS_LARGO[diaSiguiente(dia) as number].toLowerCase()} a las ${fin}. Esa madrugada también queda ocupada.`
          }
        />
      )}

      {/* Disponibilidad en vivo */}
      {horasOk && (
        <View style={{ marginBottom: 10 }}>
          {validando || !validacion ? (
            <Text style={s.sub}>Comprobando disponibilidad…</Text>
          ) : validacion.valido ? (
            <Aviso tipo="ok" texto="Doctor y sala están libres en ese horario." />
          ) : (
            validacion.conflictos.map((c, i) => <Aviso key={i} tipo="error" texto={c.mensaje} />)
          )}
        </View>
      )}

      <Pressable onPress={() => setNotificar(!notificar)} style={s.aviso} accessibilityRole="checkbox" accessibilityState={{ checked: notificar }}>
        <View style={[s.caja, notificar && { backgroundColor: C.primario, borderColor: C.primario }]}>
          {notificar && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.nombre}>Avisar al doctor</Text>
          <Text style={s.sub}>Le llegará una notificación en la app con la sala y el horario.</Text>
        </View>
      </Pressable>

      {!!error && <Aviso tipo="error" texto={error} />}

      {confirmarQuitar ? (
        <View style={s.filaBotones}>
          <Text style={[s.nombre, { flex: 1 }]}>¿Seguro que quieres quitar esta asignación?</Text>
          <Boton texto="No" variante="secundario" pequeno onPress={() => setConfirmarQuitar(false)} />
          <Boton texto="Sí, quitar" variante="peligro" pequeno cargando={guardando} onPress={quitar} />
        </View>
      ) : (
        <View style={s.filaBotones}>
          <Boton texto="Cancelar" variante="secundario" onPress={onCerrar} deshabilitado={guardando} />
          {!esNueva && <Boton texto="Quitar" variante="peligro" onPress={() => setConfirmarQuitar(true)} deshabilitado={guardando} />}
          <Boton texto={esNueva ? "Confirmar y avisar" : "Guardar cambios"} onPress={confirmar} cargando={guardando} deshabilitado={!puedeConfirmar} />
        </View>
      )}
    </ModalBase>
  );
}

const crearEstilos = (C: Paleta) =>
  StyleSheet.create({
    ayuda: { fontSize: 12.5, color: C.texto2, marginBottom: 12 },
    tarjetas: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 14 },
    tarjeta: { flex: 1, minWidth: 200, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5, backgroundColor: C.tarjeta },
    etiqueta: { fontSize: 10.5, fontWeight: "800", color: C.texto2, letterSpacing: 0.5, marginBottom: 4 },
    nombre: { fontSize: 14, fontWeight: "800", color: C.texto },
    sub: { fontSize: 11.5, color: C.muted },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    horas: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
    aviso: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, marginBottom: 12 },
    caja: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: "center", justifyContent: "center" },
    filaBotones: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  });
