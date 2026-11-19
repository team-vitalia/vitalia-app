import { datadogRum } from "@datadog/browser-rum";

let initialized = false;

export function initializeDatadogRum() {
  if (initialized) return;

  const applicationId =
    process.env.EXPO_PUBLIC_DATADOG_APPLICATION_ID;

  const clientToken =
    process.env.EXPO_PUBLIC_DATADOG_CLIENT_TOKEN;

  if (!applicationId || !clientToken) {
    console.warn("Datadog RUM: faltan las variables de configuración.");
    return;
  }

  datadogRum.init({
    applicationId,
    clientToken,
    site: "datadoghq.com",
    service: "vitalia-web",
    env: process.env.EXPO_PUBLIC_ENV || "production",
    version: "1.1.6",

    sessionSampleRate: 100,
    sessionReplaySampleRate: 0,

    trackResources: false,
    trackUserInteractions: false,
    trackLongTasks: true,

    defaultPrivacyLevel: "mask",
  });

  initialized = true;
}