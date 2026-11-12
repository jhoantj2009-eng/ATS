import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Registrar Service Worker con recarga automática para soporte offline instantáneo
const updateSW = registerSW({
  onNeedRefresh() {
    // Actualizar Service Worker inmediatamente en segundo plano
    updateSW(true);
  },
  onOfflineReady() {
    console.log("ATS DCM PWA lista para operar 100% sin conexión (IndexedDB + Workbox).");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

