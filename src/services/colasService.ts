import api from "./api";

export type Cola = {
  id_PK: number;
  cita_id_FK: number;
  paciente_id_FK: number | null;
  doctor_id_FK: number | null;
  numero_cola: string | null;
  estado: string | null;
  hora_registro: string | null;
  prioridad: string | null;
  hora_llamado: string | null;
  numero_consultorio: string | null;
};

// 📤 Registrar la llegada de un paciente (crea la cola)
export async function registrarLlegada(
  citaId: number,
  token: string,
  prioridad: string = "normal"
): Promise<Cola> {
  const respuesta = await api.post<Cola>(
    "/api/colas/",
    { cita_id_FK: citaId, prioridad },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return respuesta.data;
}

// 📥 Listar TODAS las colas del día (en_espera, llamado y atendido)
// El backend devuelve todas; aquí las usamos para saber qué citas ya tienen turno.
export async function listarColas(token: string): Promise<Cola[]> {
  const respuesta = await api.get<Cola[]>("/api/colas/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return respuesta.data;
}

// 📥 Listar SOLO las colas activas (en_espera y llamado) — para la vista de lista de espera
export async function listarColasActivas(token: string): Promise<Cola[]> {
  const respuesta = await api.get<Cola[]>("/api/colas/", {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 🔹 Filtrar en el frontend: solo en_espera y llamado
  return respuesta.data.filter(
    (cola) => cola.estado === "en_espera" || cola.estado === "llamado"
  );
}

// 📥 Listar solo las colas atendidas
export async function listarAtendidas(token: string): Promise<Cola[]> {
  const respuesta = await api.get<Cola[]>("/api/colas/atendidas", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return respuesta.data;
}

// ✏️ Actualizar el estado de una cola
export async function actualizarCola(
  colaId: number,
  token: string,
  datos: { estado?: string; numero_consultorio?: string }
): Promise<Cola> {
  const respuesta = await api.patch<Cola>(
    `/api/colas/${colaId}`,
    datos,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return respuesta.data;
}