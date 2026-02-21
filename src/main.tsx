import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./assets/normalize.css";
import "./assets/blank.css";
import "./assets/style.css";

import App from "./components/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

requestAnimationFrame(() => {
  document.getElementById("root-spinner")?.remove();
});