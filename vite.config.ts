import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Emit to build/web so it lines up with the MDP website-deploy convention
// (see .github/workflows/deploy.yml → input_folder: "build/web").
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build/web",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
