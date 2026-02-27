import { useEffect, useRef, useState } from "react";
import useHomeModelViewerController from "../controllers/useHomeModelViewerController";
import { withDeploymentBase } from "../utils/deploymentPath";

const DEFAULT_FALLBACK_IMAGE = withDeploymentBase("/images/robot.png");

function SafeFallbackImage({ src, alt }) {
  const [resolvedSrc, setResolvedSrc] = useState(src || DEFAULT_FALLBACK_IMAGE);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (resolvedSrc !== DEFAULT_FALLBACK_IMAGE) {
          setResolvedSrc(DEFAULT_FALLBACK_IMAGE);
        }
      }}
      className="h-full w-full rounded-2xl border border-cyan-300/30 object-cover shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    />
  );
}

export default function HomeModelViewer({
  src,
  poster,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  className = "",
  alt = "Objet 3D",
  only = "all",
}) {
  const modelViewerRef = useRef(null);
  const [forceImageFallback, setForceImageFallback] = useState(false);
  const {
    wrapperRef,
    ready,
    shouldRender,
    canRender3D,
    canAutoRotate,
    interactionPrompt,
  } = useHomeModelViewerController({ src, only });
  const primaryFallbackSrc = fallbackSrc || DEFAULT_FALLBACK_IMAGE;

  useEffect(() => {
    setForceImageFallback(false);
  }, [src, only]);

  useEffect(() => {
    if (!src || !ready || !canRender3D || forceImageFallback) return;
    const viewer = modelViewerRef.current;
    if (!viewer) return;

    const handleError = () => {
      setForceImageFallback(true);
    };

    viewer.addEventListener("error", handleError);

    return () => {
      viewer.removeEventListener("error", handleError);
    };
  }, [src, ready, canRender3D, forceImageFallback]);

  if (!src && !fallbackSrc) return null;
  if (!shouldRender) return null;

  const autoRotateProps = canAutoRotate ? { "auto-rotate": "" } : {};
  const show3D = Boolean(src && canRender3D && ready && !forceImageFallback);

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden="true"
      style={{ touchAction: "pan-y" }}
    >
      {show3D ? (
        <model-viewer
          ref={modelViewerRef}
          {...autoRotateProps}
          src={src}
          poster={poster}
          alt={alt}
          loading="lazy"
          autoplay
          rotation-per-second="12deg"
          disable-zoom
          camera-controls
          interaction-prompt={interactionPrompt}
          shadow-intensity="0.6"
          exposure="1"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        primaryFallbackSrc ? (
          <SafeFallbackImage
            key={primaryFallbackSrc}
            src={primaryFallbackSrc}
            alt={alt}
          />
        ) : (
          <div className="h-full w-full rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/30 via-blue-500/10 to-transparent shadow-[0_20px_80px_rgba(0,0,0,0.45)]" />
        )
      )}
    </div>
  );
}
