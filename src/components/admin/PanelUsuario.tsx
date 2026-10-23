
/**
 * Panel lateral de un usuario con 3 pestañas:
 *   Detalle   → ficha de solo lectura
 *   Editar    → datos de cuenta + perfil médico con validación en vivo
 *   Seguridad → activar/desactivar y recuperación de contraseña (QR / correo)
 * En pantallas anchas se abre como cajón lateral; en angostas ocupa toda la pantalla.
 */
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { solicitarEnlaceCorreo } from "../../services/recuperacionService";
import {
  actualizarDoctor,
  actualizarUsuario,
  cambiarEstadoUsuario,
  CambiosDoctor,
  CambiosUsuario,
  permisosSobre,
  UsuarioFila,
} from "../../services/usuariosService";
import { authHeaders, mensajeError } from "../../services/util";
import EspecialidadSelector from "../EspecialidadSelector";
import QRRecuperacion from "../recuperacion/QRRecuperacion";
import {
  Avatar,
  Aviso,
  Boton,
  C,
  Campo,
  fechaLegible,
  Insignia,
  Pestanas,
  Selector,
} from "./ui";
import { vCorreo, vCosto, vNombre, vTelefono } from "./validaciones";

export type PestanaPanel = "detalle" | "editar" | "seguridad";

interface Props {
  usuario: UsuarioFila | null;
  pestanaInicial: PestanaPanel;
  onCerrar: () => void;
  /** Se llama tras guardar para que el listado se recargue. */
  onCambio: () => void;
}

const ROL_DOCTOR = 2;
const ROL_PACIENTE = 3;

