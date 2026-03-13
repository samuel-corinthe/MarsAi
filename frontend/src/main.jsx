import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";
import { createHead, UnheadProvider } from "@unhead/react/client";
import axios from "axios";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { getBackendApiOrigin, resolveApiRequestUrl } from "./utils/apiUrl.js";
import "./i18n";
import "./index.css";

function getRouterBasename() {
  const rawBase = String(import.meta.env.BASE_URL || "/").trim() || "/";
  const prefixed = rawBase.startsWith("/") ? rawBase : `/${rawBase}`;
  if (prefixed === "/") return "/";
  return prefixed.replace(/\/+$/, "");
}

const backendApiOrigin = getBackendApiOrigin();
if (backendApiOrigin) {
  axios.defaults.baseURL = backendApiOrigin;
  axios.defaults.withCredentials = true;

  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === "string") {
        return nativeFetch(resolveApiRequestUrl(input), init);
      }

      if (input instanceof URL) {
        return nativeFetch(resolveApiRequestUrl(input.toString()), init);
      }

      if (input instanceof Request) {
        const resolvedUrl = resolveApiRequestUrl(input.url);
        if (resolvedUrl !== input.url) {
          return nativeFetch(new Request(resolvedUrl, input), init);
        }
      }

      return nativeFetch(input, init);
    };
  }
}

const head = createHead();
const routerBasename = getRouterBasename();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UnheadProvider head={head}>
      <CookiesProvider>
        <ThemeProvider>
          <BrowserRouter basename={routerBasename}>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </CookiesProvider>
    </UnheadProvider>
  </React.StrictMode>
);
