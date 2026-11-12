import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Expediente } from "../services/clinicoService";
import {
  Boton,
  C,
  Etiqueta,
  etiquetaEstado,
  fechaHora,
  soloFecha,
  Tarjeta,
} from "./c2/ui";

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
      {/* Tarjeta de datos generales */}
      <Tarjeta
        style={{ gap: 4, borderLeftWidth: 4, borderLeftColor: "#247F76" }}
      >
        <View style={s.headerRow}>
          <View style={s.iconCircle}>
            <Ionicons name="person" size={20} color="#247F76" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.nombre}>{p.nombre_completo ?? "Paciente"}</Text>
            <Text style={s.sub}>
              {p.genero ?? "—"} · Nac. {soloFecha(p.fecha_nacimiento)} ·{" "}
              {p.telefono ?? "sin teléfono"}
            </Text>
          </View>
        </View>
        <Text style={s.sub}>
          🩸 Tipo de sangre: {d.tipo_sangre ?? "no registrado"}
          {d.nombre_contacto_emergencia
            ? ` · 🚨 Emergencia: ${d.nombre_contacto_emergencia} ${d.telefono_contacto_emergencia ?? ""}`
            : ""}
        </Text>
      </Tarjeta>

      {/* ALERGIAS - rojo */}
      <Seccion
        titulo="Alergias"
        icono="warning"
        color="#B03A3A"
        bg="#FFF5F5"
        acciones={accionesAlergias}
      >
        {exp.alergias.length === 0 ? (
          <Text style={s.vacio}>Sin alergias registradas.</Text>
        ) : (
          exp.alergias.map((a) => (
            <View
              key={a.id_PK}
              style={[s.fila, s.blockBorder, { borderLeftColor: "#D65A5A" }]}
            >
              <Etiqueta texto={a.nombre} tono="danger" />
              <Text style={[s.sub, { flex: 1 }]}>
                {a.severidad ? `Severidad: ${a.severidad}` : ""}
              </Text>
              {onQuitarAlergia && (
                <Boton
                  pequeno
                  variante="secundario"
                  texto="Quitar"
                  onPress={() => onQuitarAlergia(a.id_PK)}
                />
              )}
            </View>
          ))
        )}
      </Seccion>

      {/* ANTECEDENTES - amarillo */}
      <Seccion
        titulo="Antecedentes"
        icono="document-text"
        color="#92400E"
        bg="#FFFBEB"
        acciones={accionesAntecedentes}
      >
        {exp.antecedentes.length === 0 ? (
          <Text style={s.vacio}>Sin antecedentes registrados.</Text>
        ) : (
          exp.antecedentes.map((a) => (
            <View
              key={a.id_PK}
              style={[s.bloque, s.blockBorder, { borderLeftColor: "#F59E0B" }]}
            >
              <Text style={s.item}>
                {a.diagnostico ?? a.descripcion ?? "Antecedente"}
              </Text>
              {!!a.descripcion && !!a.diagnostico && (
                <Text style={s.sub}>{a.descripcion}</Text>
              )}
              {!!a.tratamiento && (
                <Text style={s.sub}>💊 Tratamiento: {a.tratamiento}</Text>
              )}
              <Text style={s.meta}>
                {[
                  a.estado && etiquetaEstado(a.estado),
                  a.fecha_diagnostico && soloFecha(a.fecha_diagnostico),
                  a.doctor && `Dr. ${a.doctor}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          ))
        )}
      </Seccion>

      {/* CONSULTAS - azul */}
      <Seccion titulo="Consultas" icono="medkit" color="#1E3A8A" bg="#EFF6FF">
        {exp.consultas.length === 0 ? (
          <Text style={s.vacio}>Aún no hay consultas registradas.</Text>
        ) : (
          exp.consultas.map((c) => (
            <View
              key={c.id_PK}
              style={[s.bloque, s.blockBorder, { borderLeftColor: "#3B82F6" }]}
            >
              <Text style={s.item}>
                {c.diagnostico ?? "Consulta sin diagnóstico"}
                {c.codigo_cie10 ? ` (${c.codigo_cie10})` : ""}
              </Text>
              {!!c.tratamiento && (
                <Text style={s.sub}>🩺 Tratamiento: {c.tratamiento}</Text>
              )}
              {!!c.notas && <Text style={s.sub}>📝 Notas: {c.notas}</Text>}
              <Text style={s.meta}>
                {fechaHora(c.fecha_visita)} · Dr. {c.doctor ?? "—"}
              </Text>
            </View>
          ))
        )}
      </Seccion>

      {/* RECETAS - verde */}
      <Seccion titulo="Recetas" icono="bandage" color="#065F46" bg="#ECFDF5">
        {exp.recetas.length === 0 ? (
          <Text style={s.vacio}>Sin recetas.</Text>
        ) : (
          exp.recetas.map((r) => (
            <View
              key={r.id_PK}
              style={[s.bloque, s.blockBorder, { borderLeftColor: "#10B981" }]}
            >
              <View style={s.fila}>
                <Text style={[s.item, { flex: 1 }]}>💊 Receta #{r.id_PK}</Text>
                <Etiqueta
                  texto={etiquetaEstado(r.estado)}
                  tono={
                    r.estado === "dispensada"
                      ? "ok"
                      : r.estado === "dispensada_parcial"
                        ? "warn"
                        : "info"
                  }
                />
              </View>

              {/* 👇 MEDICAMENTOS CON DETALLE 👇 */}
              {r.items && r.items.length > 0 ? (
                r.items.map((it) => (
                  <View key={it.id_PK} style={s.medItem}>
                    <Text style={s.medItemTitle}>
                      💊 {it.medicamento ?? "Medicamento"}{" "}
                      {it.presentacion ? `(${it.presentacion})` : ""}
                    </Text>
                    {!!it.dosis && (
                      <Text style={s.medItemDetail}>
                        <Text style={s.medItemLabel}>Dosis: </Text>
                        {it.dosis}
                      </Text>
                    )}
                    {!!it.frecuencia && (
                      <Text style={s.medItemDetail}>
                        <Text style={s.medItemLabel}>Frecuencia: </Text>
                        {it.frecuencia}
                      </Text>
                    )}
                    {!!it.duracion && (
                      <Text style={s.medItemDetail}>
                        <Text style={s.medItemLabel}>Duración: </Text>
                        {it.duracion}
                      </Text>
                    )}
                    {!!it.cantidad && (
                      <Text style={s.medItemDetail}>
                        <Text style={s.medItemLabel}>Cantidad: </Text>
                        {it.cantidad}
                      </Text>
                    )}
                    {!!it.instrucciones && (
                      <Text style={s.medItemDetail}>
                        <Text style={s.medItemLabel}>Instrucciones: </Text>
                        {it.instrucciones}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={s.vacio}>Sin medicamentos registrados.</Text>
              )}

              <Text style={s.meta}>
                {fechaHora(r.creado_en)} · Dr. {r.doctor ?? "—"}
              </Text>

              {/* 👇 BOTÓN VER / DESCARGAR PDF 👇 */}
              <Pressable
                style={s.pdfButton}
                onPress={() =>
                  router.push({
                    pathname: "/doctor/receta-pdf",
                    params: {
                      recetaId: String(r.id_PK),
                      paciente: exp.paciente.nombre_completo ?? "Paciente",
                      doctor: r.doctor ?? "—",
                      fecha: r.creado_en,
                      medicamentos:
                        r.items?.map((it) => it.medicamento).join("|") || "",
                      estado: r.estado ?? "activa",
                    },
                  })
                }
              >
                <Ionicons name="document-text" size={14} color="#FFF" />
                <Text style={s.pdfButtonText}>Ver Receta / QR</Text>
              </Pressable>
            </View>
          ))
        )}
      </Seccion>

      {/* NOTAS - morado */}
      {exp.registros && (
        <Seccion
          titulo="Notas del expediente"
          icono="create"
          color="#5B21B6"
          bg="#F5F3FF"
          acciones={accionesNotas}
        >
          {exp.registros.length === 0 ? (
            <Text style={s.vacio}>Sin notas.</Text>
          ) : (
            exp.registros.map((r) => (
              <View
                key={r.id_PK}
                style={[
                  s.bloque,
                  s.blockBorder,
                  { borderLeftColor: "#8B5CF6" },
                ]}
              >
                <Text style={s.sub}>{r.notas_generales}</Text>
                <Text style={s.meta}>
                  {fechaHora(r.creado_en)}
                  {r.doctor ? ` · Dr. ${r.doctor}` : ""}
                </Text>
              </View>
            ))
          )}
        </Seccion>
      )}

      {/* TRANSFERENCIAS - naranja */}
      {exp.transferencias && exp.transferencias.length > 0 && (
        <Seccion
          titulo="Historial de transferencias"
          icono="swap-horizontal"
          color="#9A3412"
          bg="#FFF7ED"
        >
          {exp.transferencias.map((t) => (
            <View
              key={t.id_PK}
              style={[s.bloque, s.blockBorder, { borderLeftColor: "#F97316" }]}
            >
              <Text style={s.item}>
                🔄 Dr. {t.de ?? "—"} → Dr. {t.a ?? "—"}
              </Text>
              {!!t.motivo && <Text style={s.sub}>{t.motivo}</Text>}
              <Text style={s.meta}>{fechaHora(t.creado_en)}</Text>
            </View>
          ))}
        </Seccion>
      )}
    </>
  );
}

function Seccion({
  titulo,
  icono,
  color,
  bg,
  acciones,
  children,
}: {
  titulo: string;
  icono: any;
  color: string;
  bg: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Tarjeta style={{ gap: 6, borderTopWidth: 3, borderTopColor: color }}>
      <View style={s.fila}>
        <View style={[s.sectionIcon, { backgroundColor: bg }]}>
          <Ionicons name={icono} size={16} color={color} />
        </View>
        <Text style={[s.titulo, { flex: 1, color }]}>{titulo}</Text>
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
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  bloque: { paddingTop: 6, marginTop: 6 },
  blockBorder: { borderLeftWidth: 3, paddingLeft: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E7F5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  // 👇 NUEVOS ESTILOS PARA LOS MEDICAMENTOS 👇
  medItem: {
    backgroundColor: "#F9FBFA",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  medItemTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#173F3A",
    marginBottom: 4,
  },
  medItemDetail: {
    fontSize: 12,
    color: "#4A5D59",
    marginTop: 2,
  },
  medItemLabel: {
    fontWeight: "800",
    color: "#31534D",
  },
  // 👇 ESTILOS DEL BOTÓN PDF 👇
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#247F76",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  pdfButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
