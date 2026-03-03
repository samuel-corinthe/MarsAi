import { useTranslation } from "react-i18next";

export default function PageLoader({
  message,
  fullscreen = true,
  compact = false,
}) {
  const { t, i18n } = useTranslation();
  const resolvedMessage = message || t("common.loading", "Loading...");
  const wrapperClassName = fullscreen
    ? "site-loader site-loader--fullscreen"
    : "site-loader";

  return (
    <div
      className={wrapperClassName}
      role="status"
      aria-live="polite"
      aria-busy="true"
      dir={i18n.dir(i18n.language)}
    >
      <div className={`site-loader__panel ${compact ? "site-loader__panel--compact" : ""}`}>
        <span className="site-loader__ring" aria-hidden="true" />
        <p className="site-loader__text">{resolvedMessage}</p>
      </div>
    </div>
  );
}
