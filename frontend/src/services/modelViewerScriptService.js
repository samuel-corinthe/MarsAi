import { getModelViewerSources } from "../models/homeModelViewerModel";

let modelViewerLoadPromise = null;

function isModelViewerReady() {
  if (typeof window === "undefined") return false;
  return Boolean(window.customElements?.get("model-viewer"));
}

function loadScriptOnce(src) {
  return new Promise((resolve) => {
    const existing = document.querySelector(
      `script[data-model-viewer="true"][src="${src}"]`,
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve(true);
        return;
      }

      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.dataset.modelViewer = "true";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };
    script.onerror = () => {
      script.remove();
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

async function loadModelViewerScript() {
  if (isModelViewerReady()) return true;

  try {
    await import("@google/model-viewer");
    if (isModelViewerReady()) return true;
  } catch {
    // Keep fallback script sources below.
  }

  const sources = getModelViewerSources();
  for (const src of sources) {
    const loaded = await loadScriptOnce(src);
    if (loaded && isModelViewerReady()) return true;
  }

  return false;
}

export function ensureModelViewerScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isModelViewerReady()) return Promise.resolve(true);

  if (!modelViewerLoadPromise) {
    modelViewerLoadPromise = loadModelViewerScript().then((ready) => {
      if (!ready) {
        modelViewerLoadPromise = null;
      }
      return ready;
    });
  }

  return modelViewerLoadPromise;
}
