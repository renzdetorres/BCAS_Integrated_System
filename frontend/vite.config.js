import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import appearanceScale from "./build/appearanceScale.js";

export default defineConfig({
  plugins: [react()],
  // Makes font sizes and viewport heights follow the Appearance settings (see build/appearanceScale.js).
  css: { postcss: { plugins: [appearanceScale()] } },
  server: {
    port: 5173,
  },
});
