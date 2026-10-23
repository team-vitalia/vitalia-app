/**
 * Usuarios — tabla administrativa (tablet / laptop).
 *  - Búsqueda global + filtros por rol, estado y especialidad
 *  - Orden por columna, paginación (10/25/50) y scroll horizontal limpio
 *  - Columnas prioritarias: en pantallas angostas se ocultan Contacto y Último acceso
 *  - Acciones rápidas: ver detalle, editar, restablecer contraseña, activar/desactivar
 */
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import PanelUsuario, { PestanaPanel } from "../../../components/admin/PanelUsuario";
import { Avatar, Aviso, Boton, BotonIcono, C, Campo, Chip, fechaLegible, Insignia, Selector } from "../../../components/admin/ui";
import { useAuth } from "../../../context/AuthContext";
import {
  cambiarEstadoUsuario,
  listarUsuarios,
  permisosSobre,
  UsuarioFila,
} from "../../../services/usuariosService";
import { mensajeError } from "../../../services/util";

type Campo_ = "nombre" | "rol" | "estado" | "ultimo_acceso";

const TONO_ROL: Record<number, "primario" | "ok" | "neutro" | "aviso"> = { 1: "primario", 2: "ok", 3: "neutro", 4: "aviso", 5: "primario" };
const TAM_PAGINA = [10, 25, 50];
const TODOS = "todos";

const esActivo = (u: UsuarioFila) => (u.estado ?? "").toLowerCase() === "activo";
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* Anchos de columna (px). El total define el ancho mínimo del scroll horizontal. */
const COL = { usuario: 280, rol: 130, especialidad: 220, contacto: 190, estado: 110, acceso: 150, acciones: 170 };

