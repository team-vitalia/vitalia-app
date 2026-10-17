import React from "react";

export interface SelectorHoraProps {
  value: string;
  onChange: (hora: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}

declare const SelectorHora: React.FC<SelectorHoraProps>;
export default SelectorHora;
