import { useEffect, useRef, useState } from "react";
import {
  FALLBACK_LOAD_DELAY_MS,
  getInteractionPrompt,
  IDLE_LOAD_TIMEOUT_MS,
  MOBILE_VIEWPORT_QUERY,
  OBSERVER_ROOT_MARGIN,
  REDUCED_MOTION_QUERY,
  shouldEnableHome3D,
  shouldAutoRotate,
  shouldRenderForViewport,
} from "../models/homeModelViewerModel";
import { ensureModelViewerScript } from "../services/modelViewerScriptService";

export default function useHomeModelViewerController({ src, only = "all" }) {
  const wrapperRef = useRef(null);
  const supportsIntersectionObserver =
    typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";
  const [hasIntersected, setHasIntersected] = useState(() => !supportsIntersectionObserver);
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
  });

  const shouldRender = shouldRenderForViewport(only, isSmallViewport);
  const canRender3D = shouldEnableHome3D({ reduceMotion, isSmallViewport });
  const canAutoRotate = shouldAutoRotate({ reduceMotion, isSmallViewport });
  const interactionPrompt = getInteractionPrompt(isSmallViewport);
  const isVisible = !supportsIntersectionObserver || hasIntersected;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduceMotion(mediaQueryList.matches);
    update();

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", update);
      return () => mediaQueryList.removeEventListener("change", update);
    }

    mediaQueryList.addListener(update);
    return () => mediaQueryList.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const update = () => setIsSmallViewport(mediaQueryList.matches);
    update();

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", update);
      return () => mediaQueryList.removeEventListener("change", update);
    }

    mediaQueryList.addListener(update);
    return () => mediaQueryList.removeListener(update);
  }, []);

  useEffect(() => {
    if (!src || !shouldRender || !canRender3D || !wrapperRef.current) return;
    if (!supportsIntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN },
    );

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [src, shouldRender, canRender3D, supportsIntersectionObserver]);

  useEffect(() => {
    if (!src || !shouldRender || !canRender3D || !isVisible) return;

    let cancelled = false;

    const startLoad = () => {
      ensureModelViewerScript().then((ok) => {
        if (!cancelled) setReady(ok);
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(startLoad, {
        timeout: IDLE_LOAD_TIMEOUT_MS,
      });

      return () => {
        cancelled = true;
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(startLoad, FALLBACK_LOAD_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [src, shouldRender, canRender3D, isVisible]);

  return {
    wrapperRef,
    ready,
    shouldRender,
    canRender3D,
    canAutoRotate,
    interactionPrompt,
  };
}
