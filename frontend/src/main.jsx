import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/400-italic.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import App from "./App.jsx";
import "./styles/base.css";
import "./styles/responsive.css";
import { loadAcademicCatalog } from "./config/academicCatalog.js";


// The school's saved strands, programs and levels load first (never longer than 2 seconds), so the first screen already shows them.
Promise.race([loadAcademicCatalog(), new Promise((resolve) => setTimeout(resolve, 2000))]).then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
