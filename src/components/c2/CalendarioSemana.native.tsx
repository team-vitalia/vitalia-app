import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useC2Colors } from "./ui";
import {
  CalendarioSemanaProps,
  ChipArrastrableProps,
  DIAS_CORTO,
  DIAS_LARGO,
  PASO_MIN,
  PX_MIN,
  aHHMM,
  ajustar,
  hoyIndiceSemana,
} from "./calendarioTipos";

/** En el celular no se arrastra: se toca el doctor/sala y luego el horario donde colocarlo. */
export function ChipArrastrable({ item, color, subtitulo, activo, deshabilitado, onPress }: ChipArrastrableProps) {
  const C = useC2Colors();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: activo ? color : `${color}66`,
        backgroundColor: activo ? `${color}33` : C.tarjeta,
        opacity: deshabilitado ? 0.45 : 1,
      }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <View>
        <Text style={{ fontSize: 13, fontWeight: "800", color: C.texto }}>{item.etiqueta}</Text>
        {!!subtitulo && <Text style={{ fontSize: 11, color: C.muted }}>{subtitulo}</Text>}
      </View>
    </Pressable>
  );
}

export function CalendarioSemana({ bloques, dias = [0, 1, 2, 3, 4, 5, 6], etiquetaDia, pxMin, horaIni, horaFin, duracionNueva, colocando, onColocar, onBloque }: CalendarioSemanaProps) {
  const C = useC2Colors();
  const PX = pxMin ?? PX_MIN;
  const unSoloDia = dias.length === 1;
  const { width } = useWindowDimensions();
  const anchoCol = unSoloDia ? Math.max(220, width - 44 - 48) : 110;
  const hoy = hoyIndiceSemana();
  const minIni = horaIni * 60;
  const minFin = horaFin * 60;
  const alto = (minFin - minIni) * PX;
  const horas = Array.from({ length: horaFin - horaIni }, (_, i) => horaIni + i);

  return (
    <ScrollView horizontal style={[s.caja, { borderColor: C.borde, backgroundColor: C.tarjeta }]}>
      <View>
        <View style={[s.fila, { backgroundColor: C.fondo, borderBottomColor: C.borde, borderBottomWidth: 1 }]}>
          <View style={{ width: 44 }} />
          {dias.map((i) => (
            <Text key={i} style={[s.dia, { width: anchoCol, color: i === hoy ? C.primario : C.texto, borderLeftColor: C.borde }]}>
              {unSoloDia ? DIAS_LARGO[i] : DIAS_CORTO[i]}
              {i === hoy ? " · hoy" : ""}
              {!!etiquetaDia && <Text style={{ fontSize: 11, fontWeight: "600", color: C.muted }}>{`\n${etiquetaDia(i)}`}</Text>}
            </Text>
          ))}
        </View>
        <View style={s.fila}>
          <View style={{ width: 44, height: alto }}>
            {horas.map((h, i) => (
              <Text key={h} style={[s.hora, { top: i * 60 * PX - 7, color: C.muted }]}>
                {String(h).padStart(2, "0")}:00
              </Text>
            ))}
          </View>
          {dias.map((dia) => (
            <Pressable
              key={dia}
              disabled={!colocando}
              onPress={(e) => {
                const crudo = minIni + e.nativeEvent.locationY / PX;
                const snap = Math.round(crudo / PASO_MIN) * PASO_MIN;
                onColocar(dia, ajustar(snap, minIni, Math.max(minIni, minFin - duracionNueva)));
              }}
              style={[s.columna, { width: anchoCol, height: alto, borderLeftColor: C.borde, backgroundColor: dia === hoy ? C.primarioSuave : "transparent" }]}
            >
              {horas.map((h, i) => (
                <View key={h} style={{ position: "absolute", left: 0, right: 0, top: i * 60 * PX, borderTopWidth: 1, borderTopColor: C.borde }} />
              ))}
              {bloques
                .filter((b) => b.dia === dia || b.dia === null)
                .map((b, idx) => (
                  <Pressable
                    key={`${b.id}-${dia}-${idx}`}
                    onPress={() => onBloque(b.id)}
                    style={{
                      position: "absolute",
                      left: 3,
                      right: 3,
                      top: (Math.max(b.ini, minIni) - minIni) * PX,
                      height: Math.max((Math.min(b.fin, minFin) - Math.max(b.ini, minIni)) * PX - 2, 14),
                      backgroundColor: `${b.color}2E`,
                      borderLeftWidth: 5,
                      borderLeftColor: b.color,
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      overflow: "hidden",
                    }}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "800", color: C.texto }}>{b.titulo}</Text>
                    <Text style={{ fontSize: 11, color: C.muted }}>{b.subtitulo ?? `${aHHMM(b.ini)} – ${aHHMM(b.fin)}`}</Text>
                  </Pressable>
                ))}
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 14 },
  fila: { flexDirection: "row" },
  dia: { width: 110, textAlign: "center", paddingVertical: 8, fontSize: 12, fontWeight: "800", borderLeftWidth: 1 },
  hora: { position: "absolute", right: 4, fontSize: 10 },
  columna: { width: 110, borderLeftWidth: 1 },
});
