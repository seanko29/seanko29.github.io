import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite serves the same app in two places:
//   npm run dev      -> plain browser, with a fake desktop backdrop for previewing
//   npm run desktop  -> Tauri webview, transparent and frameless
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
