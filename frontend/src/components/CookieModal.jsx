import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { useTheme } from "../context/ThemeContext";

export default function CookieModal() {
  const { isLight } = useTheme();
  const [cookies, setCookie] = useCookies(["user_consent"]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (cookies.user_consent) return;
    const timer = setTimeout(() => setIsVisible(true), 900);
    return () => clearTimeout(timer);
  }, [cookies]);

  const handleConsent = (status) => {
    setCookie("user_consent", status, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "consent_update",
      consent_status: status,
      analytics_storage: status === "accepted" ? "granted" : "denied",
    });

    setIsVisible(false);
  };

  if (!isVisible) return null;

  const panelClassName = isLight
    ? "site-panel border-cyan-300/60 bg-[linear-gradient(145deg,rgba(248,252,255,0.96),rgba(230,243,255,0.92))] text-slate-900"
    : "site-panel site-panel-solid border-cyan-300/30";
  const titleClassName = isLight ? "text-slate-900" : "text-white";
  const textClassName = isLight ? "text-slate-600" : "text-slate-300";

  return (
    <div className="fixed bottom-5 left-4 right-4 z-[120] md:left-auto md:right-6 md:max-w-sm">
      <div
        role="dialog"
        aria-labelledby="cookie-modal-title"
        className={`${panelClassName} p-5`}
      >
        <p className="site-kicker">Cookies</p>
        <h3 id="cookie-modal-title" className={`mt-3 text-lg font-black uppercase tracking-tight ${titleClassName}`}>Gestion des cookies</h3>
        <p className={`mt-2 text-sm leading-relaxed ${textClassName}`}>
          Nous utilisons des cookies pour mesurer l'audience et ameliorer l'experience utilisateur.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" className="site-btn-primary px-4 py-2.5" onClick={() => handleConsent("accepted")}>
            Accepter
          </button>
          <button type="button" className="site-btn-secondary px-4 py-2.5" onClick={() => handleConsent("declined")}>
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}
