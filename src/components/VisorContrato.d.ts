import React from "react";

export interface VisorContratoProps {
  url: string;
  token: string;
}

declare const VisorContrato: React.FC<VisorContratoProps>;
export default VisorContrato;
