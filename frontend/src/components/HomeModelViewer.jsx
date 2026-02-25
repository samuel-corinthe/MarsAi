import { useState } from "react";
import useHomeModelViewerController from "../controllers/useHomeModelViewerController";

function SafeFallbackImage({ src, alt }) {
  const [resolvedSrc, setResolvedSrc] = useState(src || "/images/robot.png");

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (resolvedSrc !== "/images/robot.png") {
          setResolvedSrc("/images/robot.png");
        }
      }}
      className="h-full w-full rounded-2xl border border-cyan-300/30 object-cover shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
    />
  );
}

export default function HomeModelViewer({
  src,
  poster,
  fallbackSrc = "/images/robot.png",
  className = "",
  alt = "Objet 3D",
  only = "all",
}) {
  const {
    wrapperRef,
    ready,
    shouldRender,
    canRender3D,
    canAutoRotate,
    interactionPrompt,
  } = useHomeModelViewerController({ src, only });
  const primaryFallbackSrc = fallbackSrc || "/images/robot.png";

  if (!src && !fallbackSrc) return null;
  if (!shouldRender) return null;

  const autoRotateProps = canAutoRotate ? { "auto-rotate": "" } : {};
  const show3D = Boolean(src && canRender3D && ready);

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden="true"
      style={{ touchAction: "pan-y" }}
    >
      {show3D ? (
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
