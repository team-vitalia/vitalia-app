import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { Linking, Platform } from "react-native";
import { ModalPlanSuscripcion } from "../src/components/ModalPlanSuscripcion";
import * as AuthContextModule from "../src/context/AuthContext";

describe("ModalPlanSuscripcion - Información y Actualización de Plan", () => {
  const mockRecargarSesion = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("muestra la información del plan contratado Básico y el siguiente plan Clínica para actualizar", () => {
    jest.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      usuario: { id: 1, nombre: "Admin", rol_id: 1 },
      token: "mock-token",
      clinica: {
        id: 1,
        nombre_comercial: "Clínica San Patricio",
        plan_actual: { nombre_plan: "Básico", incluye_ia: false, incluye_calendar: false },
      },
      planActual: {
        nombre_plan: "Básico",
        incluye_ia: false,
        incluye_calendar: false,
        incluye_contratos: false,
        limite_personal: 3,
        limite_pacientes: 100,
        precio_mensual: 599,
      },
      login: jest.fn<any>(),
      logout: jest.fn(),
      recargarSesion: mockRecargarSesion,
      cargando: false,
    });

    render(<ModalPlanSuscripcion visible={true} onClose={jest.fn()} />);

    expect(screen.getByTestId("modal-plan-suscripcion")).toBeTruthy();
    expect(screen.getByText("Clínica San Patricio")).toBeTruthy();
    expect(screen.getByText("PLAN CONTRATADO ACTUAL")).toBeTruthy();
    expect(screen.getByText("Básico")).toBeTruthy();
    expect(screen.getByText("Actualizar al Siguiente Plan")).toBeTruthy();
    expect(screen.getByText("SIGUIENTE PLAN RECOMENDADO")).toBeTruthy();
    expect(screen.getByText("Actualizar a Plan Clínica y Pagar")).toBeTruthy();
  });

  test("ejecuta la apertura del checkout al pulsar sobre el botón de actualizar plan", () => {
    const spyLinking = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve());
    const originalPlatform = Platform.OS;
    Platform.OS = "android";

    jest.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      usuario: { id: 1, nombre: "Admin", rol_id: 1 },
      token: "mock-token",
      clinica: {
        id: 1,
        nombre_comercial: "Clínica Test",
        plan_actual: { nombre_plan: "Básico", incluye_ia: false, incluye_calendar: false },
      },
      planActual: {
        nombre_plan: "Básico",
        incluye_ia: false,
        incluye_calendar: false,
      },
      login: jest.fn<any>(),
      logout: jest.fn(),
      recargarSesion: mockRecargarSesion,
      cargando: false,
    });

    render(<ModalPlanSuscripcion visible={true} onClose={jest.fn()} />);

    const botonActualizar = screen.getByText("Actualizar a Plan Clínica y Pagar");
    fireEvent.click(botonActualizar);

    expect(spyLinking).toHaveBeenCalledWith(
      expect.stringContaining("plan_id=P-5CC29855SK5899208NLWUMWI")
    );

    Platform.OS = originalPlatform;
  });

  test("muestra mensaje de Plan Máximo Activo cuando el usuario ya cuenta con plan Empresarial", () => {
    jest.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      usuario: { id: 1, nombre: "Admin", rol_id: 1 },
      token: "mock-token",
      clinica: {
        id: 1,
        nombre_comercial: "Hospital Central",
        plan_actual: { nombre_plan: "Empresarial", incluye_ia: true, incluye_calendar: true },
      },
      planActual: {
        nombre_plan: "Empresarial",
        incluye_ia: true,
        incluye_calendar: true,
        incluye_contratos: true,
      },
      login: jest.fn<any>(),
      logout: jest.fn(),
      recargarSesion: mockRecargarSesion,
      cargando: false,
    });

    render(<ModalPlanSuscripcion visible={true} onClose={jest.fn()} />);

    expect(screen.getByText("Plan Máximo Activo")).toBeTruthy();
    expect(screen.queryByText("Actualizar al Siguiente Plan")).toBeNull();
  });
});
