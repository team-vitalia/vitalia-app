import { useTheme } from "../theme/theme";
import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import CalendarTestScreen from "../components/CalendarTestScreen";

export default function CalendarPage() {
  const c = useTheme();
  const isDark = c.mode === "dark";
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.bg} />
      <CalendarTestScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
