import React from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import CalendarTestScreen from "../components/CalendarTestScreen";

export default function CalendarPage() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FAF8" />
      <CalendarTestScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },
});
