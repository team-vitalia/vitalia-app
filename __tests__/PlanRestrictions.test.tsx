import { describe, test, expect, jest } from "@jest/globals";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { BotonAnalisisIA } from "../src/components/BotonAnalisisIA";
import * as PlanFeaturesHook from "../src/hooks/usePlanFeatures";

describe("Restricciones de Plan - Análisis IA", () => {
  test("intercepta la llamada a la API y muestra el modal de mejora cuando el usuario tiene plan Basico", async () => {
    const mockFuncionApi = jest.fn<() => void>();

    jest.spyOn(PlanFeaturesHook, "usePlanFeatures").mockReturnValue({
      planActual: {
        nombre_plan: "Básico",
        incluye_ia: false,
        incluye_calendar: false,
      },
      clinica: null,
      nombrePlan: "Básico",
      canUseAI: () => false,
      canUseCalendar: () => false,
    });

    render(
      <BotonAnalisisIA
        onEjecutarAnalisis={mockFuncionApi}
        texto="Análisis IA"
        testID="btn-analisis-ia"
      />
    );

    const boton = screen.getByTestId("btn-analisis-ia");
    expect(boton).toBeTruthy();

    fireEvent.click(boton);

    expect(mockFuncionApi).not.toHaveBeenCalled();

    const mensajeModal = screen.getByTestId("mensaje-mejora-plan");
    expect(mensajeModal).toBeTruthy();
    expect(mensajeModal.textContent).toContain(
      "Mejora tu plan para acceder a esta función. Tu plan actual no soporta Análisis IA."
    );

    const botonVerPlanes = screen.getByTestId("btn-ver-planes");
    expect(botonVerPlanes).toBeTruthy();

    const botonCerrar = screen.getByTestId("btn-cerrar-modal");
    expect(botonCerrar).toBeTruthy();
  });

  test("ejecuta la llamada a la API directamente cuando el usuario cuenta con plan Profesional", async () => {
    const mockFuncionApi = jest.fn<() => void>();

    jest.spyOn(PlanFeaturesHook, "usePlanFeatures").mockReturnValue({
      planActual: {
        nombre_plan: "Profesional",
        incluye_ia: true,
        incluye_calendar: true,
      },
      clinica: null,
      nombrePlan: "Profesional",
      canUseAI: () => true,
      canUseCalendar: () => true,
    });

    render(
      <BotonAnalisisIA
        onEjecutarAnalisis={mockFuncionApi}
        texto="Análisis IA"
        testID="btn-analisis-ia"
      />
    );

    const boton = screen.getByTestId("btn-analisis-ia");
    fireEvent.click(boton);

    expect(mockFuncionApi).toHaveBeenCalledTimes(1);

    expect(screen.queryByTestId("mensaje-mejora-plan")).toBeNull();
  });
});
