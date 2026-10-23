import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

interface SelectorHoraProps {
  value: string;
  onChange: (hora: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}

function formatearHora(fecha: Date) {
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

export default function SelectorHora({
  value,
  onChange,
  placeholder = "10:00",
}: SelectorHoraProps) {
  const [visible, setVisible] = useState(false);

  const horaSeleccionada = value
    ? (() => {
        const [h, m] = value.split(":").map(Number);
        const d = new Date();
        d.setHours(h || 0, m || 0, 0, 0);
        return d;
      })()
    : new Date();

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
          value={horaSeleccionada}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, fecha) => {
            setVisible(Platform.OS === "ios");
            if (fecha) {
              onChange(formatearHora(fecha));
            }
          }}
        />
      )}
    </View>
  );
}