export default function PanelUsuario({
  usuario,
  pestanaInicial,
  onCerrar,
  onCambio,
}: Props) {
  const { width } = useWindowDimensions();
  const [pestana, setPestana] = useState<PestanaPanel>(pestanaInicial);

  useEffect(() => {
    if (usuario) setPestana(pestanaInicial);
  }, [usuario?.id_PK, pestanaInicial]);

  const drawer = width >= 820;

  return (
    <Modal
      visible={!!usuario}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={[s.fondo, drawer && { alignItems: "flex-end" }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCerrar}
          accessibilityLabel="Cerrar panel"
        />

        {usuario && (
          <View style={[s.hoja, drawer ? s.hojaDrawer : s.hojaCompleta]}>
            <View style={s.cabecera}>
              <Avatar nombre={usuario.nombre} tam={44} />

              <View style={{ flex: 1 }}>
                <Text style={s.nombre} numberOfLines={1}>
                  {usuario.nombre}
                </Text>
                <Text style={s.correo} numberOfLines={1}>
                  {usuario.correo_electronico}
                </Text>
              </View>

              <Pressable
                onPress={onCerrar}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={s.cerrar}
              >
                <FontAwesome name="times" size={18} color={C.suave} />
              </Pressable>
            </View>

            <Pestanas
              items={[
                {
                  clave: "detalle" as PestanaPanel,
                  etiqueta: "Detalle",
                  icono: "eye",
                },
                {
                  clave: "editar" as PestanaPanel,
                  etiqueta: "Editar",
                  icono: "pencil",
                },
                {
                  clave: "seguridad" as PestanaPanel,
                  etiqueta: "Seguridad",
                  icono: "lock",
                },
              ]}
              activa={pestana}
              onChange={setPestana}
            />

            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {pestana === "detalle" && <Detalle u={usuario} />}

              {pestana === "editar" && (
                <Editar
                  u={usuario}
                  onCambio={onCambio}
                  onCerrar={onCerrar}
                />
              )}

              {pestana === "seguridad" && (
                <Seguridad u={usuario} onCambio={onCambio} />
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ───────────────────────── DETALLE ───────────────────────── */

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <View style={s.dato}>
      <Text style={s.datoEtiqueta}>{etiqueta}</Text>
      {typeof valor === "string" ? (
        <Text style={s.datoValor}>{valor}</Text>
      ) : (
        valor
      )}
    </View>
  );
}

function Detalle({ u }: { u: UsuarioFila }) {
  const activo = (u.estado ?? "").toLowerCase() === "activo";

  return (
    <View style={{ gap: 4 }}>
      <View style={s.insignias}>
        <Insignia texto={u.rol ?? "Sin rol"} tono="primario" />
        <Insignia
          texto={activo ? "Activo" : "Inactivo"}
          tono={activo ? "ok" : "peligro"}
        />
      </View>

      <Dato etiqueta="Teléfono" valor={u.telefono || "—"} />
      <Dato etiqueta="Fecha de alta" valor={fechaLegible(u.creado_en)} />
      <Dato
        etiqueta="Último acceso"
        valor={fechaLegible(u.ultimo_acceso, true)}
      />

      {u.rol_id_FK === ROL_DOCTOR && (
        <>
          <Text style={s.subtitulo}>Perfil médico</Text>
          <Dato etiqueta="Licencia" valor={u.numero_licencia || "—"} />
          <Dato
            etiqueta="Costo de consulta"
            valor={
              u.costo_consulta != null
                ? `$${u.costo_consulta.toFixed(2)} MXN`
                : "—"
            }
          />
          <Dato
            etiqueta="Especialidades"
            valor={
              u.especialidades.length ? (
                <View style={s.insignias}>
                  {u.especialidades.map((e) => (
                    <Insignia
                      key={e.id_PK}
                      texto={e.nombre}
                      tono="primario"
                    />
                  ))}
                </View>
              ) : (
                <Text style={s.datoValor}>
                  Sin especialidades asignadas
                </Text>
              )
            }
          />
        </>
      )}
    </View>
  );
}

/* ───────────────────────── EDITAR ───────────────────────── */

function Editar({
  u,
  onCambio,
  onCerrar,
}: {
  u: UsuarioFila;
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const { token, usuario: actor } = useAuth();
  const rolActor = actor?.rol_id ?? actor?.rol_id_FK;
  const permisos = permisosSobre(
    u,
    rolActor,
    actor?.id ?? actor?.id_PK
  );

  const esDoctor = u.rol_id_FK === ROL_DOCTOR;
  const tienePerfilClinico =
    esDoctor || u.rol_id_FK === ROL_PACIENTE;

  const original = useMemo(
    () => ({
      nombre: u.nombre,
      correo: u.correo_electronico,
      telefono: u.telefono ?? "",
      rolId: u.rol_id_FK,
      licencia: u.numero_licencia ?? "",
      costo:
        u.costo_consulta != null
          ? String(u.costo_consulta)
          : "",
      esp: u.especialidades
        .map((e) => e.id_PK)
        .sort((a, b) => a - b),
    }),
    [u]
  );

  const [nombre, setNombre] = useState(original.nombre);
  const [correo, setCorreo] = useState(original.correo);
  const [telefono, setTelefono] = useState(original.telefono);
  const [rolId, setRolId] = useState<number | null>(original.rolId);
  const [licencia, setLicencia] = useState(original.licencia);
  const [costo, setCosto] = useState(original.costo);
  const [esp, setEsp] = useState<number[]>(original.esp);

  const [roles, setRoles] = useState<
    { id_PK: number; nombre: string }[]
  >([]);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "ok" | "error" | "aviso";
    texto: string;
  } | null>(null);

  useEffect(() => {
    setNombre(original.nombre);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
    setIntento(false);
  }, [original]);

  useEffect(() => {
    if (!token) return;

    api
      .get("/api/roles/", authHeaders(token))
      .then((r) => setRoles(r.data))
      .catch(() => undefined);
  }, [token]);

  const rolesCambiables = roles.filter(
    (r) =>
      r.id_PK !== ROL_DOCTOR &&
      r.id_PK !== ROL_PACIENTE &&
      !(
        rolActor === 5 &&
        (r.id_PK === 1 || r.id_PK === 5) &&
        r.id_PK !== original.rolId
      )
  );

  const errores = {
    nombre: vNombre(nombre),
    correo: vCorreo(correo),
    telefono: vTelefono(telefono),
    licencia:
      esDoctor && !licencia.trim()
        ? "Ingresa el número de licencia."
        : "",
    costo: esDoctor ? vCosto(costo) : "",
    esp:
      esDoctor && esp.length === 0
        ? "Selecciona al menos una especialidad."
        : "",
  };

  const hayErrores = Object.values(errores).some(Boolean);
  const espOrdenadas = [...esp].sort((a, b) => a - b);

  const cambiosCuenta: CambiosUsuario = {};

  if (nombre.trim() !== original.nombre) {
    cambiosCuenta.nombre = nombre.trim();
  }

  if (
    correo.trim().toLowerCase() !==
    original.correo.toLowerCase()
  ) {
    cambiosCuenta.correo_electronico = correo.trim().toLowerCase();
  }

  if (telefono.trim() !== original.telefono) {
    cambiosCuenta.telefono = telefono.trim() || null;
  }

  if (rolId !== null && rolId !== original.rolId) {
    cambiosCuenta.rol_id_FK = rolId;
  }

  const cambiosMedico: CambiosDoctor = {};

  if (esDoctor) {
    if (licencia.trim() !== original.licencia) {
      cambiosMedico.numero_licencia = licencia.trim();
    }

    if (costo.trim() !== original.costo) {
      cambiosMedico.costo_consulta = Number(costo);
    }

    if (
      JSON.stringify(espOrdenadas) !==
      JSON.stringify(original.esp)
    ) {
      cambiosMedico.especialidad_ids = espOrdenadas;
    }
  }

  const hayCambiosCuenta = Object.keys(cambiosCuenta).length > 0;
  const hayCambiosMedico = Object.keys(cambiosMedico).length > 0;
  const sucio = hayCambiosCuenta || hayCambiosMedico;

  const descartar = () => {
    setNombre(original.nombre);
    setCorreo(original.correo);
    setTelefono(original.telefono);
    setRolId(original.rolId);
    setLicencia(original.licencia);
    setCosto(original.costo);
    setEsp(original.esp);
    setIntento(false);
    setMensaje(null);
  };

  const guardar = async () => {
    setIntento(true);
    setMensaje(null);

    if (hayErrores) {
      setMensaje({
        tipo: "error",
        texto: "Revisa los campos marcados en rojo.",
      });
      return;
    }

    setGuardando(true);
    let cuentaGuardada = false;

    try {
      if (hayCambiosCuenta) {
        await actualizarUsuario(u.id_PK, cambiosCuenta, token);
        cuentaGuardada = true;
      }

      if (hayCambiosMedico && u.doctor_id) {
        await actualizarDoctor(u.doctor_id, cambiosMedico, token);
      }

      setMensaje({
        tipo: "ok",
        texto: "Cambios guardados correctamente.",
      });

      onCambio();
    } catch (e) {
      const base = mensajeError(
        e,
        "No se pudieron guardar los cambios."
      );

      if (cuentaGuardada) onCambio();

      setMensaje({
        tipo: "error",
        texto: cuentaGuardada
          ? `Los datos de la cuenta sí se guardaron, pero el perfil médico no: ${base}`
          : base,
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!permisos.puedeEditar) {
    return (
      <Aviso
        tipo="aviso"
        texto="Como coordinador no puedes modificar cuentas de administradores ni de otros coordinadores."
      />
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.subtitulo}>Datos de la cuenta</Text>

      <Campo
        etiqueta="Nombre completo"
        valor={nombre}
        onChange={setNombre}
        requerido
        error={errores.nombre}
        mostrarError={intento}
        autoCapitalize="words"
        icono="user"
      />

      <Campo
        etiqueta="Correo electrónico"
        valor={correo}
        onChange={setCorreo}
        requerido
        error={errores.correo}
        mostrarError={intento}
        teclado="email-address"
        icono="envelope-o"
      />

      <Campo
        etiqueta="Teléfono"
        valor={telefono}
        onChange={setTelefono}
        error={errores.telefono}
        mostrarError={intento}
        teclado="phone-pad"
        icono="phone"
        ayuda="Opcional"
      />

      {tienePerfilClinico ? (
        <View style={{ gap: 6 }}>
          <Text style={s.datoEtiqueta}>Rol</Text>
          <Insignia texto={u.rol ?? "—"} tono="primario" />
          <Text style={s.ayuda}>
            El rol no se puede cambiar porque la cuenta tiene un perfil
            clínico asociado.
          </Text>
        </View>
      ) : (
        <Selector
          etiqueta="Rol"
          valor={rolId !== null ? String(rolId) : ""}
          opciones={rolesCambiables.map((r) => ({
            valor: String(r.id_PK),
            etiqueta: r.nombre,
          }))}
          onChange={(v) => setRolId(Number(v))}
          icono="id-badge"
        />
      )}

      {esDoctor && (
        <>
          <Text style={[s.subtitulo, { marginTop: 6 }]}>
            Perfil médico
          </Text>

          <EspecialidadSelector
            valor={esp}
            onChange={setEsp}
            error={errores.esp}
            mostrarError={intento}
          />

          <Campo
            etiqueta="Número de licencia"
            valor={licencia}
            onChange={setLicencia}
            requerido
            error={errores.licencia}
            mostrarError={intento}
            autoCapitalize="characters"
            icono="certificate"
          />

          <Campo
            etiqueta="Costo de consulta (MXN)"
            valor={costo}
            onChange={setCosto}
            requerido
            error={errores.costo}
            mostrarError={intento}
            teclado="decimal-pad"
            icono="usd"
          />
        </>
      )}

      {mensaje && (
        <Aviso
          tipo={mensaje.tipo}
          texto={mensaje.texto}
          onCerrar={() => setMensaje(null)}
        />
      )}

      <View style={s.barraAcciones}>
        <Text
          style={[
            s.ayuda,
            sucio && { color: C.aviso, fontWeight: "700" },
          ]}
        >
          {sucio ? "● Cambios sin guardar" : "Sin cambios"}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Boton
            texto="Descartar"
            variante="fantasma"
            chico
            deshabilitado={!sucio || guardando}
            onPress={descartar}
          />

          <Boton
            texto="Guardar cambios"
            icono="save"
            chico
            deshabilitado={!sucio || guardando}
            cargando={guardando}
            onPress={guardar}
          />
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────── SEGURIDAD ───────────────────────── */

function Seguridad({
  u,
  onCambio,
}: {
  u: UsuarioFila;
  onCambio: () => void;
}) {
  const { token, usuario: actor } = useAuth();

  const rolActor = actor?.rol_id ?? actor?.rol_id_FK;

  const permisos = permisosSobre(
    u,
    rolActor,
    actor?.id ?? actor?.id_PK
  );

  const activo = (u.estado ?? "").toLowerCase() === "activo";

  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const [estadoMsg, setEstadoMsg] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  const [correoMsg, setCorreoMsg] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  useEffect(() => {
    setConfirmando(false);
    setEstadoMsg(null);
    setCorreoMsg(null);
    setEspera(0);
  }, [u.id_PK]);

  useEffect(() => {
    if (espera <= 0) return;

    const id = setTimeout(() => {
      setEspera((e) => e - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [espera]);

  const alternarEstado = async () => {
    try {
      setTrabajando(true);
      setEstadoMsg(null);

      await cambiarEstadoUsuario(
        u.id_PK,
        activo ? "inactivo" : "activo",
        token
      );

      setEstadoMsg({
        tipo: "ok",
        texto: activo ? "Cuenta desactivada." : "Cuenta activada.",
      });

      setConfirmando(false);
      onCambio();
    } catch (e) {
      setEstadoMsg({
        tipo: "error",
        texto: mensajeError(e, "No se pudo cambiar el estado."),
      });
    } finally {
      setTrabajando(false);
    }
  };

  // Nuevo flujo: enviar un enlace de recuperación, no un código de 6 dígitos.
  const enviarEnlace = async () => {
    if (enviando || espera > 0) return;

    try {
      setEnviando(true);
      setCorreoMsg(null);

      const respuesta = await solicitarEnlaceCorreo(
        u.correo_electronico
      );

      setEspera(
        typeof respuesta.espera_segundos === "number"
          ? respuesta.espera_segundos
          : 60
      );

      setCorreoMsg({
        tipo: "ok",
        texto:
          respuesta.mensaje ||
          `Se ha procesado la solicitud de recuperación para ${u.correo_electronico}. Revisa tu bandeja de entrada y la carpeta de spam.`,
      });
    } catch (e) {
      setCorreoMsg({
        tipo: "error",
        texto: mensajeError(
          e,
          "No se pudo enviar el enlace de recuperación."
        ),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      {/* Estado de la cuenta */}
      <View style={s.bloque}>
        <View style={s.bloqueCab}>
          <FontAwesome
            name="power-off"
            size={15}
            color={C.primario}
          />
          <Text style={s.bloqueTitulo}>Estado de la cuenta</Text>
          <Insignia
            texto={activo ? "Activa" : "Inactiva"}
            tono={activo ? "ok" : "peligro"}
          />
        </View>

        {!permisos.puedeCambiarEstado ? (
          <Text style={s.ayuda}>
            {permisos.esPropio
              ? "No puedes desactivar tu propia cuenta."
              : "Como coordinador no puedes cambiar el estado de administradores ni coordinadores."}
          </Text>
        ) : confirmando ? (
          <View style={{ gap: 10 }}>
            <Aviso
              tipo="aviso"
              texto={
                activo
                  ? "La persona no podrá iniciar sesión hasta que reactives la cuenta."
                  : "La persona podrá volver a iniciar sesión."
              }
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Boton
                texto="Cancelar"
                variante="fantasma"
                chico
                deshabilitado={trabajando}
                onPress={() => setConfirmando(false)}
              />

              <Boton
                texto={activo ? "Sí, desactivar" : "Sí, activar"}
                variante={activo ? "peligro" : "primario"}
                chico
                cargando={trabajando}
                onPress={alternarEstado}
              />
            </View>
          </View>
        ) : (
          <Boton
            texto={activo ? "Desactivar cuenta" : "Activar cuenta"}
            icono="power-off"
            variante={activo ? "peligro" : "primario"}
            chico
            onPress={() => setConfirmando(true)}
          />
        )}

        {estadoMsg && (
          <Aviso
            tipo={estadoMsg.tipo}
            texto={estadoMsg.texto}
          />
        )}
      </View>

      {/* Recuperación de contraseña */}
      <Text style={s.subtitulo}>Recuperación de contraseña</Text>

      {!permisos.puedeEditar ? (
        <Aviso
          tipo="aviso"
          texto="Como coordinador no puedes restablecer la contraseña de administradores ni de otros coordinadores."
        />
      ) : !activo ? (
        <Aviso
          tipo="aviso"
          texto="Activa la cuenta para poder restablecer su contraseña."
        />
      ) : (
        <>
          {/* Recuperación mediante QR */}
          <View style={s.bloque}>
            <View style={s.bloqueCab}>
              <FontAwesome
                name="qrcode"
                size={16}
                color={C.primario}
              />
              <Text style={s.bloqueTitulo}>Código QR</Text>
            </View>

            <Text style={s.ayuda}>
              Para entregarlo en persona. El usuario lo escanea desde
              la pantalla de recuperación.
            </Text>

            <QRRecuperacion
              usuarioId={u.id_PK}
              nombre={u.nombre}
            />
          </View>

          {/* Recuperación mediante enlace por correo */}
          <View style={s.bloque}>
            <View style={s.bloqueCab}>
              <FontAwesome
                name="envelope-o"
                size={15}
                color={C.primario}
              />
              <Text style={s.bloqueTitulo}>
                Enlace por correo
              </Text>
            </View>

            <Text style={s.ayuda}>
              Se enviará un enlace para restablecer la contraseña a{" "}
              {u.correo_electronico}. Al abrirlo, la persona podrá
              establecer una contraseña nueva.
            </Text>

            <Boton
              texto={
                enviando
                  ? "Enviando enlace..."
                  : espera > 0
                    ? `Reenviar en ${espera}s`
                    : "Enviar enlace al correo"
              }
              icono="paper-plane"
              variante="secundario"
              chico
              deshabilitado={enviando || espera > 0}
              cargando={enviando}
              onPress={enviarEnlace}
            />

            {correoMsg && (
              <Aviso
                tipo={correoMsg.tipo}
                texto={correoMsg.texto}
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

/* ───────────────────────── ESTILOS ───────────────────────── */

const s = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(23,63,58,0.45)",
    justifyContent: "flex-end",
  },
  hoja: {
    backgroundColor: C.tarjeta,
    overflow: "hidden",
  },
  hojaDrawer: {
    width: 520,
    height: "100%",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  hojaCompleta: {
    width: "100%",
    height: "94%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    paddingBottom: 14,
  },
  nombre: {
    fontSize: 17,
    fontWeight: "800",
    color: C.oscuro,
  },
  correo: {
    fontSize: 13,
    color: C.suave,
  },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.fondo,
  },
  insignias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primario,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 8,
  },
  dato: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.bordeSuave,
    gap: 4,
  },
  datoEtiqueta: {
    fontSize: 12,
    fontWeight: "700",
    color: C.suave,
  },
  datoValor: {
    fontSize: 14.5,
    color: C.oscuro,
    fontWeight: "600",
  },
  ayuda: {
    fontSize: 12.5,
    color: C.suave,
    lineHeight: 18,
  },
  barraAcciones: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.bordeSuave,
  },
  bloque: {
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: "#FBFDFC",
  },
  bloqueCab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bloqueTitulo: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: C.oscuro,
  },
});
