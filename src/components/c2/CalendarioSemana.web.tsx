import React, { useState } from "react";
import { View } from "react-native";

import { useC2Colors } from "./ui";
import {
  BloqueCal,
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

const FORMATO = "application/x-vitalia-salas";

/** Lo que se está arrastrando (los navegadores no dejan leer dataTransfer mientras se arrastra). */
let arrastre: { k: "item" | "bloque"; id?: number; dur: number; offset: number } | null = null;

/* ------------------------------------------------------------------ chip que se puede jalar */
export function ChipArrastrable({ item, color, subtitulo, activo, deshabilitado, onPress }: ChipArrastrableProps) {
  const C = useC2Colors();
  return (
    <div
      draggable={!deshabilitado}
      title={deshabilitado ? "No disponible" : "Jala y suelta en el calendario, o haz clic para elegirlo"}
      onDragStart={(e) => {
        arrastre = { k: "item", dur: 60, offset: 0 };
        e.dataTransfer.setData(FORMATO, JSON.stringify({ k: "item", item }));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={() => {
        arrastre = null;
      }}
      onClick={deshabilitado ? undefined : onPress}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 12,
        border: `2px solid ${activo ? color : `${color}66`}`,
        background: activo ? `${color}33` : C.tarjeta,
        color: C.texto,
        cursor: deshabilitado ? "not-allowed" : "grab",
        opacity: deshabilitado ? 0.45 : 1,
        userSelect: "none",
        fontFamily: "inherit",
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 6, background: color, flexShrink: 0 }} />
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{item.etiqueta}</span>
        {!!subtitulo && <span style={{ fontSize: 11, color: C.muted }}>{subtitulo}</span>}
      </span>
      <span style={{ marginLeft: 4, fontSize: 14, color: C.muted }}>⠿</span>
    </div>
  );
}

/* ------------------------------------------------------------------ calendario semanal */
export function CalendarioSemana({
  bloques,
  dias = [0, 1, 2, 3, 4, 5, 6],
  etiquetaDia,
  pxMin,
  horaIni,
  horaFin,
  duracionNueva,
  colocando,
  onSoltarItem,
  onColocar,
  onBloque,
  onMoverBloque,
}: CalendarioSemanaProps) {
  const C = useC2Colors();
  const PX = pxMin ?? PX_MIN;
  const unSoloDia = dias.length === 1;
  const [hover, setHover] = useState<{ dia: number; min: number; dur: number } | null>(null);
  const hoy = hoyIndiceSemana();
  const minIni = horaIni * 60;
  const minFin = horaFin * 60;
  const alto = (minFin - minIni) * PX;
  const horas = Array.from({ length: horaFin - horaIni }, (_, i) => horaIni + i);

  const minutosDe = (e: React.DragEvent | React.MouseEvent, dur: number, offset: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const crudo = minIni + y / PX - offset;
    const snap = Math.round(crudo / PASO_MIN) * PASO_MIN;
    return ajustar(snap, minIni, Math.max(minIni, minFin - dur));
  };

  const columna = (dia: number) => {
    const delDia = bloques.filter((b) => b.dia === dia || b.dia === null);
    return (
      <div
        key={dia}
        onDragOver={(e) => {
          if (!arrastre) return;
          e.preventDefault();
          const min = minutosDe(e, arrastre.dur, arrastre.offset);
          const dur = arrastre.k === "item" ? duracionNueva : arrastre.dur;
          if (!hover || hover.dia !== dia || hover.min !== min) setHover({ dia, min, dur });
        }}
        onDrop={(e) => {
          e.preventDefault();
          const info = arrastre;
          setHover(null);
          arrastre = null;
          if (!info) return;
          let datos: any = null;
          try {
            datos = JSON.parse(e.dataTransfer.getData(FORMATO));
          } catch {
            return;
          }
          const dur = info.k === "item" ? duracionNueva : info.dur;
          const min = minutosDe(e, dur, info.offset);
          if (datos.k === "item") onSoltarItem(datos.item, dia, min);
          else if (datos.k === "bloque") onMoverBloque(datos.id, dia, min);
        }}
        onClick={(e) => {
          if (colocando) onColocar(dia, minutosDe(e, duracionNueva, 0));
        }}
        style={{
          position: "relative",
          flex: 1,
          minWidth: 120,
          height: alto,
          borderLeft: `1px solid ${C.borde}`,
          background: dia === hoy ? C.primarioSuave : "transparent",
          cursor: colocando ? "copy" : "default",
        }}
      >
        {horas.map((h, i) => (
          <div key={h} style={{ position: "absolute", left: 0, right: 0, top: i * 60 * PX, height: 0, borderTop: `1px solid ${C.borde}` }} />
        ))}
        {horas.map((h, i) => (
          <div key={`m${h}`} style={{ position: "absolute", left: 0, right: 0, top: (i * 60 + 30) * PX, height: 0, borderTop: `1px dashed ${C.borde}`, opacity: 0.5 }} />
        ))}

        {delDia.map((b: BloqueCal, idx: number) => {
          const top = (Math.max(b.ini, minIni) - minIni) * PX;
          const h = Math.max((Math.min(b.fin, minFin) - Math.max(b.ini, minIni)) * PX, 14);
          return (
            <div
              key={`${b.id}-${dia}-${idx}`}
              draggable={!b.fijo}
              onDragStart={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const offset = (e.clientY - rect.top) / PX;
                arrastre = { k: "bloque", id: b.id, dur: b.fin - b.ini, offset: Math.round(offset / PASO_MIN) * PASO_MIN };
                e.dataTransfer.setData(FORMATO, JSON.stringify({ k: "bloque", id: b.id }));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                arrastre = null;
                setHover(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBloque(b.id);
              }}
              title={b.fijo ? "Haz clic para ver o editar" : "Haz clic para ver o editar · jálalo para moverlo"}
              style={{
                position: "absolute",
                top,
                height: h - 2,
                left: 3,
                right: 3,
                background: `${b.color}2E`,
                borderLeft: `5px solid ${b.color}`,
                borderRadius: 8,
                padding: "3px 6px",
                overflow: "hidden",
                cursor: b.fijo ? "pointer" : "grab",
                color: C.texto,
                fontSize: 12,
                boxSizing: "border-box",
                outline: b.dia === null ? `1px dashed ${b.color}` : "none",
                zIndex: 2,
              }}
            >
              <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.titulo}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{b.subtitulo ?? `${aHHMM(b.ini)} – ${aHHMM(b.fin)}`}</div>
            </div>
          );
        })}

        {hover && hover.dia === dia && (
          <div
            style={{
              position: "absolute",
              left: 3,
              right: 3,
              top: (hover.min - minIni) * PX,
              height: hover.dur * PX - 2,
              background: `${C.primario}33`,
              border: `2px dashed ${C.primario}`,
              borderRadius: 8,
              pointerEvents: "none",
              zIndex: 3,
              fontSize: 11,
              fontWeight: 800,
              color: C.primario,
              padding: "2px 6px",
              boxSizing: "border-box",
            }}
          >
            {aHHMM(hover.min)} – {aHHMM(Math.min(hover.min + hover.dur, minFin))}
          </div>
        )}
      </div>
    );
  };

  return (
    <View style={{ width: "100%" }}>
      <div style={{ overflowX: "auto", border: `1px solid ${C.borde}`, borderRadius: 14, background: C.tarjeta }}>
        <div style={{ minWidth: 48 + dias.length * (unSoloDia ? 260 : 120) }}>
          {/* encabezado de días */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.borde}`, background: C.fondo }}>
            <div style={{ width: 48, flexShrink: 0 }} />
            {dias.map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 120,
                  textAlign: "center",
                  padding: "8px 0",
                  lineHeight: 1.2,
                  fontSize: 12,
                  fontWeight: 800,
                  color: i === hoy ? C.primario : C.texto,
                  borderLeft: `1px solid ${C.borde}`,
                }}
              >
                {unSoloDia ? DIAS_LARGO[i] : DIAS_CORTO[i]}
                {i === hoy ? " · hoy" : ""}
                {!!etiquetaDia && <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 1 }}>{etiquetaDia(i)}</div>}
              </div>
            ))}
          </div>
          {/* cuerpo */}
          <div style={{ display: "flex" }}>
            <div style={{ width: 48, flexShrink: 0, position: "relative", height: alto }}>
              {horas.map((h, i) => (
                <div key={h} style={{ position: "absolute", top: i * 60 * PX - 7, right: 6, fontSize: 10, color: C.muted }}>
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {dias.map(columna)}
          </div>
        </div>
      </div>
    </View>
  );
}
