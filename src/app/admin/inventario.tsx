import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  ConfirmarModal,
  Etiqueta,
  ModalBase,
  Opciones,
  PantallaC2,
  Paginador,
  Tarjeta,
  Vacio,
  useC2Colors,
} from "../../components/c2/ui";
import { CrownSvg, UpgradeModal } from "../../components/UpgradeModal";
import { useAuth } from "../../context/AuthContext";
import {
  actualizarMedicamento,
  crearMedicamento,
  descargarPlantillaMedicamentos,
  eliminarMedicamento,
  exportarMedicamentos,
  getCatalogoMedicamentos,
  importarMedicamentos,
  Medicamento,
  ModoImportacion,
  ResultadoImportacion,
  TipoArticulo,
} from "../../services/almacenService";
import { mensajeError, type PageMeta } from "../../services/c2Service";
import { elegirExcel, guardarArchivo, MIME_PDF, MIME_XLSX } from "../../utils/archivos";

const POR_PAGINA = 15;
const MAX_ERRORES_VISIBLES = 50;

type FiltroTipo = TipoArticulo | "todos";

const FILTROS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "medicamento", etiqueta: "Medicamentos" },
  { valor: "insumo", etiqueta: "Insumos" },
  { valor: "equipo", etiqueta: "Equipo" },
  { valor: "todos", etiqueta: "Todos" },
];

const TIPOS: { valor: TipoArticulo; etiqueta: string }[] = [
  { valor: "medicamento", etiqueta: "Medicamento" },
  { valor: "insumo", etiqueta: "Insumo" },
  { valor: "equipo", etiqueta: "Equipo" },
];

/** Errores de axios → mensaje del backend; errores locales (archivo, compartir…) → su propio mensaje. */
function textoError(e: unknown, porDefecto: string): string {
  const err = e as { isAxiosError?: boolean; message?: string } | null;
  if (err?.isAxiosError) return mensajeError(e, porDefecto);
  return err instanceof Error && err.message ? err.message : porDefecto;
}

/* ============================================================
   Pantalla (control de plan)
============================================================ */
export default function MedicamentosScreen() {
  const { planActual } = useAuth();
  const [modalUpgrade, setModalUpgrade] = useState(false);

  const plan = (planActual?.nombre_plan || "basico")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const tieneAcceso = plan === "profesional" || plan === "empresarial";

  return (
    <PantallaC2
      titulo="Medicamentos"
      subtitulo="Catálogo de la clínica: altas, edición, baja, importación y exportación"
      roles={[1, 6]}
    >
      {tieneAcceso ? (
        <Catalogo />
      ) : (
        <>
          <BloqueoPlan onVerPlanes={() => setModalUpgrade(true)} />
          <UpgradeModal
            visible={modalUpgrade}
            modulo="Medicamentos"
            planRequerido="Profesional"
            descripcion="El catálogo de medicamentos, el control de existencias y las alertas de caducidad están disponibles a partir del Plan Profesional. Actualiza tu suscripción para desbloquear el módulo de almacén."
            onClose={() => setModalUpgrade(false)}
          />
        </>
      )}
    </PantallaC2>
  );
}

function BloqueoPlan({ onVerPlanes }: { onVerPlanes: () => void }) {
  const { c } = useC2Colors();
  return (
    <Tarjeta style={{ alignItems: "center", paddingVertical: 28, gap: 12 }}>
      <CrownSvg size={36} color="#FBBF24" />
      <Etiqueta texto="FUNCIÓN EXCLUSIVA PLAN PROFESIONAL" tono="warn" />
      <Text style={[s.centrado, s.tituloBloqueo, { color: c.text }]}>Catálogo de medicamentos</Text>
      <Text style={[s.centrado, { color: c.muted }]}>
        Administra el catálogo de fármacos, importa y exporta en Excel y obtén la lista en PDF.
      </Text>
      <Boton texto="Ver planes de mejora" onPress={onVerPlanes} />
    </Tarjeta>
  );
}

/* ============================================================
   Catálogo (CRUD + Excel + PDF)
============================================================ */
type Formulario = {
  nombre: string;
  principio_activo: string;
  presentacion: string;
  categoria: string;
  unidad_medida: string;
  stock_minimo: string;
  codigo_barras: string;
  descripcion: string;
  tipo_articulo: TipoArticulo;
  requiere_receta: boolean;
};

