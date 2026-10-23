import React from "react";

export interface SelectorFechaProps {
  value: string;
  onChange: (fecha: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}

declare const SelectorFecha: React.FC<SelectorFechaProps>;
export default SelectorFecha;
