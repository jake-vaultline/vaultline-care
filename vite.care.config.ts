// Modified execution model for Vaultline Care: loopback server owns auth and tools.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: { "import.meta.env.VITE_CARE": JSON.stringify("true") },
  build: { outDir: "dist-care" },
  server: { hmr: false, fs: { allow: ["."] } },
});
