import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-cookie": path.resolve(__dirname, "node_modules/react-cookie"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/wp-json": {
        target: "https://samuel-corinthe.students-laplateforme.io/MarsAi",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true,
  },
});
