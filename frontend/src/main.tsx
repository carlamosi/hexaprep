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
