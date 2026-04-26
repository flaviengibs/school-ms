import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Set base to your GitHub repo name, e.g. /school-management/
  // Override with VITE_BASE_URL env var if needed
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
