import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Acceso } from "./Acceso";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Acceso>
      <App />
    </Acceso>
  </StrictMode>,
);

// Solo en producción: el service worker hace la app instalable en el móvil y el portátil.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => { /* sin service worker la app funciona igual */ });
}
