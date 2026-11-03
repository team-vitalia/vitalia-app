import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover"
        />
        <title>Vitalia</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B1220" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vitalia" />
        <meta name="application-name" content="Vitalia" />
        <meta name="msapplication-TileColor" content="#0B1220" />
        <meta name="msapplication-TileImage" content="/icons/icon-512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="stylesheet" href="/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:'Ionicons';src:url('/fonts/Ionicons.ttf') format('truetype');font-display:swap;}@font-face{font-family:'FontAwesome';src:url('/fonts/FontAwesome.ttf') format('truetype');font-display:swap;}@keyframes vitaliaSpin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}@keyframes vitaliaPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.05);opacity:0.9;}}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){function r(){navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).catch(function(){});}if(document.readyState==='complete'||document.readyState==='interactive'){r();}else{window.addEventListener('load',r);}}`,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: "#0B1220" }}>
        <div
          id="vitalia-splash"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#0B1220",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            transition: "opacity 0.35s ease-out",
            pointerEvents: "none",
          }}
        >
          <img
            src="/icons/icon-192.png"
            alt="Vitalia"
            style={{
              width: "96px",
              height: "96px",
              marginBottom: "16px",
              animation: "vitaliaPulse 2s infinite ease-in-out",
            }}
          />
          <div
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: "26px",
              fontWeight: 800,
              color: "#22D3EE",
              letterSpacing: "1.2px",
              marginBottom: "6px",
            }}
          >
            VITALIA
          </div>
          <div
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              fontSize: "13px",
              color: "#8FA3BF",
              marginBottom: "24px",
            }}
          >
            Gestión clínica inteligente
          </div>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid rgba(34, 211, 238, 0.2)",
              borderTop: "3px solid #22D3EE",
              borderRadius: "50%",
              animation: "vitaliaSpin 0.8s linear infinite",
            }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
