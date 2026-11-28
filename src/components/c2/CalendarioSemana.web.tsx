import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { useC2Colors } from "./ui";
import {
  BloqueCal,
  CalendarioSemanaProps,
  ChipArrastrableProps,
  ItemArrastrable,
  DIAS_CORTO,
  DIAS_LARGO,
  PASO_MIN,
  PX_MIN,
  aHHMM,
  ajustar,
  hoyIndiceSemana,
} from "./calendarioTipos";

/* ------------------------------------------------------------------ arrastre con puntero (ratón / lápiz)
 * No se usa el drag-and-drop nativo de HTML5 (poco fiable dentro de React Native Web y de los ScrollView):
 * el arrastre se calcula con eventos de puntero, muestra una etiqueta que sigue al cursor, resalta el horario
 * de destino y hace scroll automático cerca de los bordes. En pantallas táctiles se sigue usando «tocar y tocar».
 */
type FuenteArrastre =
  | { k: "item"; item: ItemArrastrable; dur: number; offset: number }
  | { k: "bloque"; id: number; dur: number; offset: number };

type Destino = { cal: string; dia: number; min: number; dur: number } | null;

type Manejadores = {
  soltarItem: (item: ItemArrastrable, dia: number, min: number) => void;
  moverBloque: (id: number, dia: number, min: number) => void;
  duracionNueva: number;
};

const manejadores = new Map<string, Manejadores>();
const oyentesDestino = new Set<(d: Destino) => void>();
let ultimoArrastre = 0;

/** true si acaba de terminar un arrastre (para ignorar el «clic» que el navegador dispara al soltar). */
const acabaDeArrastrar = () => Date.now() - ultimoArrastre < 350;

function destinoEn(x: number, y: number, fuente: FuenteArrastre): Destino {
  for (const el of document.elementsFromPoint(x, y)) {
    const col = (el as HTMLElement).closest?.("[data-vit-col]") as HTMLElement | null;
    if (!col) continue;
    const cal = col.dataset.vitCal ?? "";
    const dia = Number(col.dataset.vitCol);
    const ini = Number(col.dataset.vitIni);
    const fin = Number(col.dataset.vitFin);
    const px = Number(col.dataset.vitPx);
    const h = manejadores.get(cal);
    if (!h || !px) return null;
    const dur = fuente.k === "item" ? h.duracionNueva : fuente.dur;
    const rect = col.getBoundingClientRect();
    const crudo = ini + (y - rect.top) / px - fuente.offset;
    const snap = Math.round(crudo / PASO_MIN) * PASO_MIN;
    return { cal, dia, min: ajustar(snap, ini, Math.max(ini, fin - dur)), dur };
  }
  return null;
}

/** Elemento con scroll vertical más cercano (el ScrollView de la pantalla); null si es la ventana. */
function contenedorScroll(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return null;
}

function empezarArrastre(e: React.PointerEvent, fuente: FuenteArrastre, etiqueta: string, color: string) {
  if (e.pointerType === "touch" || e.button !== 0) return; // táctil: se elige tocando
  const origen = e.currentTarget as HTMLElement;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let px = x0;
  let py = y0;
  let activo = false;
  let fantasma: HTMLElement | null = null;
  let raf = 0;
  const scroller = contenedorScroll(origen);
  const notificar = (d: Destino) => oyentesDestino.forEach((f) => f(d));

  const bucle = () => {
    if (!activo) return;
    const r = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const zona = 80;
    let dy = 0;
    if (py < r.top + zona) dy = -Math.ceil((r.top + zona - py) / 4);
    else if (py > r.bottom - zona) dy = Math.ceil((py - (r.bottom - zona)) / 4);
    dy = Math.max(-26, Math.min(26, dy));
    if (dy) {
      if (scroller) scroller.scrollTop += dy;
      else window.scrollBy(0, dy);
      notificar(destinoEn(px, py, fuente));
    }
    raf = requestAnimationFrame(bucle);
  };

  const mover = (ev: PointerEvent) => {
    px = ev.clientX;
    py = ev.clientY;
    if (!activo) {
      if (Math.hypot(px - x0, py - y0) < 6) return; // pequeño umbral: un clic normal no es arrastre
      activo = true;
      fantasma = document.createElement("div");
      fantasma.textContent = etiqueta;
      Object.assign(fantasma.style, {
        position: "fixed", left: "0", top: "0", zIndex: "99999", pointerEvents: "none", padding: "6px 12px", borderRadius: "10px",
        background: color, color: "#fff", fontSize: "13px", fontWeight: "800", boxShadow: "0 6px 18px rgba(0,0,0,.3)", opacity: ".92", whiteSpace: "nowrap",
      });
      document.body.appendChild(fantasma);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      raf = requestAnimationFrame(bucle);
    }
    if (fantasma) fantasma.style.transform = `translate(${px + 14}px, ${py + 14}px)`;
    notificar(destinoEn(px, py, fuente));
  };

  const terminar = (cancelado: boolean) => {
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", subir);
    window.removeEventListener("pointercancel", cancelar);
    window.removeEventListener("keydown", tecla);
    cancelAnimationFrame(raf);
    if (!activo) return;
    ultimoArrastre = Date.now();
    const d = cancelado ? null : destinoEn(px, py, fuente);
    notificar(null);
    fantasma?.remove();
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    if (!d) return;
    const h = manejadores.get(d.cal);
    if (!h) return;
    if (fuente.k === "item") h.soltarItem(fuente.item, d.dia, d.min);
    else h.moverBloque(fuente.id, d.dia, d.min);
  };
  const subir = () => terminar(false);
  const cancelar = () => terminar(true);
  const tecla = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") terminar(true);
  };

  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", subir);
  window.addEventListener("pointercancel", cancelar);
  window.addEventListener("keydown", tecla);
}

