import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { C, Etiqueta, etiquetaEstado, fechaHora, soloFecha, Tarjeta } from "./c2/ui";
import type { Expediente } from "../services/clinicoService";
import { Boton } from "./c2/ui";

/**
 * Vista de un expediente. La usan el médico (con acciones de edición) y el
 * paciente (solo lectura, sin notas internas). Las secciones `registros` y
 * `transferencias` solo vienen del backend para personal clínico.
 */
export default function ExpedienteVista({
  exp,
  accionesAlergias,
  accionesAntecedentes,
  accionesNotas,
  onQuitarAlergia,
}: {
  exp: Expediente;
  accionesAlergias?: ReactNode;
  accionesAntecedentes?: ReactNode;
  accionesNotas?: ReactNode;
  onQuitarAlergia?: (alergiaPacienteId: number) => void;
}) {
  const p = exp.paciente;
  const d = exp.datos_clinicos;

  return (
    <>
      <Tarjeta style={{ gap: 4 }}>
        <Text style={s.nombre}>{p.nombre_completo ?? "Paciente"}</Text>
        <Text style={s.sub}>
          {p.genero ?? "—"} · Nac. {soloFecha(p.fecha_nacimiento)} · {p.telefono ?? "sin teléfono"}
        </Text>
        <Text style={s.sub}>
          Tipo de sangre: {d.tipo_sangre ?? "no registrado"}
          {d.nombre_contacto_emergencia ? ` · Emergencia: ${d.nombre_contacto_emergencia} ${d.telefono_contacto_emergencia ?? ""}` : ""}
        </Text>
      </Tarjeta>

      <Seccion titulo="Alergias" acciones={accionesAlergias}>
        {exp.alergias.length === 0 ? (
          <Text style={s.vacio}>Sin alergias registradas.</Text>
        ) : (
          exp.alergias.map((a) => (
            <View key={a.id_PK} style={s.fila}>
              <Etiqueta texto={a.nombre} tono="danger" />
              <Text style={[s.sub, { flex: 1 }]}>{a.severidad ? `Severidad: ${a.severidad}` : ""}</Text>
              {onQuitarAlergia && <Boton pequeno variante="secundario" texto="Quitar" onPress={() => onQuitarAlergia(a.id_PK)} />}
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Antecedentes" acciones={accionesAntecedentes}>
        {exp.antecedentes.length === 0 ? (
          <Text style={s.vacio}>Sin antecedentes registrados.</Text>
        ) : (
          exp.antecedentes.map((a) => (
            <View key={a.id_PK} style={s.bloque}>
              <Text style={s.item}>{a.diagnostico ?? a.descripcion ?? "Antecedente"}</Text>
              {!!a.descripcion && !!a.diagnostico && <Text style={s.sub}>{a.descripcion}</Text>}
              {!!a.tratamiento && <Text style={s.sub}>Tratamiento: {a.tratamiento}</Text>}
              <Text style={s.meta}>{[a.estado && etiquetaEstado(a.estado), a.fecha_diagnostico && soloFecha(a.fecha_diagnostico), a.doctor && `Dr. ${a.doctor}`].filter(Boolean).join(" · ")}</Text>
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Consultas">
        {exp.consultas.length === 0 ? (
          <Text style={s.vacio}>Aún no hay consultas registradas.</Text>
        ) : (
          exp.consultas.map((c) => (
            <View key={c.id_PK} style={s.bloque}>
              <Text style={s.item}>{c.diagnostico ?? "Consulta sin diagnóstico"}{c.codigo_cie10 ? ` (${c.codigo_cie10})` : ""}</Text>
              {!!c.tratamiento && <Text style={s.sub}>Tratamiento: {c.tratamiento}</Text>}
              {!!c.notas && <Text style={s.sub}>Notas: {c.notas}</Text>}
              <Text style={s.meta}>{fechaHora(c.fecha_visita)} · Dr. {c.doctor ?? "—"}</Text>
            </View>
          ))
        )}
      </Seccion>

      <Seccion titulo="Recetas">
        {exp.recetas.length === 0 ? (
          <Text style={s.vacio}>Sin recetas.</Text>
        ) : (
          exp.recetas.map((r) => (
            <View key={r.id_PK} style={s.bloque}>
              <View style={s.fila}>
                <Text style={[s.item, { flex: 1 }]}>Receta #{r.id_PK}</Text>
                <Etiqueta texto={etiquetaEstado(r.estado)} tono={r.estado === "dispensada" ? "ok" : r.estado === "dispensada_parcial" ? "warn" : "info"} />
              </View>
              <Text style={s.sub}>{r.medicamentos.join(", ") || "—"}</Text>
              <Text style={s.meta}>{fechaHora(r.creado_en)} · Dr. {r.doctor ?? "—"}</Text>
            </View>
          ))
        )}
      </Seccion>

      {exp.registros && (
        <Seccion titulo="Notas del expediente" acciones={accionesNotas}>
          {exp.registros.length === 0 ? (
            <Text style={s.vacio}>Sin notas.</Text>
          ) : (
            exp.registros.map((r) => (
              <View key={r.id_PK} style={s.bloque}>
                <Text style={s.sub}>{r.notas_generales}</Text>
                <Text style={s.meta}>{fechaHora(r.creado_en)}{r.doctor ? ` · Dr. ${r.doctor}` : ""}</Text>
              </View>
            ))
          )}
        </Seccion>
      )}

      {exp.transferencias && exp.transferencias.length > 0 && (
        <Seccion titulo="Historial de transferencias">
          {exp.transferencias.map((t) => (
            <View key={t.id_PK} style={s.bloque}>
              <Text style={s.item}>Dr. {t.de ?? "—"} → Dr. {t.a ?? "—"}</Text>
              {!!t.motivo && <Text style={s.sub}>{t.motivo}</Text>}
              <Text style={s.meta}>{fechaHora(t.creado_en)}</Text>
            </View>
          ))}
        </Seccion>
      )}
    </>
  );
}

function Seccion({ titulo, acciones, children }: { titulo: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <Tarjeta style={{ gap: 6 }}>
      <View style={s.fila}>
        <Text style={[s.titulo, { flex: 1 }]}>{titulo}</Text>
        {acciones}
      </View>
      {children}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  nombre: { fontSize: 18, fontWeight: "800", color: C.titulo },
  titulo: { fontSize: 15, fontWeight: "800", color: C.titulo },
  item: { fontSize: 14, fontWeight: "700", color: C.texto },
  sub: { fontSize: 13, color: C.texto2 },
  meta: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  vacio: { fontSize: 13, color: C.muted },
  fila: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  bloque: { borderTopWidth: 1, borderTopColor: C.borde, paddingTop: 6 },
});
