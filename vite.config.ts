import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-table": ["@tanstack/react-table", "@tanstack/react-virtual"],
          "vendor-zip": ["jszip"],
        },
      },
    },
  },
});
