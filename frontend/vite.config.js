import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeBasePath(value = "/") {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  if (raw === "/") return "/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const appBasePath = normalizeBasePath(env.VITE_APP_BASE_PATH || "/");
  const wordpressBaseUrl =
    env.VITE_WORDPRESS_URL || "https://samuel-corinthe.students-laplateforme.io/MarsAi";

  return {
    base: appBasePath,
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
          target: wordpressBaseUrl,
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
