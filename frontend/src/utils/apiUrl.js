function normalizeOrigin(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function normalizeApiPath(pathname = "") {
  const raw = String(pathname || "").trim();
  if (!raw) return "";

  if (raw === "api") return "/api";
  if (raw.startsWith("api/")) return `/${raw}`;

  if (raw === "/MarsAi/api" || raw.startsWith("/MarsAi/api/")) {
    return raw.slice("/MarsAi".length);
  }

  if (raw === "/MarsAiFestival/api" || raw.startsWith("/MarsAiFestival/api/")) {
    return raw.slice("/MarsAiFestival".length);
  }

  return raw;
}

export function getBackendApiOrigin() {
  return normalizeOrigin(import.meta.env.VITE_BACKEND_API_ORIGIN || "");
}

export function resolveApiRequestUrl(input = "") {
  const backendOrigin = getBackendApiOrigin();
  if (!backendOrigin) return String(input || "");

  const raw = String(input || "").trim();
  if (!raw) return raw;

  // Relative path case
  if (raw.startsWith("/")) {
    const normalized = normalizeApiPath(raw);
    if (normalized === "/api" || normalized.startsWith("/api/")) {
      return `${backendOrigin}${normalized}`;
    }
    return raw;
  }

  // Non-leading slash relative path case
  const normalizedRelative = normalizeApiPath(raw);
  if (normalizedRelative === "/api" || normalizedRelative.startsWith("/api/")) {
    return `${backendOrigin}${normalizedRelative}`;
  }

  // Absolute URL case
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const normalizedAbsolutePath = normalizeApiPath(url.pathname || "");
      if (normalizedAbsolutePath === "/api" || normalizedAbsolutePath.startsWith("/api/")) {
        const suffix = `${normalizedAbsolutePath}${url.search || ""}${url.hash || ""}`;
        return `${backendOrigin}${suffix}`;
      }
    } catch {
      // Ignore malformed URL and keep input as-is.
    }
  }

  return raw;
}

