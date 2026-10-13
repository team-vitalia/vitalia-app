import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InteraccionItem {
  medicamento_1: string;
  medicamento_2: string;
  severidad: string;
  descripcion: string;
  accion_requerida?: string;
}

interface Props {
  resultado: {
    tiene_interaccion: boolean;
    detalles: InteraccionItem[];
  };
}

export const AlertaInteraccion = ({ resultado }: Props) => {
  if (!resultado?.tiene_interaccion) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.header}>⚠️ Alerta de Interacción Medicamentosa</Text>
      {resultado.detalles.map((item, index) => (
        <View key={index} style={styles.itemContainer}>
          <Text style={styles.severidad}>Severidad: {item.severidad}</Text>
          <Text style={styles.meds}>{item.medicamento_1} ⚡ {item.medicamento_2}</Text>
          <Text style={styles.desc}>{item.descripcion}</Text>
          {item.accion_requerida && (
            <Text style={styles.accion}>Acción sugerida: {item.accion_requerida}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF0F0', borderColor: '#E53935', borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 8 },
  header: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8 },
  // ⚠️ Corregido: paddingBottom en lugar de pb
  itemContainer: { marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#FFCDD2', paddingBottom: 4 },
  severidad: { fontSize: 12, fontWeight: 'bold', color: '#B71C1C' },
  meds: { fontSize: 13, fontWeight: '600', color: '#212121', marginVertical: 2 },
  desc: { fontSize: 12, color: '#424242' },
  accion: { fontSize: 11, fontStyle: 'italic', color: '#C62828', marginTop: 2 }
});
//Con este componente, cuando el Doctor seleccione medicamentos en la consulta médica, se proyectará la advertencia de incompatibilidad