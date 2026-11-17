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
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="stylesheet" href="/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="stylesheet" href="/styles.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function enforceVitalia(){if(document.title!=='Vitalia'){document.title='Vitalia';}}enforceVitalia();try{var titleEl=document.querySelector('title');if(titleEl){new MutationObserver(enforceVitalia).observe(titleEl,{childList:true,characterData:true,subtree:true});}window.addEventListener('popstate',enforceVitalia);setInterval(enforceVitalia,1000);}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark-theme');if(document.body){document.body.classList.add('dark-theme');}else{document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('dark-theme');});}}else{document.documentElement.classList.remove('dark-theme');}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){function r(){navigator.serviceWorker.register('/service-worker.js',{scope:'/'}).catch(function(){});}if(document.readyState==='complete'||document.readyState==='interactive'){r();}else{window.addEventListener('load',r);}}`,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body className="pwa-body">
        <div id="vitalia-splash">
          <img
            src="/icons/icon-192.png"
            alt="Vitalia"
            className="vitalia-splash-logo"
          />
          <div className="vitalia-splash-title">
            VITALIA
          </div>
          <div className="vitalia-splash-subtitle">
            Gestión clínica inteligente
          </div>
          <div className="vitalia-splash-spinner" />
        </div>
        {children}
      </body>
    </html>
  );
}
