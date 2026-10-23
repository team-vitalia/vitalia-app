/**
 * Selector múltiple de especialidades conectado a la API.
 *  - Lista las especialidades activas (GET /api/especialidades/)
 *  - Permite crear una nueva sin salir del formulario (POST) y la selecciona sola
 *  - Se usa en el registro de usuarios y en la edición del perfil médico
 */
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  crearEspecialidad,
  Especialidad,
  listarEspecialidades,
} from "../services/especialidadesService";
import { mensajeError } from "../services/util";
import { Aviso, Boton, C, Campo, Chip } from "./admin/ui";

interface Props {
  valor: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  mostrarError?: boolean;
  /** Oculta el botón de "Nueva especialidad" (p. ej. para roles sin permiso). */
  permitirCrear?: boolean;
}

export default function EspecialidadSelector({
  valor,
  onChange,
  error,
  mostrarError,
  permitirCrear = true,
}: Props) {
  const router = useRouter();
  const { token } = useAuth();

  const [lista, setLista] = useState<Especialidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorNueva, setErrorNueva] = useState("");

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setErrorCarga("");
      setLista(await listarEspecialidades(token));
    } catch (e) {
      setErrorCarga(mensajeError(e, "No se pudieron cargar las especialidades."));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargar();
  }, [token, cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? lista.filter((e) => e.nombre.toLowerCase().includes(q) || (e.codigo ?? "").toLowerCase().includes(q)) : lista;
  }, [lista, busqueda]);

  const alternar = (id: number) =>
    onChange(valor.includes(id) ? valor.filter((v) => v !== id) : [...valor, id]);

  const guardarNueva = async () => {
    const limpio = nombre.trim();
    if (limpio.length < 3) {
      setErrorNueva("Escribe al menos 3 caracteres.");
      return;
    }
    try {
      setGuardando(true);
      setErrorNueva("");
      const nueva = await crearEspecialidad({ nombre: limpio, codigo: codigo.trim() || null }, token);
      setLista((l) => [...l, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      onChange([...valor, nueva.id_PK]); // queda seleccionada automáticamente
      setNombre("");
      setCodigo("");
      setCreando(false);
    } catch (e) {
      setErrorNueva(mensajeError(e, "No se pudo crear la especialidad."));
    } finally {
      setGuardando(false);
    }
  };

  const hayError = !!error && !!mostrarError;

  return (
    <View style={{ gap: 10 }}>
      <View style={s.fila}>
        <Text style={s.etiqueta}>
          Especialidades <Text style={{ color: C.peligro }}>*</Text>
        </Text>
        <Text style={[s.contador, valor.length > 0 && { color: C.primario }]}>
          {valor.length} seleccionada{valor.length === 1 ? "" : "s"}
        </Text>
      </View>

      {lista.length > 8 && (
        <Campo etiqueta="Buscar" valor={busqueda} onChange={setBusqueda} placeholder="Nombre o código…" icono="search" />
      )}

      <View style={[s.caja, hayError && { borderColor: C.peligro }]}>
        {cargando ? (
          <View style={s.centro}>
            <ActivityIndicator color={C.primario} />
            <Text style={s.suave}>Cargando especialidades…</Text>
          </View>
        ) : errorCarga ? (
          <View style={{ gap: 10 }}>
            <Aviso tipo="error" texto={errorCarga} />
            <Boton texto="Reintentar" icono="refresh" variante="secundario" chico onPress={cargar} />
          </View>
        ) : lista.length === 0 ? (
          <View style={s.centro}>
            <FontAwesome name="stethoscope" size={22} color={C.placeholder} />
            <Text style={s.suave}>Aún no hay especialidades registradas.</Text>
            {permitirCrear && <Text style={s.suave}>Crea la primera con el botón de abajo.</Text>}
          </View>
        ) : visibles.length === 0 ? (
          <Text style={[s.suave, { textAlign: "center" }]}>Sin resultados para “{busqueda}”.</Text>
        ) : (
          <View style={s.chips}>
            {visibles.map((e) => (
              <Chip key={e.id_PK} texto={e.codigo ? `${e.nombre} · ${e.codigo}` : e.nombre} activo={valor.includes(e.id_PK)} onPress={() => alternar(e.id_PK)} />
            ))}
          </View>
        )}
      </View>

      {hayError && (
        <View style={s.errorFila}>
          <FontAwesome name="exclamation-circle" size={12} color={C.peligro} />
          <Text style={{ color: C.peligro, fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {permitirCrear &&
        (creando ? (
          <View style={s.nueva}>
            <Text style={s.nuevaTitulo}>Nueva especialidad</Text>
            <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} requerido placeholder="Ej. Cardiología" autoCapitalize="words" maxLength={100} error={nombre.trim().length < 3 ? "Mínimo 3 caracteres" : ""} />
            <Campo etiqueta="Código (opcional)" valor={codigo} onChange={setCodigo} placeholder="Ej. CAR" autoCapitalize="characters" maxLength={20} />
            {errorNueva ? <Aviso tipo="error" texto={errorNueva} /> : null}
            <View style={s.acciones}>
              <Boton texto="Cancelar" variante="fantasma" chico onPress={() => { setCreando(false); setErrorNueva(""); }} />
              <Boton texto="Crear y seleccionar" icono="plus" chico cargando={guardando} onPress={guardarNueva} />
            </View>
          </View>
        ) : (
          <View style={s.acciones}>
            <Boton texto="Nueva especialidad" icono="plus" variante="secundario" chico onPress={() => setCreando(true)} />
            <Pressable onPress={() => router.push("/admin/especialidades")} accessibilityRole="link">
              <Text style={s.enlace}>Administrar especialidades</Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  etiqueta: { fontSize: 13, fontWeight: "700", color: C.texto },
  contador: { fontSize: 12, fontWeight: "700", color: C.suave },
  caja: { borderWidth: 1, borderColor: C.borde, borderRadius: 12, padding: 12, backgroundColor: "#FBFDFC", minHeight: 64, justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  centro: { alignItems: "center", gap: 6, paddingVertical: 6 },
  suave: { fontSize: 13, color: C.suave },
  errorFila: { flexDirection: "row", alignItems: "center", gap: 6 },
  acciones: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  enlace: { fontSize: 13, fontWeight: "700", color: C.primario, textDecorationLine: "underline" },
  nueva: { borderWidth: 1, borderStyle: "dashed", borderColor: C.primarioClaro, backgroundColor: C.fondo, borderRadius: 14, padding: 14, gap: 12 },
  nuevaTitulo: { fontSize: 14, fontWeight: "800", color: C.oscuro },
});
