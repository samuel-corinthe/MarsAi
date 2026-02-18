import useHomeModelViewerController from "../controllers/useHomeModelViewerController";

export default function HomeModelViewer({
  src,
  poster,
  className = "",
  alt = "Objet 3D",
  only = "all",
}) {
  const {
    wrapperRef,
    ready,
    shouldRender,
    canAutoRotate,
    interactionPrompt,
  } = useHomeModelViewerController({ src, only });

  if (!src) return null;
  if (!shouldRender) return null;

  const autoRotateProps = canAutoRotate ? { "auto-rotate": "" } : {};

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
          interaction-prompt={interactionPrompt}
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
