import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" is essential so the packaged app can load assets via file://
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
