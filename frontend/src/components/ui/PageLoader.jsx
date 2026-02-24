export default function PageLoader({
  message = "Chargement...",
  fullscreen = true,
  compact = false,
}) {
  const wrapperClassName = fullscreen
    ? "site-loader site-loader--fullscreen"
    : "site-loader";

  return (
    <div className={wrapperClassName} role="status" aria-live="polite" aria-busy="true">
      <div className={`site-loader__panel ${compact ? "site-loader__panel--compact" : ""}`}>
        <span className="site-loader__ring" aria-hidden="true" />
        <p className="site-loader__text">{message}</p>
      </div>
    </div>
  );
}
