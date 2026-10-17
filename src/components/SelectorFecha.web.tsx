import { View } from "react-native";

interface SelectorFechaProps {
  value: string;
  onChange: (fecha: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}

export default function SelectorFecha({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  min,
  max,
}: SelectorFechaProps) {
  return (
    <View style={{ width: "100%" }}>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          height: 46,
          padding: "0 12px",
          boxSizing: "border-box",
          border: "1px solid #DCE8E5",
          borderRadius: 10,
          backgroundColor: "#FBFDFC",
          color: "#294F49",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      />
    </View>
  );
}
