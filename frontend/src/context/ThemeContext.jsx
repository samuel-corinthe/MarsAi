/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "marsai-theme-mode";
export const ThemeContext = createContext(null);

function resolveInitialThemeMode() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(resolveInitialThemeMode);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
    document.body.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      isLight: themeMode === "light",
      isDark: themeMode === "dark",
      setThemeMode,
      toggleTheme: () => setThemeMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