const FORM_VACIO: Formulario = {
  nombre: "",
  principio_activo: "",
  presentacion: "",
  categoria: "",
  unidad_medida: "",
  stock_minimo: "",
  codigo_barras: "",
  descripcion: "",
  tipo_articulo: "medicamento",
  requiere_receta: false,
};

function formularioDe(m: Medicamento): Formulario {
  return {
    nombre: m.nombre ?? "",
    principio_activo: m.principio_activo ?? "",
    presentacion: m.presentacion ?? "",
    categoria: m.categoria ?? "",
    unidad_medida: m.unidad_medida ?? "",
    stock_minimo: m.stock_minimo ? String(m.stock_minimo) : "",
    codigo_barras: m.codigo_barras ?? "",
    descripcion: m.descripcion ?? "",
    tipo_articulo: m.tipo_articulo ?? "medicamento",
    requiere_receta: !!m.requiere_receta,
  };
}

/** Devuelve el primer error del formulario o "" si es válido (mismos límites que el backend). */
function validar(f: Formulario): string {
  if (!f.nombre.trim()) return "Escribe el nombre del medicamento.";
  if (f.nombre.trim().length > 200) return "El nombre admite máximo 200 caracteres.";
  if (f.principio_activo.trim().length > 200) return "El principio activo admite máximo 200 caracteres.";
  if (f.presentacion.trim().length > 100) return "La presentación admite máximo 100 caracteres.";
  if (f.categoria.trim().length > 100) return "La categoría admite máximo 100 caracteres.";
  if (f.unidad_medida.trim().length > 30) return "La unidad de medida admite máximo 30 caracteres.";
  if (f.codigo_barras.trim().length > 100) return "El código de barras admite máximo 100 caracteres.";
  if (f.stock_minimo.trim() && !/^\d+$/.test(f.stock_minimo.trim())) {
    return "El stock mínimo debe ser un número entero mayor o igual a 0.";
  }
  return "";
}

