const FALLBACK_MODEL_VIEWER_SOURCES = [
  "/vendor/model-viewer.min.js",
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js",
];

export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const OBSERVER_ROOT_MARGIN = "200px";
export const IDLE_LOAD_TIMEOUT_MS = 1200;
export const FALLBACK_LOAD_DELAY_MS = 300;

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
