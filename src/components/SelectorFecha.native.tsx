import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

interface SelectorFechaProps {
  value: string;
  onChange: (fecha: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export default function SelectorFecha({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  min,
  max,
}: SelectorFechaProps) {
  const [visible, setVisible] = useState(false);

  const fechaSeleccionada = value
    ? new Date(`${value}T12:00:00`)
    : new Date();

  const minDate = min ? new Date(`${min}T00:00:00`) : undefined;
  const maxDate = max ? new Date(`${max}T23:59:59`) : undefined;

  return (
    <View>
      <Pressable
        onPress={() => setVisible(true)}
        style={{
          borderWidth: 1,
          borderColor: "#DCE8E5",
          borderRadius: 10,
          padding: 13,
          backgroundColor: "#FBFDFC",
        }}
      >
        <Text style={{ color: value ? "#294F49" : "#8A9A98" }}>
          {value || placeholder}
        </Text>
      </Pressable>

      {visible && (
        <DateTimePicker
          value={fechaSeleccionada}
          minimumDate={minDate}
          maximumDate={maxDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, fecha) => {
            setVisible(Platform.OS === "ios");

            if (fecha) {
              onChange(fechaLocal(fecha));
            }
          }}
        />
      )}
    </View>
  );
}
