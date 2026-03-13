import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeBasePath(value = "/") {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") return "/";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normalizeBasePath(env.VITE_APP_BASE_PATH || "/");

  return {
    base,
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
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
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
  };
});