/* ------------------------------------------------------------------ chip que se puede jalar */
export function ChipArrastrable({ item, color, subtitulo, activo, deshabilitado, onPress }: ChipArrastrableProps) {
  const C = useC2Colors();
  return (
    <div
      title={deshabilitado ? "No disponible" : "Jala y suelta en el calendario, o haz clic para elegirlo"}
      onPointerDown={(e) => {
        if (!deshabilitado) empezarArrastre(e, { k: "item", item, dur: 60, offset: 0 }, item.etiqueta, color);
      }}
      onClick={() => {
        if (deshabilitado || acabaDeArrastrar()) return;
        onPress?.();
      }}
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
        touchAction: "pan-y",
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
  ahora,
  sinEncabezado,
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
  const uid = useRef(`cal-${Math.random().toString(36).slice(2)}`).current;

  // Mantiene al día los manejadores de este calendario para que el arrastre global sepa a quién avisar
  useEffect(() => {
    manejadores.set(uid, { soltarItem: onSoltarItem, moverBloque: onMoverBloque, duracionNueva });
    return () => {
      manejadores.delete(uid);
    };
  });

  // Resalta el horario de destino cuando el arrastre pasa por este calendario
  useEffect(() => {
    const oyente = (d: Destino) =>
      setHover((prev) => {
        if (!d || d.cal !== uid) return prev ? null : prev;
        return prev && prev.dia === d.dia && prev.min === d.min && prev.dur === d.dur ? prev : { dia: d.dia, min: d.min, dur: d.dur };
      });
    oyentesDestino.add(oyente);
    return () => {
      oyentesDestino.delete(oyente);
    };
  }, [uid]);
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
    const delDia = bloques.filter((b) => (b.dia === dia || b.dia === null) && b.fin > minIni && b.ini < minFin);
    return (
      <div
        key={dia}
        data-vit-col={dia}
        data-vit-cal={uid}
        data-vit-ini={minIni}
        data-vit-fin={minFin}
        data-vit-px={PX}
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
        {horas.map((h, i) =>
          i % 2 === 1 ? <div key={`b${h}`} style={{ position: "absolute", left: 0, right: 0, top: i * 60 * PX, height: 60 * PX, background: "rgba(100,116,139,0.07)" }} /> : null
        )}
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
              onPointerDown={(e) => {
                if (b.fijo) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const offset = Math.round((e.clientY - rect.top) / PX / PASO_MIN) * PASO_MIN;
                empezarArrastre(e, { k: "bloque", id: b.id, dur: b.fin - b.ini, offset }, b.titulo, b.color);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (acabaDeArrastrar()) return;
                onBloque(b.id);
              }}
              title={b.fijo ? "Haz clic para ver o editar" : "Haz clic para ver o editar · jálalo para moverlo"}
              style={{
                position: "absolute",
                top,
                height: h - 2,
                left: 3,
                right: 3,
                background: `linear-gradient(90deg, ${b.color}40, ${b.color}1A)`,
                border: `1px solid ${b.color}55`,
                borderLeft: `6px solid ${b.color}`,
                boxShadow: "0 2px 6px rgba(15,23,42,0.14)",
                borderRadius: 10,
                padding: "4px 8px",
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

        {ahora && ahora.dia === dia && ahora.min >= minIni && ahora.min <= minFin && (
          <div style={{ position: "absolute", left: 0, right: 0, top: (ahora.min - minIni) * PX, height: 0, borderTop: "2px solid #EF4444", zIndex: 4, pointerEvents: "none" }}>
            <span style={{ position: "absolute", left: -1, top: -6, width: 10, height: 10, borderRadius: 5, background: "#EF4444" }} />
            <span style={{ position: "absolute", right: 4, top: -18, fontSize: 10, fontWeight: 800, color: "#FFFFFF", background: "#EF4444", borderRadius: 6, padding: "1px 6px" }}>
              ahora {aHHMM(ahora.min)}
            </span>
          </div>
        )}

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
        <div style={{ minWidth: 56 + dias.length * (unSoloDia ? 200 : 120) }}>
          {/* encabezado de días */}
          {!sinEncabezado && (
          <div style={{ display: "flex", borderBottom: `1px solid ${C.borde}`, background: C.fondo }}>
            <div style={{ width: 56, flexShrink: 0 }} />
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
          )}
          {/* cuerpo */}
          <div style={{ display: "flex" }}>
            <div style={{ width: 56, flexShrink: 0, position: "relative", height: alto }}>
              {horas.map((h, i) => (
                <div key={h} style={{ position: "absolute", top: i * 60 * PX - 9, right: 6, fontSize: 10.5, fontWeight: 700, color: C.texto, background: C.fondo, border: `1px solid ${C.borde}`, borderRadius: 8, padding: "0 6px", lineHeight: "16px" }}>
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
