/**
 * Registro de usuarios — vista de administrador (tablet / laptop).
 *
 * Layout: 2 columnas fluidas (≥ 900 px) que colapsan a 1 en pantallas angostas.
 *   Columna izquierda : Datos personales + Credenciales
 *   Columna derecha   : Perfil según el rol (médico / paciente) + Resumen y acciones
 *
 * Tablas que escribe la API según el rol (POST /api/usuarios/):
 *   Administrador / Recepción / Coordinador → usuarios
 *   Doctor   → usuarios + doctores + doctor_especialidades
 *   Paciente → usuarios + pacientes
 */
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Aviso, Boton, C, Campo, Chip, Seccion } from "../../../components/admin/ui";
import { hoyISO, vCorreo, vCosto, vFecha, vNombre, vPassword, vTelefono } from "../../../components/admin/validaciones";
import EspecialidadSelector from "../../../components/EspecialidadSelector";
import SelectorFecha from "../../../components/SelectorFecha";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import { authHeaders, mensajeError } from "../../../services/util";

interface Rol {
  id_PK: number;
  nombre: string;
  descripcion: string | null;
}

const ICONO_ROL: Record<number, React.ComponentProps<typeof FontAwesome>["name"]> = {
  1: "shield",
  2: "user-md",
  3: "user",
  4: "id-card-o",
  5: "sitemap",
};

const ROL_ADMIN = 1;
const ROL_DOCTOR = 2;
const ROL_PACIENTE = 3;
const ROL_COORDINADOR = 5;

/* ───────────── Fortaleza de contraseña ───────────── */

function fortaleza(p: string) {
  const reglas = [
    { ok: p.length >= 8, texto: "8+ caracteres" },
    { ok: /[a-z]/.test(p) && /[A-Z]/.test(p), texto: "Mayúscula y minúscula" },
    { ok: /\d/.test(p), texto: "Un número" },
    { ok: /[^A-Za-z0-9]/.test(p), texto: "Un símbolo" },
  ];
  const puntos = reglas.filter((r) => r.ok).length;
  const nivel = puntos <= 1 ? "Débil" : puntos === 2 ? "Regular" : puntos === 3 ? "Buena" : "Excelente";
  const color = puntos <= 1 ? C.peligro : puntos === 2 ? C.aviso : puntos === 3 ? C.primarioClaro : C.ok;
  return { reglas, puntos, nivel, color };
}

