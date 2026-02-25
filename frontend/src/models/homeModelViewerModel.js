const FALLBACK_MODEL_VIEWER_SOURCES = [
  "/vendor/model-viewer.min.js",
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js",
];

export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const OBSERVER_ROOT_MARGIN = "200px";
export const IDLE_LOAD_TIMEOUT_MS = 1200;
export const FALLBACK_LOAD_DELAY_MS = 300;
export const HOME_3D_OVERRIDE_STORAGE_KEY = "marsai_home_3d";

const LOW_BANDWIDTH_TYPES = new Set(["slow-2g", "2g", "3g"]);

export function getModelViewerSources() {
  return [
    import.meta.env.VITE_MODEL_VIEWER_SRC,
    ...FALLBACK_MODEL_VIEWER_SOURCES,
  ].filter(Boolean);
}

export function shouldRenderForViewport(only, isSmallViewport) {
  if (only === "mobile" && !isSmallViewport) return false;
  if (only === "desktop" && isSmallViewport) return false;
  return true;
}

export function shouldAutoRotate({ reduceMotion, isSmallViewport }) {
  return !reduceMotion && !isSmallViewport;
}

export function getInteractionPrompt(isSmallViewport) {
  return isSmallViewport ? "auto" : "none";
}

function supportsWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2")
      || canvas.getContext("webgl")
      || canvas.getContext("experimental-webgl");
    return Boolean(context);
  } catch {
    return false;
  }
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(String(navigator.userAgent || ""));
}

export function getHome3DOverride() {
  if (typeof window === "undefined") return "auto";
  const rawValue = String(
    window.localStorage?.getItem(HOME_3D_OVERRIDE_STORAGE_KEY) || "auto",
  )
    .trim()
    .toLowerCase();
  if (rawValue === "on" || rawValue === "off") return rawValue;
  return "auto";
}

export function shouldEnableHome3D({ reduceMotion, isSmallViewport }) {
  const override = getHome3DOverride();
  if (override === "off") return false;
  if (override === "on") return true;

  if (reduceMotion) return false;
  if (typeof navigator === "undefined") return false;
  if (!supportsWebGL()) return false;

  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection?.saveData) return false;

  const effectiveType = String(connection?.effectiveType || "").toLowerCase();
  if (LOW_BANDWIDTH_TYPES.has(effectiveType)) return false;

  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const mobile = isMobileDevice();

  if (memory > 0 && memory < 4) return false;
  if (cores > 0 && cores < 4) return false;

  if (mobile) {
    if (memory > 0 && memory < 6) return false;
    if (cores > 0 && cores < 6) return false;
    if (isSmallViewport && memory > 0 && memory < 8) return false;
  }

  return true;
}
