import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// specs/modules/web.md: dev and preview on port 5173. The api's base URL
// comes from VITE_API_URL at build time (default http://localhost:3000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