export default function UsuariosScreen() {
  const router = useRouter();
  const { token, usuario: actor } = useAuth();
  const [anchoDisp, setAnchoDisp] = useState(0);
  const rolActor = actor?.rol_id ?? actor?.rol_id_FK;

  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [fRol, setFRol] = useState(TODOS);
  const [fEstado, setFEstado] = useState(TODOS);
  const [fEsp, setFEsp] = useState(TODOS);
  const [orden, setOrden] = useState<{ campo: Campo_; dir: "asc" | "desc" }>({ campo: "nombre", dir: "asc" });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const [panel, setPanel] = useState<{ id: number; tab: PestanaPanel } | null>(null);
  const [confirmar, setConfirmar] = useState<UsuarioFila | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [toast, setToast] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // Núcleo (usuario+rol+especialidad+estado+acciones) ≈ 910 px; cada columna extra se suma si cabe.
  const verContacto = anchoDisp >= 910 + COL.contacto;
  const verAcceso = anchoDisp >= 910 + COL.contacto + COL.acceso;

  /* ── Carga ── */
  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");
      setUsuarios(await listarUsuarios(token));
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar el listado de usuarios."));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargar();
  }, [token, cargar]);

  // El toast se oculta solo.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // Cualquier cambio de filtro vuelve a la página 1.
  useEffect(() => setPagina(1), [busqueda, fRol, fEstado, fEsp, porPagina]);

  /* ── Opciones de filtro derivadas de los datos (sin llamadas extra) ── */
  const opcionesRol = useMemo(() => {
    const m = new Map<number, string>();
    usuarios.forEach((u) => u.rol_id_FK != null && u.rol && m.set(u.rol_id_FK, u.rol));
    return [{ valor: TODOS, etiqueta: "Todos los roles" }, ...[...m].sort((a, b) => a[0] - b[0]).map(([id, n]) => ({ valor: String(id), etiqueta: n }))];
  }, [usuarios]);

  const opcionesEsp = useMemo(() => {
    const m = new Map<number, string>();
    usuarios.forEach((u) => u.especialidades.forEach((e) => m.set(e.id_PK, e.nombre)));
    return [{ valor: TODOS, etiqueta: "Todas las especialidades" }, ...[...m].sort((a, b) => a[1].localeCompare(b[1])).map(([id, n]) => ({ valor: String(id), etiqueta: n }))];
  }, [usuarios]);

  /* ── Filtrado + orden ── */
  const filtrados = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    const lista = usuarios.filter((u) => {
      if (fRol !== TODOS && String(u.rol_id_FK) !== fRol) return false;
      if (fEstado !== TODOS && esActivo(u) !== (fEstado === "activo")) return false;
      if (fEsp !== TODOS && !u.especialidades.some((e) => String(e.id_PK) === fEsp)) return false;
      if (!q) return true;
      const pajar = sinAcentos([u.nombre, u.correo_electronico, u.telefono, u.numero_licencia, u.rol, ...u.especialidades.map((e) => e.nombre)].filter(Boolean).join(" "));
      return pajar.includes(q);
    });

    const clave = (u: UsuarioFila): string | number => {
      switch (orden.campo) {
        case "rol": return sinAcentos(u.rol ?? "");
        case "estado": return esActivo(u) ? 0 : 1;
        case "ultimo_acceso": return u.ultimo_acceso ? new Date(u.ultimo_acceso).getTime() : 0;
        default: return sinAcentos(u.nombre);
      }
    };
    const signo = orden.dir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const x = clave(a), y = clave(b);
      return (x < y ? -1 : x > y ? 1 : 0) * signo;
    });
  }, [usuarios, busqueda, fRol, fEstado, fEsp, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);
  const desde = filtrados.length === 0 ? 0 : (paginaSegura - 1) * porPagina + 1;
  const hasta = Math.min(paginaSegura * porPagina, filtrados.length);

  const hayFiltros = busqueda !== "" || fRol !== TODOS || fEstado !== TODOS || fEsp !== TODOS;
  const limpiar = () => { setBusqueda(""); setFRol(TODOS); setFEstado(TODOS); setFEsp(TODOS); };

  const activos = usuarios.filter(esActivo).length;
  const doctores = usuarios.filter((u) => u.rol_id_FK === 2).length;

  const ordenarPor = (campo: Campo_) =>
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" }));

  /* ── Activar / desactivar ── */
  const confirmarCambioEstado = async () => {
    if (!confirmar) return;
    const activar = !esActivo(confirmar);
    try {
      setCambiando(true);
      await cambiarEstadoUsuario(confirmar.id_PK, activar ? "activo" : "inactivo", token);
      setToast({ tipo: "ok", texto: `${confirmar.nombre} ${activar ? "activado" : "desactivado"} correctamente.` });
      setConfirmar(null);
      cargar();
    } catch (e) {
      setToast({ tipo: "error", texto: mensajeError(e, "No se pudo cambiar el estado.") });
      setConfirmar(null);
    } finally {
      setCambiando(false);
    }
  };

  /* ── Páginas visibles (ventana de 5) ── */
  const paginas = useMemo(() => {
    const ini = Math.max(1, Math.min(paginaSegura - 2, totalPaginas - 4));
    const fin = Math.min(totalPaginas, ini + 4);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  }, [paginaSegura, totalPaginas]);

  const anchoTabla = COL.usuario + COL.rol + COL.especialidad + COL.estado + COL.acciones + (verContacto ? COL.contacto : 0) + (verAcceso ? COL.acceso : 0);

  const usuarioPanel = panel ? usuarios.find((u) => u.id_PK === panel.id) ?? null : null;

  if (rolActor !== 1 && rolActor !== 5) {
    return (
      <View style={s.centro}>
        <Aviso tipo="aviso" texto="Solo el administrador o el coordinador pueden gestionar usuarios." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.pagina}>
          {/* Encabezado */}
          <View style={s.cabecera}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Text style={s.titulo}>Usuarios</Text>
              <Text style={s.subtitulo}>Administra cuentas, roles, perfiles médicos y accesos.</Text>
            </View>
            <View style={s.cabeceraAcciones}>
              <Boton texto="Especialidades" icono="stethoscope" variante="secundario" onPress={() => router.push("/admin/especialidades")} />
              <Boton texto="Nuevo usuario" icono="user-plus" onPress={() => router.push("/admin/usuarios/crear")} />
            </View>
          </View>

          {/* Indicadores */}
          <View style={s.kpis}>
            {[
              { n: usuarios.length, t: "Total", i: "users" as const },
              { n: activos, t: "Activos", i: "check-circle" as const },
              { n: usuarios.length - activos, t: "Inactivos", i: "ban" as const },
              { n: doctores, t: "Doctores", i: "user-md" as const },
            ].map((k) => (
              <View key={k.t} style={s.kpi}>
                <View style={s.kpiIcono}><FontAwesome name={k.i} size={14} color={C.primario} /></View>
                <View>
                  <Text style={s.kpiNum}>{cargando ? "–" : k.n}</Text>
                  <Text style={s.kpiTxt}>{k.t}</Text>
                </View>
              </View>
            ))}
          </View>

          {toast && <Aviso tipo={toast.tipo} texto={toast.texto} onCerrar={() => setToast(null)} />}

          {/* Barra de herramientas */}
          <View style={s.herramientas}>
            <View style={{ flex: 1, minWidth: 240 }}>
              <Campo etiqueta="Buscar" valor={busqueda} onChange={setBusqueda} placeholder="Nombre, correo, teléfono, licencia o especialidad…" icono="search" autoCapitalize="none" />
            </View>
            <Selector etiqueta="Rol" valor={fRol} opciones={opcionesRol} onChange={setFRol} compacto icono="id-badge" />
            <Selector etiqueta="Estado" valor={fEstado} opciones={[{ valor: TODOS, etiqueta: "Todos los estados" }, { valor: "activo", etiqueta: "Activos" }, { valor: "inactivo", etiqueta: "Inactivos" }]} onChange={setFEstado} compacto icono="toggle-on" />
            <Selector etiqueta="Especialidad" valor={fEsp} opciones={opcionesEsp} onChange={setFEsp} compacto icono="stethoscope" deshabilitado={opcionesEsp.length <= 1} />
          </View>

          {hayFiltros && (
            <View style={s.filtrosActivos}>
              <Text style={s.suave}>{filtrados.length} resultado{filtrados.length === 1 ? "" : "s"} con los filtros aplicados</Text>
              <Boton texto="Limpiar filtros" icono="times" variante="fantasma" chico onPress={limpiar} />
            </View>
          )}

          {/* Tabla */}
          <View style={s.tabla} onLayout={(e) => setAnchoDisp(e.nativeEvent.layout.width)}>
            {cargando ? (
              <View style={s.estado}><ActivityIndicator size="large" color={C.primario} /><Text style={s.suave}>Cargando usuarios…</Text></View>
            ) : error ? (
              <View style={s.estado}>
                <Aviso tipo="error" texto={error} />
                <Boton texto="Reintentar" icono="refresh" variante="secundario" onPress={cargar} />
              </View>
            ) : filtrados.length === 0 ? (
              <View style={s.estado}>
                <FontAwesome name="search" size={28} color={C.placeholder} />
                <Text style={s.vacioTitulo}>{hayFiltros ? "Sin resultados" : "Aún no hay usuarios"}</Text>
                <Text style={s.suave}>{hayFiltros ? "Prueba con otra búsqueda o quita algún filtro." : "Registra el primero con “Nuevo usuario”."}</Text>
                {hayFiltros && <Boton texto="Limpiar filtros" variante="secundario" chico onPress={limpiar} />}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: Math.max(anchoTabla, 0), flexGrow: 1 }}>
                <View style={{ flex: 1, minWidth: anchoTabla }}>
                  {/* Cabecera de columnas */}
                  <View style={s.fila}>
                    <Encabezado texto="Usuario" ancho={COL.usuario} campo="nombre" orden={orden} onPress={ordenarPor} flex />
                    <Encabezado texto="Rol" ancho={COL.rol} campo="rol" orden={orden} onPress={ordenarPor} />
                    <Encabezado texto="Especialidades" ancho={COL.especialidad} />
                    {verContacto && <Encabezado texto="Contacto" ancho={COL.contacto} />}
                    <Encabezado texto="Estado" ancho={COL.estado} campo="estado" orden={orden} onPress={ordenarPor} />
                    {verAcceso && <Encabezado texto="Último acceso" ancho={COL.acceso} campo="ultimo_acceso" orden={orden} onPress={ordenarPor} />}
                    <Encabezado texto="Acciones" ancho={COL.acciones} derecha />
                  </View>

                  {visibles.map((u) => (
                    <FilaUsuario
                      key={u.id_PK}
                      u={u}
                      verContacto={verContacto}
                      verAcceso={verAcceso}
                      permisos={permisosSobre(u, rolActor, (actor?.id ?? actor?.id_PK))}
                      onVer={() => setPanel({ id: u.id_PK, tab: "detalle" })}
                      onEditar={() => setPanel({ id: u.id_PK, tab: "editar" })}
                      onSeguridad={() => setPanel({ id: u.id_PK, tab: "seguridad" })}
                      onEstado={() => setConfirmar(u)}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Paginación */}
          {!cargando && !error && filtrados.length > 0 && (
            <View style={s.paginacion}>
              <Text style={s.suave}>Mostrando {desde}–{hasta} de {filtrados.length}</Text>

              <View style={s.paginas}>
                <BotonIcono icono="angle-left" etiqueta="Página anterior" onPress={() => setPagina(paginaSegura - 1)} deshabilitado={paginaSegura <= 1} />
                {paginas.map((p) => (
                  <Pressable key={p} onPress={() => setPagina(p)} accessibilityRole="button" accessibilityLabel={`Página ${p}`} accessibilityState={{ selected: p === paginaSegura }} style={[s.pag, p === paginaSegura && s.pagActiva]}>
                    <Text style={[s.pagTxt, p === paginaSegura && { color: "#FFFFFF" }]}>{p}</Text>
                  </Pressable>
                ))}
                <BotonIcono icono="angle-right" etiqueta="Página siguiente" onPress={() => setPagina(paginaSegura + 1)} deshabilitado={paginaSegura >= totalPaginas} />
              </View>

              <View style={s.porPagina}>
                <Text style={s.suave}>Filas:</Text>
                {TAM_PAGINA.map((n) => <Chip key={n} texto={String(n)} activo={n === porPagina} onPress={() => setPorPagina(n)} />)}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Panel lateral */}
      <PanelUsuario usuario={usuarioPanel} pestanaInicial={panel?.tab ?? "detalle"} onCerrar={() => setPanel(null)} onCambio={cargar} />

      {/* Confirmar activar / desactivar */}
      <Modal visible={!!confirmar} transparent animationType="fade" onRequestClose={() => setConfirmar(null)}>
        <Pressable style={s.modalFondo} onPress={() => !cambiando && setConfirmar(null)}>
          <Pressable style={s.modal} onPress={() => undefined}>
            {confirmar && (
              <>
                <View style={[s.modalIcono, { backgroundColor: esActivo(confirmar) ? C.peligroFondo : C.okFondo }]}>
                  <FontAwesome name="power-off" size={22} color={esActivo(confirmar) ? C.peligro : C.ok} />
                </View>
                <Text style={s.modalTitulo}>{esActivo(confirmar) ? "¿Desactivar cuenta?" : "¿Activar cuenta?"}</Text>
                <Text style={s.modalTexto}>
                  <Text style={{ fontWeight: "800", color: C.oscuro }}>{confirmar.nombre}</Text>{" "}
                  {esActivo(confirmar) ? "no podrá iniciar sesión hasta que la reactives." : "podrá volver a iniciar sesión."}
                </Text>
                <View style={s.modalAcciones}>
                  <Boton texto="Cancelar" variante="secundario" deshabilitado={cambiando} onPress={() => setConfirmar(null)} />
                  <Boton texto={esActivo(confirmar) ? "Desactivar" : "Activar"} variante={esActivo(confirmar) ? "peligro" : "primario"} cargando={cambiando} onPress={confirmarCambioEstado} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ───────────────────────── Encabezado de columna ───────────────────────── */

function Encabezado({
  texto, ancho, campo, orden, onPress, flex, derecha,
}: {
  texto: string;
  ancho: number;
  campo?: Campo_;
  orden?: { campo: Campo_; dir: "asc" | "desc" };
  onPress?: (c: Campo_) => void;
  flex?: boolean;
  derecha?: boolean;
}) {
  const activo = campo && orden?.campo === campo;
  const contenido = (
    <>
      <Text style={[s.thTxt, activo && { color: C.primario }]}>{texto}</Text>
      {campo && <FontAwesome name={activo ? (orden!.dir === "asc" ? "sort-asc" : "sort-desc") : "sort"} size={11} color={activo ? C.primario : C.placeholder} />}
    </>
  );
  const estilo = [s.th, flex ? { flex: 1, minWidth: ancho } : { width: ancho }, derecha && { justifyContent: "flex-end" as const }];

  return campo && onPress ? (
    <Pressable onPress={() => onPress(campo)} accessibilityRole="button" accessibilityLabel={`Ordenar por ${texto}`} style={estilo}>{contenido}</Pressable>
  ) : (
    <View style={estilo}>{contenido}</View>
  );
}

/* ───────────────────────── Fila ───────────────────────── */

function FilaUsuario({
  u, verContacto, verAcceso, permisos, onVer, onEditar, onSeguridad, onEstado,
}: {
  u: UsuarioFila;
  verContacto: boolean;
  verAcceso: boolean;
  permisos: ReturnType<typeof permisosSobre>;
  onVer: () => void;
  onEditar: () => void;
  onSeguridad: () => void;
  onEstado: () => void;
}) {
  const [hover, setHover] = useState(false);
  const activo = esActivo(u);
  const maxEsp = 2;
  const extra = u.especialidades.length - maxEsp;

  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={onVer}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${u.nombre}`}
      style={[s.fila, s.filaDato, hover && { backgroundColor: C.fondo }, !activo && { opacity: 0.78 }]}
    >
      <View style={[s.td, { flex: 1, minWidth: COL.usuario, flexDirection: "row", gap: 12 }]}>
        <Avatar nombre={u.nombre} />
        <View style={{ flex: 1 }}>
          <Text style={s.tdNombre} numberOfLines={1}>{u.nombre}{permisos.esPropio ? "  (tú)" : ""}</Text>
          <Text style={s.tdSub} numberOfLines={1}>{u.correo_electronico}</Text>
        </View>
      </View>

      <View style={[s.td, { width: COL.rol }]}>
        <Insignia texto={u.rol ?? "Sin rol"} tono={TONO_ROL[u.rol_id_FK ?? 0] ?? "neutro"} />
      </View>

      <View style={[s.td, { width: COL.especialidad, flexWrap: "wrap", gap: 6, flexDirection: "row" }]}>
        {u.rol_id_FK !== 2 ? (
          <Text style={s.tdSub}>—</Text>
        ) : u.especialidades.length === 0 ? (
          <Insignia texto="Sin asignar" tono="aviso" />
        ) : (
          <>
            {u.especialidades.slice(0, maxEsp).map((e) => <Insignia key={e.id_PK} texto={e.nombre} tono="primario" />)}
            {extra > 0 && <Insignia texto={`+${extra}`} tono="neutro" />}
          </>
        )}
      </View>

      {verContacto && (
        <View style={[s.td, { width: COL.contacto }]}>
          <Text style={s.tdSub} numberOfLines={1}>{u.telefono || "Sin teléfono"}</Text>
        </View>
      )}

      <View style={[s.td, { width: COL.estado }]}>
        <Insignia texto={activo ? "Activo" : "Inactivo"} tono={activo ? "ok" : "peligro"} />
      </View>

      {verAcceso && (
        <View style={[s.td, { width: COL.acceso }]}>
          <Text style={s.tdSub}>{u.ultimo_acceso ? fechaLegible(u.ultimo_acceso, true) : "Nunca"}</Text>
        </View>
      )}

      <View style={[s.td, { width: COL.acciones, justifyContent: "flex-end", flexDirection: "row", gap: 2 }]}>
        <BotonIcono icono="eye" etiqueta="Ver detalle" onPress={onVer} />
        <BotonIcono icono="pencil" etiqueta={permisos.puedeEditar ? "Editar" : "Sin permiso para editar"} onPress={onEditar} deshabilitado={!permisos.puedeEditar} />
        <BotonIcono icono="key" etiqueta="Restablecer contraseña" onPress={onSeguridad} deshabilitado={!permisos.puedeEditar} />
        <BotonIcono
          icono="power-off"
          etiqueta={!permisos.puedeCambiarEstado ? (permisos.esPropio ? "No puedes desactivar tu cuenta" : "Sin permiso") : activo ? "Desactivar" : "Activar"}
          tono={activo ? "peligro" : "ok"}
          onPress={onEstado}
          deshabilitado={!permisos.puedeCambiarEstado}
        />
      </View>
    </Pressable>
  );
}

/* ───────────────────────── Estilos ───────────────────────── */

const s = StyleSheet.create({
  centro: { flex: 1, backgroundColor: C.fondo, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 20, paddingBottom: 48, alignItems: "center" },
  pagina: { width: "100%", maxWidth: 1400, gap: 16 },

  cabecera: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 14 },
  cabeceraAcciones: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  titulo: { fontSize: 26, fontWeight: "800", color: C.oscuro },
  subtitulo: { fontSize: 13.5, color: C.suave, marginTop: 2 },

  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: { flexGrow: 1, flexBasis: 150, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.borde, borderRadius: 14, padding: 14 },
  kpiIcono: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.tinte, alignItems: "center", justifyContent: "center" },
  kpiNum: { fontSize: 20, fontWeight: "800", color: C.oscuro },
  kpiTxt: { fontSize: 12, color: C.suave, fontWeight: "600" },

  herramientas: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-end", backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.borde, borderRadius: 16, padding: 14 },
  filtrosActivos: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  suave: { fontSize: 13, color: C.suave },

  tabla: { backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.borde, borderRadius: 16, overflow: "hidden", minHeight: 180 },
  estado: { alignItems: "center", justifyContent: "center", gap: 12, padding: 48 },
  vacioTitulo: { fontSize: 17, fontWeight: "800", color: C.oscuro },

  fila: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  filaDato: { borderTopWidth: 1, borderTopColor: C.bordeSuave, minHeight: 66, paddingVertical: 8 },
  th: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 13 },
  thTxt: { fontSize: 11.5, fontWeight: "800", color: C.suave, letterSpacing: 0.5, textTransform: "uppercase" },
  td: { paddingHorizontal: 8, justifyContent: "flex-start", flexDirection: "row", alignItems: "center" },
  tdNombre: { fontSize: 14.5, fontWeight: "700", color: C.oscuro },
  tdSub: { fontSize: 13, color: C.suave },

  paginacion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  paginas: { flexDirection: "row", alignItems: "center", gap: 4 },
  pag: { minWidth: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  pagActiva: { backgroundColor: C.primario },
  pagTxt: { fontSize: 13.5, fontWeight: "700", color: C.texto },
  porPagina: { flexDirection: "row", alignItems: "center", gap: 6 },

  modalFondo: { flex: 1, backgroundColor: "rgba(23,63,58,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 400, backgroundColor: C.tarjeta, borderRadius: 22, padding: 26, alignItems: "center", gap: 12 },
  modalIcono: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalTitulo: { fontSize: 19, fontWeight: "800", color: C.oscuro },
  modalTexto: { fontSize: 14, color: C.suave, textAlign: "center", lineHeight: 21 },
  modalAcciones: { flexDirection: "row", gap: 10, marginTop: 6 },
});
