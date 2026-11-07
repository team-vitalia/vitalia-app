import { describe, test, expect, jest } from "@jest/globals";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { UpgradeModal } from "../src/components/UpgradeModal";

describe("Componente UpgradeModal", () => {
  test("renderiza correctamente los textos del módulo y plan requerido", () => {
    const mockClose = jest.fn();
    const mockVerPlanes = jest.fn();

    render(
      <UpgradeModal
        visible={true}
        modulo="Gestión de Contratos"
        planRequerido="Empresarial"
        onClose={mockClose}
        onVerPlanes={mockVerPlanes}
      />
    );

    expect(
      screen.getByText("Desbloquea Gestión de Contratos")
    ).toBeTruthy();
    expect(screen.getByText("PLAN EMPRESARIAL")).toBeTruthy();

    const btnVer = screen.getByTestId("btn-ver-planes");
    expect(btnVer).toBeTruthy();
    fireEvent.click(btnVer);
    expect(mockVerPlanes).toHaveBeenCalledTimes(1);

    const btnCerrar = screen.getByTestId("btn-cerrar-modal");
    expect(btnCerrar).toBeTruthy();
    fireEvent.click(btnCerrar);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("abre la URL de la landing al pulsar ver planes sin callback onVerPlanes", () => {
    const spyOpen = jest.spyOn(window, "open").mockImplementation(() => null);

    render(
      <UpgradeModal
        visible={true}
        modulo="Almacén"
        planRequerido="Clínica"
        onClose={jest.fn()}
      />
    );

    const btnVer = screen.getByTestId("btn-ver-planes");
    fireEvent.click(btnVer);

    expect(spyOpen).toHaveBeenCalledWith(
      expect.stringContaining("#planes"),
      "_blank"
    );

    spyOpen.mockRestore();
  });
});