function Catalogo() {
  const { c } = useC2Colors();

  const [lista, setLista] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroTipo>("medicamento");
  const [pagina, setPagina] = useState(1);

  // Alta / edición
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VACIO);
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Baja
  const [porEliminar, setPorEliminar] = useState<Medicamento | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Excel / PDF
  const [generando, setGenerando] = useState<"excel" | "pdf" | "plantilla" | null>(null);
  const [importAbierto, setImportAbierto] = useState(false);
  const [modo, setModo] = useState<ModoImportacion>("omitir");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [errorImport, setErrorImport] = useState("");

  // La búsqueda se manda al servidor con un pequeño retraso para no consultar en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const peticion = useRef(0);
  const cargar = useCallback(async () => {
    const mia = ++peticion.current;
    setCargando(true);
    try {
      const datos = await getCatalogoMedicamentos(q, filtro === "todos" ? undefined : filtro);
      if (mia !== peticion.current) return; // llegó una consulta más reciente
      setLista(datos);
      setError("");
    } catch (e) {
      if (mia !== peticion.current) return;
      setError(textoError(e, "No se pudo cargar el catálogo de medicamentos."));
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  }, [q, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = lista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const meta: PageMeta = { total: lista.length, page: paginaActual, page_size: POR_PAGINA, pages: paginas };

  const filtroActual = { q: q || undefined, tipo: filtro === "todos" ? undefined : filtro };

  /* ---------------- Alta / edición ---------------- */
  const abrirAlta = () => {
    setEditandoId(null);
    setForm({ ...FORM_VACIO, tipo_articulo: filtro === "todos" ? "medicamento" : filtro });
    setErrorForm("");
    setFormAbierto(true);
  };

  const abrirEdicion = (m: Medicamento) => {
    setEditandoId(m.id_PK);
    setForm(formularioDe(m));
    setErrorForm("");
    setFormAbierto(true);
  };

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async () => {
    const problema = validar(form);
    if (problema) {
      setErrorForm(problema);
      return;
    }
    const datos = {
      nombre: form.nombre,
      principio_activo: form.principio_activo,
      presentacion: form.presentacion,
      categoria: form.categoria,
      unidad_medida: form.unidad_medida,
      codigo_barras: form.codigo_barras,
      descripcion: form.descripcion,
      tipo_articulo: form.tipo_articulo,
      // Los insumos y el equipo no se recetan
      requiere_receta: form.tipo_articulo === "medicamento" ? form.requiere_receta : false,
      stock_minimo: parseInt(form.stock_minimo, 10) || 0,
    };
    try {
      setGuardando(true);
      if (editandoId) await actualizarMedicamento(editandoId, datos);
      else await crearMedicamento(datos);
      setFormAbierto(false);
      setError("");
      setOk(editandoId ? "Medicamento actualizado correctamente." : "Medicamento registrado correctamente.");
      await cargar();
    } catch (e) {
      setErrorForm(textoError(e, "No se pudo guardar el medicamento."));
    } finally {
      setGuardando(false);
    }
  };

  /* ---------------- Baja ---------------- */
  const confirmarBaja = async () => {
    if (!porEliminar) return;
    try {
      setEliminando(true);
      await eliminarMedicamento(porEliminar.id_PK);
      setOk(`«${porEliminar.nombre}» se eliminó del catálogo.`);
      setError("");
      setPorEliminar(null);
      await cargar();
    } catch (e) {
      // 409: tiene lotes o recetas; se muestra el motivo que da el servidor
      setPorEliminar(null);
      setOk("");
      setError(textoError(e, "No se pudo eliminar el medicamento."));
    } finally {
      setEliminando(false);
    }
  };

  /* ---------------- Excel / PDF ---------------- */
  const descargar = async (que: "excel" | "pdf" | "plantilla") => {
    try {
      setGenerando(que);
      setOk("");
      setError("");
      if (que === "plantilla") {
        await guardarArchivo("plantilla_medicamentos.xlsx", await descargarPlantillaMedicamentos(), MIME_XLSX);
      } else if (que === "excel") {
        await guardarArchivo("medicamentos.xlsx", await exportarMedicamentos("excel", filtroActual), MIME_XLSX);
      } else {
        await guardarArchivo("lista_medicamentos.pdf", await exportarMedicamentos("pdf", filtroActual), MIME_PDF);
      }
      setOk(
        que === "plantilla"
          ? "Plantilla lista: llénala y súbela con «Importar Excel»."
          : que === "excel"
            ? "Excel generado con la lista actual."
            : "PDF generado con la lista actual."
      );
    } catch (e) {
      setError(textoError(e, "No se pudo generar el archivo."));
    } finally {
      setGenerando(null);
    }
  };

  const abrirImportacion = () => {
    setResultado(null);
    setErrorImport("");
    setImportAbierto(true);
  };

  const elegirEImportar = async () => {
    setErrorImport("");
    setResultado(null);
    try {
      const archivo = await elegirExcel();
      if (!archivo) return;
      setImportando(true);
      const r = await importarMedicamentos(archivo.base64, modo);
      setResultado(r);
      if (r.creados || r.actualizados) await cargar();
    } catch (e) {
      setErrorImport(textoError(e, "No se pudo importar el archivo."));
    } finally {
      setImportando(false);
    }
  };

  /* ---------------- Vista ---------------- */
  const ocupado = generando !== null;

  return (
    <>
      {!!ok && <Aviso tipo="ok" texto={ok} />}
      {!!error && <Aviso tipo="error" texto={error} />}

      <Tarjeta style={{ gap: 12 }}>
        <View style={s.fila}>
          <Boton texto="+ Nuevo medicamento" pequeno onPress={abrirAlta} />
          <Boton texto="Importar Excel" pequeno variante="secundario" onPress={abrirImportacion} />
          <Boton
            texto="Exportar Excel"
            pequeno
            variante="secundario"
            cargando={generando === "excel"}
            deshabilitado={ocupado}
            onPress={() => descargar("excel")}
          />
          <Boton
            texto="Exportar PDF"
            pequeno
            variante="secundario"
            cargando={generando === "pdf"}
            deshabilitado={ocupado}
            onPress={() => descargar("pdf")}
          />
        </View>
        <Campo
          etiqueta="Buscar"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Nombre, principio activo o código de barras"
        />
        <Opciones
          opciones={FILTROS}
          valor={filtro}
          onChange={(v) => {
            setFiltro(v);
            setPagina(1);
          }}
        />
        <Text style={[s.nota, { color: c.muted }]}>
          Las exportaciones respetan la búsqueda y el tipo seleccionados. Las existencias y los lotes se
          registran en «Entrada por código de barras».
        </Text>
      </Tarjeta>

      {cargando && lista.length === 0 ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio texto={q ? "Ningún artículo coincide con la búsqueda." : "Aún no hay artículos en el catálogo."} />
      ) : (
        visibles.map((m) => {
          const stock = m.stock_actual ?? 0;
          const minimo = m.stock_minimo ?? 0;
          const tipo = m.tipo_articulo ?? "medicamento";
          return (
            <Tarjeta key={m.id_PK} style={{ gap: 6 }}>
              <Text style={[s.nombre, { color: c.text }]}>{m.nombre}</Text>
              <View style={s.fila}>
                <Etiqueta texto={tipo.charAt(0).toUpperCase() + tipo.slice(1)} tono="info" />
                {tipo === "medicamento" && (
                  <Etiqueta
                    texto={m.requiere_receta ? "Con receta" : "Venta libre"}
                    tono={m.requiere_receta ? "warn" : "neutral"}
                  />
                )}
                {stock <= 0 ? (
                  <Etiqueta texto="Sin existencias" tono="danger" />
                ) : minimo > 0 && stock <= minimo ? (
                  <Etiqueta texto="Stock bajo" tono="warn" />
                ) : (
                  <Etiqueta texto="Disponible" tono="ok" />
                )}
              </View>
              {!!m.principio_activo && <Dato etiqueta="Principio activo" valor={m.principio_activo} />}
              {!!m.presentacion && <Dato etiqueta="Presentación" valor={m.presentacion} />}
              {!!m.categoria && <Dato etiqueta="Categoría" valor={m.categoria} />}
              {!!m.codigo_barras && <Dato etiqueta="Código de barras" valor={m.codigo_barras} />}
              <Dato
                etiqueta="Existencias"
                valor={`${stock}${m.unidad_medida ? ` ${m.unidad_medida}` : ""} · mínimo ${minimo}`}
              />
              <View style={[s.fila, { marginTop: 6 }]}>
                <Boton texto="Editar" pequeno variante="secundario" onPress={() => abrirEdicion(m)} />
                <Boton texto="Eliminar" pequeno variante="peligro" onPress={() => setPorEliminar(m)} />
              </View>
            </Tarjeta>
          );
        })
      )}

      <Paginador meta={meta} onCambiar={setPagina} />

      {/* Alta / edición */}
      <ModalBase
        visible={formAbierto}
        titulo={editandoId ? "Editar medicamento" : "Nuevo medicamento"}
        onClose={() => !guardando && setFormAbierto(false)}
      >
        {!!errorForm && <Aviso tipo="error" texto={errorForm} />}

        <Text style={[s.etiquetaCampo, { color: c.muted }]}>Tipo de artículo</Text>
        <Opciones opciones={TIPOS} valor={form.tipo_articulo} onChange={(v) => cambiar("tipo_articulo", v)} />

        <Campo etiqueta="Nombre *" value={form.nombre} onChangeText={(t) => cambiar("nombre", t)} placeholder="Ej. Paracetamol" />
        <Campo etiqueta="Principio activo" value={form.principio_activo} onChangeText={(t) => cambiar("principio_activo", t)} />
        <Campo
          etiqueta="Presentación"
          value={form.presentacion}
          onChangeText={(t) => cambiar("presentacion", t)}
          placeholder="Ej. 500 mg, caja con 20 tabletas"
        />
        <Campo etiqueta="Categoría" value={form.categoria} onChangeText={(t) => cambiar("categoria", t)} placeholder="Ej. Analgésico" />
        <Campo
          etiqueta="Unidad de medida"
          value={form.unidad_medida}
          onChangeText={(t) => cambiar("unidad_medida", t)}
          placeholder="Ej. caja, pieza, frasco"
        />
        <Campo
          etiqueta="Stock mínimo"
          value={form.stock_minimo}
          onChangeText={(t) => cambiar("stock_minimo", t.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          placeholder="0"
          ayuda="Alerta de reposición. 0 = usar el umbral general."
        />
        <Campo
          etiqueta="Código de barras"
          value={form.codigo_barras}
          onChangeText={(t) => cambiar("codigo_barras", t)}
          placeholder="Opcional (se usa al escanear la entrada)"
        />
        <Campo etiqueta="Descripción" value={form.descripcion} onChangeText={(t) => cambiar("descripcion", t)} multiline />

        {form.tipo_articulo === "medicamento" && (
          <>
            <Text style={[s.etiquetaCampo, { color: c.muted }]}>¿Requiere receta?</Text>
            <Opciones
              opciones={[
                { valor: "no", etiqueta: "No" },
                { valor: "si", etiqueta: "Sí" },
              ]}
              valor={form.requiere_receta ? "si" : "no"}
              onChange={(v) => cambiar("requiere_receta", v === "si")}
            />
          </>
        )}

        <View style={[s.fila, { marginTop: 14, justifyContent: "flex-end" }]}>
          <Boton texto="Cancelar" variante="secundario" deshabilitado={guardando} onPress={() => setFormAbierto(false)} />
          <Boton texto={editandoId ? "Guardar cambios" : "Registrar"} cargando={guardando} onPress={guardar} />
        </View>
      </ModalBase>

      {/* Baja */}
      <ConfirmarModal
        visible={!!porEliminar}
        titulo="Eliminar del catálogo"
        mensaje={`¿Eliminar «${porEliminar?.nombre ?? ""}»? Esta acción no se puede deshacer. Si tiene lotes en almacén o aparece en recetas, el sistema no permitirá eliminarlo.`}
        cargando={eliminando}
        onConfirmar={confirmarBaja}
        onCancelar={() => setPorEliminar(null)}
      />

      {/* Importar Excel */}
      <ModalBase
        visible={importAbierto}
        titulo="Importar medicamentos desde Excel"
        onClose={() => !importando && setImportAbierto(false)}
      >
        <Text style={[s.parrafo, { color: c.muted }]}>
          1. Descarga la plantilla y llénala (una fila por medicamento).{"\n"}
          2. Elige qué hacer con los que ya existen (mismo código de barras, o mismo nombre y presentación).{"\n"}
          3. Sube el archivo .xlsx. Las filas válidas se guardan y las que tengan error se listan con su número de fila.
        </Text>

        <Boton
          texto="Descargar plantilla"
          variante="secundario"
          cargando={generando === "plantilla"}
          deshabilitado={ocupado || importando}
          onPress={() => descargar("plantilla")}
        />

        <Text style={[s.etiquetaCampo, { color: c.muted, marginTop: 14 }]}>Si el medicamento ya existe</Text>
        <Opciones
          opciones={[
            { valor: "omitir", etiqueta: "Omitirlo" },
            { valor: "actualizar", etiqueta: "Actualizarlo" },
          ]}
          valor={modo}
          onChange={setModo}
        />
        <Text style={[s.nota, { color: c.muted }]}>
          {modo === "actualizar"
            ? "Se completan los datos con lo que traiga el archivo; las celdas vacías no borran nada."
            : "Los existentes se dejan sin cambios."}
        </Text>

        <View style={{ marginTop: 14 }}>
          <Boton texto="Elegir archivo e importar" cargando={importando} onPress={elegirEImportar} />
        </View>

        {!!errorImport && (
          <View style={{ marginTop: 12 }}>
            <Aviso tipo="error" texto={errorImport} />
          </View>
        )}

        {resultado && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Aviso
              tipo={resultado.creados || resultado.actualizados ? "ok" : "info"}
              texto={`${resultado.total_filas} fila(s) leída(s): ${resultado.creados} nueva(s), ${resultado.actualizados} actualizada(s), ${resultado.omitidos} omitida(s), ${resultado.errores.length} con error.`}
            />
            {resultado.errores.slice(0, MAX_ERRORES_VISIBLES).map((er) => (
              <Text key={`${er.fila}-${er.mensaje}`} style={[s.nota, { color: c.error }]}>
                Fila {er.fila}: {er.mensaje}
              </Text>
            ))}
            {resultado.errores.length > MAX_ERRORES_VISIBLES && (
              <Text style={[s.nota, { color: c.muted }]}>
                …y {resultado.errores.length - MAX_ERRORES_VISIBLES} error(es) más.
              </Text>
            )}
          </View>
        )}
      </ModalBase>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { c } = useC2Colors();
  return (
    <Text style={[s.dato, { color: c.muted }]}>
      {etiqueta}: <Text style={{ color: c.text, fontWeight: "600" }}>{valor}</Text>
    </Text>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  nombre: { fontSize: 16, fontWeight: "800" },
  dato: { fontSize: 13 },
  nota: { fontSize: 12, lineHeight: 17 },
  parrafo: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  etiquetaCampo: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  centrado: { textAlign: "center" },
  tituloBloqueo: { fontSize: 20, fontWeight: "800" },
});
