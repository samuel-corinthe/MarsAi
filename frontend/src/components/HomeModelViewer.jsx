import { useEffect, useRef, useState } from "react";

const MODEL_VIEWER_SOURCES = [
  import.meta.env.VITE_MODEL_VIEWER_SRC,
  "/vendor/model-viewer.min.js",
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js",
].filter(Boolean);

const loadScriptOnce = (src) =>
  new Promise((resolve) => {
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

const loadModelViewerScript = async () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.customElements?.get("model-viewer")) return Promise.resolve(true);

  try {
    await import("@google/model-viewer");
    if (window.customElements?.get("model-viewer")) return true;
  } catch (err) {
    // Fallback to script sources if module import fails.
  }

  for (const src of MODEL_VIEWER_SOURCES) {
    const ok = await loadScriptOnce(src);
    if (ok && window.customElements?.get("model-viewer")) return true;
  }
  return false;
};

export default function HomeModelViewer({
  src,
  poster,
  className = "",
  alt = "Objet 3D",
}) {
  const wrapperRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!src || !shouldLoad) return;
    let cancelled = false;
    const startLoad = () => {
      loadModelViewerScript().then((ok) => {
        if (!cancelled) setReady(ok);
      });
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startLoad, { timeout: 1200 });
    } else {
      setTimeout(startLoad, 300);
    }
    return () => {
      cancelled = true;
    };
  }, [src, shouldLoad]);

  if (!src) return null;

  const autoRotateProps = reduceMotion ? {} : { "auto-rotate": "" };

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden="true"
      style={{ touchAction: "pan-y" }}
    >
      {ready ? (
        <model-viewer
          {...autoRotateProps}
          src={src}
          poster={poster}
          alt={alt}
          loading="lazy"
          autoplay
          rotation-per-second="12deg"
          disable-zoom
          camera-controls
          interaction-prompt="none"
          shadow-intensity="0.6"
          exposure="1"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400/30 via-blue-500/10 to-transparent border border-cyan-300/30 shadow-[0_20px_80px_rgba(0,0,0,0.45)]" />
      )}
    </div>
  );
}
