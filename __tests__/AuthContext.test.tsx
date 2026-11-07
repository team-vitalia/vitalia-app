import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import api from "../src/services/api";

jest.mock("../src/services/api");

const mockedApi = api as jest.Mocked<typeof api>;

function ConsumidorAuthPrueba() {
  const { usuario, clinica, planActual, cargando } = useAuth();

  if (cargando) {
    return <div>Cargando sesión...</div>;
  }

  return (
    <div>
      <span data-testid="usuario-nombre">{usuario?.nombre || "Sin usuario"}</span>
      <span data-testid="clinica-nombre">{clinica?.nombre_comercial || "Sin clínica"}</span>
      <span data-testid="plan-nombre">{planActual.nombre_plan}</span>
      <span data-testid="plan-ia">{planActual.incluye_ia ? "IA Habilitada" : "IA Deshabilitada"}</span>
      <span data-testid="plan-calendar">{planActual.incluye_calendar ? "Calendar Habilitado" : "Calendar Deshabilitado"}</span>
    </div>
  );
}

describe("AuthContext - Carga y Estado del Plan", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test("carga correctamente la informacion del plan y de la clinica desde la sesion de la API", async () => {
    const mockUsuarioRespuesta = {
      id: 5,
      nombre: "Dr. Alejandro Morales",
      correo: "alejandro@vitalia.clinic",
      rol_id: 2,
      estado: "activo",
      clinica: {
        id: 12,
        nombre_comercial: "Clínica Médica San Rafael",
        activa: true,
        plan_actual: {
          nombre_plan: "Profesional",
          incluye_ia: true,
          incluye_calendar: true,
        },
      },
    };

    await AsyncStorage.setItem("vitalia_token", "jwt-token-valido-123");
    await AsyncStorage.setItem("vitalia_usuario", JSON.stringify(mockUsuarioRespuesta));

    (mockedApi.get as any) = jest.fn().mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ data: mockUsuarioRespuesta });
      }
      return Promise.reject(new Error("Ruta no mockeada"));
    });

    const { getByTestId } = render(
      <AuthProvider>
        <ConsumidorAuthPrueba />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("plan-nombre").textContent).toBe("Profesional");
    });

    expect(getByTestId("clinica-nombre").textContent).toBe("Clínica Médica San Rafael");
    expect(getByTestId("plan-ia").textContent).toBe("IA Habilitada");
    expect(getByTestId("plan-calendar").textContent).toBe("Calendar Habilitado");
  });

  test("asigna el plan Basico por defecto cuando no existe clinica o plan configurado", async () => {
    (mockedApi.get as any) = jest.fn().mockImplementation(() => Promise.reject(new Error("Sin sesion")));

    const { getByTestId } = render(
      <AuthProvider>
        <ConsumidorAuthPrueba />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId("usuario-nombre").textContent).toBe("Sin usuario");
    });

    expect(getByTestId("plan-nombre").textContent).toBe("Básico");
    expect(getByTestId("plan-ia").textContent).toBe("IA Deshabilitada");
    expect(getByTestId("plan-calendar").textContent).toBe("Calendar Deshabilitado");
  });
});
