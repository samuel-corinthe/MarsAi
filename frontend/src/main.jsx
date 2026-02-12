import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";
import { createHead } from "@unhead/react/client";
import { HeadProvider } from "@unhead/react";
import App from "./App.jsx";
import "./i18n";
import "./index.css";

const head = createHead();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
     <HeadProvider head={head}>
      <CookiesProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CookiesProvider>
    </HeadProvider>
  </React.StrictMode>
);