function generarPassword(): string {
  const grupos = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?"];
  const todos = grupos.join("");
  const azar = (n: number) => {
    const c = (globalThis as any).crypto;
    if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] % n;
    return Math.floor(Math.random() * n);
  };
  const chars = grupos.map((g) => g[azar(g.length)]);
  while (chars.length < 12) chars.push(todos[azar(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = azar(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const FORM_VACIO = {
  nombre: "", apellido: "", correo: "", telefono: "",
  password: "", confirmar: "",
  fechaNacimiento: "", genero: "", direccion: "",
  licencia: "", costo: "",
};

export default function CrearUsuarioScreen() {
  const router = useRouter();
  const { token, usuario } = useAuth();
  const rolActor = usuario?.rol_id ?? usuario?.rol_id_FK;

  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargandoRoles, setCargandoRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState("");
  const [rolId, setRolId] = useState<number | null>(null);

  const [f, setF] = useState(FORM_VACIO);
  const [especialidades, setEspecialidades] = useState<number[]>([]);
  const [verPassword, setVerPassword] = useState(false);

  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [errorServidor, setErrorServidor] = useState<{ correo?: string; licencia?: string }>({});
  const [creado, setCreado] = useState<{ nombre: string; rol: string } | null>(null);

  const esDoctor = rolId === ROL_DOCTOR;
  const esPaciente = rolId === ROL_PACIENTE;

  const set = <K extends keyof typeof FORM_VACIO>(campo: K) => (valor: string) => {
    setF((a) => ({ ...a, [campo]: valor }));
    if (campo === "correo") setErrorServidor((e) => ({ ...e, correo: undefined }));
    if (campo === "licencia") setErrorServidor((e) => ({ ...e, licencia: undefined }));
  };

  /* ── Roles disponibles (el coordinador no puede crear admins ni coordinadores) ── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setCargandoRoles(true);
        const r = await api.get<Rol[]>("/api/roles/", authHeaders(token));
        setRoles(r.data);
      } catch (e) {
        setErrorRoles(mensajeError(e, "No se pudieron cargar los roles."));
      } finally {
        setCargandoRoles(false);
      }
    })();
  }, [token]);

  const rolesPermitidos = useMemo(
    () => roles.filter((r) => !(rolActor === ROL_COORDINADOR && (r.id_PK === ROL_ADMIN || r.id_PK === ROL_COORDINADOR))),
    [roles, rolActor]
  );
  const rolActual = roles.find((r) => r.id_PK === rolId);

  /* ── Errores por campo (vacío = válido) ── */
  const errores = {
    nombre: vNombre(f.nombre),
    apellido: esPaciente && !f.apellido.trim() ? "El apellido es obligatorio para pacientes." : "",
    correo: errorServidor.correo ?? vCorreo(f.correo),
    telefono: vTelefono(f.telefono),
    password: vPassword(f.password),
    confirmar: f.confirmar !== f.password ? "Las contraseñas no coinciden." : !f.confirmar ? "Confirma la contraseña." : "",
    fecha: vFecha(f.fechaNacimiento),
    licencia: esDoctor ? (errorServidor.licencia ?? (f.licencia.trim() ? "" : "Ingresa el número de licencia.")) : "",
    costo: esDoctor ? vCosto(f.costo) : "",
    especialidades: esDoctor && especialidades.length === 0 ? "Selecciona al menos una especialidad." : "",
  };

  const checklist = [
    { texto: "Rol seleccionado", ok: rolId !== null },
    { texto: "Nombre completo", ok: !errores.nombre && (!esPaciente || !errores.apellido) },
    { texto: "Correo válido", ok: !errores.correo },
    { texto: "Contraseña segura y confirmada", ok: !errores.password && !errores.confirmar },
    ...(esDoctor ? [
      { texto: "Especialidad(es)", ok: !errores.especialidades },
      { texto: "Licencia y costo", ok: !errores.licencia && !errores.costo },
    ] : []),
  ];
  const completados = checklist.filter((c) => c.ok).length;
  const todoValido = completados === checklist.length && !errores.telefono && !errores.fecha;

  const fort = fortaleza(f.password);

  /* ── Guardar ── */
  const guardar = async () => {
    setIntento(true);
    setErrorGeneral("");

    if (!todoValido) {
      setErrorGeneral("Revisa los campos marcados en rojo antes de continuar.");
      return;
    }

    const datos: Record<string, unknown> = {
      nombre: f.nombre.trim(),
      correo_electronico: f.correo.trim().toLowerCase(),
      password: f.password,
      rol_id_FK: rolId,
      telefono: f.telefono.trim() || null,
    };

    if (esDoctor) {
      datos.especialidad_id_FK = especialidades[0]; // columna heredada (compatibilidad)
      datos.especialidad_ids = especialidades; // tabla doctor_especialidades
      datos.numero_licencia = f.licencia.trim();
      datos.costo_consulta = Number(f.costo);
    }

    if (esPaciente) {
      datos.apellido = f.apellido.trim();
      datos.fecha_nacimiento = f.fechaNacimiento || null;
      datos.genero = f.genero || null;
      datos.direccion = f.direccion.trim() || null;
    }

    try {
      setGuardando(true);
      await api.post("/api/usuarios/", datos, authHeaders(token));
      setCreado({ nombre: `${f.nombre.trim()} ${esPaciente ? f.apellido.trim() : ""}`.trim(), rol: rolActual?.nombre ?? "" });
    } catch (e: any) {
      const msg = mensajeError(e, "No se pudo crear el usuario.");
      // Errores de negocio → se muestran junto al campo correspondiente.
      if (/correo/i.test(msg)) setErrorServidor((x) => ({ ...x, correo: msg }));
      else if (/licencia/i.test(msg)) setErrorServidor((x) => ({ ...x, licencia: msg }));
      else setErrorGeneral(msg);
    } finally {
      setGuardando(false);
    }
  };

  const registrarOtro = () => {
    setF(FORM_VACIO);
    setEspecialidades([]);
    setRolId(null);
    setIntento(false);
    setErrorGeneral("");
    setErrorServidor({});
    setCreado(null);
  };

  /* ───────────── Éxito ───────────── */
  if (creado) {
    return (
      <View style={s.exitoPagina}>
        <View style={s.exitoTarjeta}>
          <View style={s.exitoIcono}>
            <FontAwesome name="check" size={30} color="#FFFFFF" />
          </View>
          <Text style={s.exitoTitulo}>¡Usuario registrado!</Text>
          <Text style={s.exitoTexto}>
            <Text style={{ fontWeight: "800", color: C.oscuro }}>{creado.nombre}</Text> ya puede iniciar sesión como {creado.rol}.
          </Text>
          <View style={s.exitoAcciones}>
            <Boton texto="Registrar otro" icono="plus" variante="secundario" onPress={registrarOtro} />
            <Boton texto="Ver usuarios" icono="list" onPress={() => router.replace("/admin/usuarios")} />
          </View>
        </View>
      </View>
    );
  }

  /* ───────────── Formulario ───────────── */
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fondo }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.pagina}>
        {/* Encabezado */}
        <View style={s.cabecera}>
          <Pressable onPress={() => router.replace("/admin/usuarios")} accessibilityRole="button" accessibilityLabel="Volver a usuarios" style={s.volver}>
            <FontAwesome name="angle-left" size={20} color={C.primario} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>Registrar usuario</Text>
            <Text style={s.subtitulo}>Completa los datos según el rol. Los campos con * son obligatorios.</Text>
          </View>
        </View>

        {/* Selector de rol */}
        <Seccion titulo="Tipo de usuario" subtitulo="El rol define qué datos adicionales se piden y en qué tablas se guarda." icono="users">
          {cargandoRoles ? (
            <View style={s.cargando}><ActivityIndicator color={C.primario} /><Text style={s.suave}>Cargando roles…</Text></View>
          ) : errorRoles ? (
            <Aviso tipo="error" texto={errorRoles} />
          ) : rolesPermitidos.length === 0 ? (
            <Aviso tipo="aviso" texto="No hay roles configurados. Ejecuta las migraciones de la API (alembic upgrade head) para sembrarlos." />
          ) : (
            <View style={s.roles}>
              {rolesPermitidos.map((r) => {
                const on = r.id_PK === rolId;
                return (
                  <Pressable
                    key={r.id_PK}
                    onPress={() => setRolId(r.id_PK)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [s.rol, on && s.rolActivo, pressed && { opacity: 0.8 }]}
                  >
                    <View style={[s.rolIcono, on && { backgroundColor: C.primario }]}>
                      <FontAwesome name={ICONO_ROL[r.id_PK] ?? "user"} size={16} color={on ? "#FFFFFF" : C.primario} />
                    </View>
                    <Text style={[s.rolNombre, on && { color: C.primario }]}>{r.nombre}</Text>
                    {r.descripcion ? <Text style={s.rolDesc} numberOfLines={2}>{r.descripcion}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          {intento && rolId === null && <Text style={{ color: C.peligro, fontSize: 12 }}>Selecciona un rol para continuar.</Text>}
        </Seccion>

        <View style={s.columnas}>
          {/* ── Columna izquierda ── */}
          <View style={[s.columna, s.columnaIzq]}>
            <Seccion titulo="Datos personales" icono="id-card-o">
              <View style={s.dosCampos}>
                <View style={s.mitad}>
                  <Campo etiqueta={esPaciente ? "Nombre(s)" : "Nombre completo"} valor={f.nombre} onChange={set("nombre")} requerido error={errores.nombre} mostrarError={intento} placeholder="Ej. María Fernanda" autoCapitalize="words" icono="user" />
                </View>
                {esPaciente && (
                  <View style={s.mitad}>
                    <Campo etiqueta="Apellidos" valor={f.apellido} onChange={set("apellido")} requerido error={errores.apellido} mostrarError={intento} placeholder="Ej. López Reyes" autoCapitalize="words" />
                  </View>
                )}
              </View>
              <View style={s.dosCampos}>
                <View style={s.mitad}>
                  <Campo etiqueta="Teléfono" valor={f.telefono} onChange={set("telefono")} error={errores.telefono} mostrarError={intento} teclado="phone-pad" placeholder="722 123 4567" icono="phone" ayuda="Opcional" />
                </View>
              </View>
            </Seccion>

            <Seccion titulo="Credenciales de acceso" subtitulo="Con estos datos iniciará sesión." icono="lock">
              <Campo etiqueta="Correo electrónico" valor={f.correo} onChange={set("correo")} requerido error={errores.correo} mostrarError={intento} teclado="email-address" placeholder="nombre@clinica.com" icono="envelope-o" />

              <View style={s.dosCampos}>
                <View style={s.mitad}>
                  <Campo
                    etiqueta="Contraseña"
                    valor={f.password}
                    onChange={set("password")}
                    requerido
                    secreto={!verPassword}
                    error={errores.password}
                    mostrarError={intento}
                    placeholder="Mínimo 8 caracteres"
                    icono="key"
                    derecha={
                      <Pressable onPress={() => setVerPassword((v) => !v)} hitSlop={8} accessibilityLabel={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        <FontAwesome name={verPassword ? "eye-slash" : "eye"} size={16} color={C.suave} />
                      </Pressable>
                    }
                  />
                </View>
                <View style={s.mitad}>
                  <Campo etiqueta="Confirmar contraseña" valor={f.confirmar} onChange={set("confirmar")} requerido secreto={!verPassword} error={errores.confirmar} mostrarError={intento} placeholder="Repite la contraseña" icono="key" />
                </View>
              </View>

              {f.password.length > 0 && (
                <View style={{ gap: 8 }}>
                  <View style={s.fuerzaBarras}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={[s.fuerzaBarra, i < fort.puntos && { backgroundColor: fort.color }]} />
                    ))}
                  </View>
                  <View style={s.fuerzaFila}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: fort.color }}>{fort.nivel}</Text>
                    {fort.reglas.map((r) => (
                      <Text key={r.texto} style={{ fontSize: 12, color: r.ok ? C.ok : C.suave }}>
                        {r.ok ? "✓" : "•"} {r.texto}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              <Boton texto="Generar contraseña segura" icono="magic" variante="secundario" chico onPress={() => { const p = generarPassword(); setF((a) => ({ ...a, password: p, confirmar: p })); setVerPassword(true); }} />
            </Seccion>
          </View>

          {/* ── Columna derecha ── */}
          <View style={[s.columna, s.columnaDer]}>
            {rolId === null && (
              <View style={s.vacio}>
                <FontAwesome name="hand-pointer-o" size={22} color={C.placeholder} />
                <Text style={s.vacioTexto}>Elige un tipo de usuario para ver los datos adicionales que necesita.</Text>
              </View>
            )}

            {esDoctor && (
              <Seccion titulo="Perfil médico" subtitulo="Se guarda en las tablas doctores y doctor_especialidades." icono="user-md">
                <EspecialidadSelector valor={especialidades} onChange={setEspecialidades} error={errores.especialidades} mostrarError={intento} />
                <View style={s.dosCampos}>
                  <View style={s.mitad}>
                    <Campo etiqueta="Número de licencia" valor={f.licencia} onChange={set("licencia")} requerido error={errores.licencia} mostrarError={intento} placeholder="Cédula profesional" autoCapitalize="characters" icono="certificate" />
                  </View>
                  <View style={s.mitad}>
                    <Campo etiqueta="Costo de consulta (MXN)" valor={f.costo} onChange={set("costo")} requerido error={errores.costo} mostrarError={intento} teclado="decimal-pad" placeholder="500" icono="usd" />
                  </View>
                </View>
              </Seccion>
            )}

            {esPaciente && (
              <Seccion titulo="Ficha del paciente" subtitulo="Se guarda en la tabla pacientes, ligada a la cuenta." icono="heartbeat">
                <View style={{ gap: 6 }}>
                  <Text style={s.etiqueta}>Fecha de nacimiento</Text>
                  <SelectorFecha value={f.fechaNacimiento} onChange={set("fechaNacimiento")} max={hoyISO()} placeholder="Fecha de nacimiento" />
                  {errores.fecha ? <Text style={{ color: C.peligro, fontSize: 12 }}>{errores.fecha}</Text> : null}
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={s.etiqueta}>Género</Text>
                  <View style={s.chips}>
                    {["Femenino", "Masculino", "Otro"].map((g) => (
                      <Chip key={g} texto={g} activo={f.genero === g} onPress={() => set("genero")(f.genero === g ? "" : g)} />
                    ))}
                  </View>
                </View>
                <Campo etiqueta="Dirección" valor={f.direccion} onChange={set("direccion")} multilinea placeholder="Calle, número, colonia, municipio" autoCapitalize="sentences" ayuda="Opcional" />
              </Seccion>
            )}

            {rolId !== null && !esDoctor && !esPaciente && (
              <View style={s.nota}>
                <FontAwesome name="info-circle" size={16} color={C.primario} />
                <Text style={s.notaTexto}>
                  El rol <Text style={{ fontWeight: "800" }}>{rolActual?.nombre}</Text> solo necesita los datos de cuenta; no requiere perfil adicional.
                </Text>
              </View>
            )}

            {/* Resumen y acciones */}
            <Seccion titulo="Resumen" icono="check-square-o" derecha={<Text style={s.progreso}>{completados}/{checklist.length}</Text>}>
              <View style={s.barraFondo}>
                <View style={[s.barra, { width: `${(completados / checklist.length) * 100}%` }]} />
              </View>
              <View style={{ gap: 6 }}>
                {checklist.map((c) => (
                  <View key={c.texto} style={s.checkFila}>
                    <FontAwesome name={c.ok ? "check-circle" : "circle-o"} size={15} color={c.ok ? C.ok : C.placeholder} />
                    <Text style={{ fontSize: 13, color: c.ok ? C.texto : C.suave }}>{c.texto}</Text>
                  </View>
                ))}
              </View>

              {errorGeneral ? <Aviso tipo="error" texto={errorGeneral} onCerrar={() => setErrorGeneral("")} /> : null}

              <View style={s.acciones}>
                <Boton texto="Cancelar" variante="fantasma" onPress={() => router.replace("/admin/usuarios")} />
                <Boton texto="Registrar usuario" icono="user-plus" cargando={guardando} onPress={guardar} />
              </View>
            </Seccion>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48, alignItems: "center" },
  pagina: { width: "100%", maxWidth: 1180, gap: 16 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 14 },
  volver: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.borde, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 24, fontWeight: "800", color: C.oscuro },
  subtitulo: { fontSize: 13.5, color: C.suave, marginTop: 2 },
  columnas: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 16 },
  columna: { flexShrink: 1, flexBasis: 340, minWidth: 0, gap: 16 },
  columnaIzq: { flexGrow: 1.1 },
  columnaDer: { flexGrow: 1 },
  dosCampos: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  mitad: { flexGrow: 1, flexShrink: 1, flexBasis: 210, minWidth: 0 },
  etiqueta: { fontSize: 13, fontWeight: "700", color: C.texto },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suave: { fontSize: 13, color: C.suave },
  cargando: { flexDirection: "row", alignItems: "center", gap: 10 },

  roles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  rol: { flexGrow: 1, flexBasis: 160, minWidth: 150, maxWidth: 260, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.borde, backgroundColor: "#FBFDFC", gap: 6 },
  rolActivo: { borderColor: C.primario, backgroundColor: C.tinte },
  rolIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.tinte, alignItems: "center", justifyContent: "center" },
  rolNombre: { fontSize: 14.5, fontWeight: "800", color: C.oscuro },
  rolDesc: { fontSize: 12, color: C.suave, lineHeight: 16 },

  fuerzaBarras: { flexDirection: "row", gap: 6 },
  fuerzaBarra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.bordeSuave },
  fuerzaFila: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },

  vacio: { alignItems: "center", gap: 10, padding: 28, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.borde },
  vacioTexto: { fontSize: 13.5, color: C.suave, textAlign: "center", lineHeight: 20 },
  nota: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 14, backgroundColor: C.tinte, alignItems: "flex-start" },
  notaTexto: { flex: 1, fontSize: 13.5, color: C.texto, lineHeight: 20 },

  progreso: { fontSize: 13, fontWeight: "800", color: C.primario },
  barraFondo: { height: 6, borderRadius: 3, backgroundColor: C.bordeSuave, overflow: "hidden" },
  barra: { height: 6, borderRadius: 3, backgroundColor: C.primario },
  checkFila: { flexDirection: "row", alignItems: "center", gap: 10 },
  acciones: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },

  exitoPagina: { flex: 1, backgroundColor: C.fondo, alignItems: "center", justifyContent: "center", padding: 20 },
  exitoTarjeta: { width: "100%", maxWidth: 460, backgroundColor: C.tarjeta, borderRadius: 22, borderWidth: 1, borderColor: C.borde, padding: 32, alignItems: "center", gap: 12 },
  exitoIcono: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.ok, alignItems: "center", justifyContent: "center" },
  exitoTitulo: { fontSize: 22, fontWeight: "800", color: C.oscuro },
  exitoTexto: { fontSize: 14.5, color: C.suave, textAlign: "center", lineHeight: 22 },
  exitoAcciones: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
});
