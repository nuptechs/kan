import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";
import cartographer from "@replit/vite-plugin-cartographer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorModal(),
    cartographer({
      includePatterns: ["**/*.{ts,tsx}"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5001,
    strictPort: true,
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
});
