import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useTheme, type Theme } from "../theme/theme";

export function InstallPrompt() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="mobile-phone" size={26} color={c.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Instalar Vitalia</Text>
          <Text style={styles.description}>
            Accede rápidamente desde tu pantalla de inicio y úsalo sin conexión.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.installButton}
          onPress={handleInstallClick}
        >
          <FontAwesome
            name="download"
            size={13}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.installButtonText}>Instalar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
        >
          <FontAwesome name="times" size={14} color={c.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(c: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.tileBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      color: c.text,
      fontSize: 13,
      fontWeight: "700",
    },
    description: {
      color: c.muted,
      fontSize: 11,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 12,
    },
    installButton: {
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 8,
    },
    buttonIcon: {
      marginRight: 6,
    },
    installButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    dismissButton: {
      padding: 6,
    },
  });
}
