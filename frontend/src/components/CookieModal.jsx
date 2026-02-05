import React, { useState, useEffect } from "react";
import { useCookies } from "react-cookie";

const CookieModal = () => {
  const [cookies, setCookie] = useCookies(["user_consent"]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Si le cookie n'existe pas, on affiche la modal après 1 seconde
    if (!cookies.user_consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [cookies]);

  const handleConsent = (status) => {
    console.log(`Action: ${status} cliqué`);

    // 1. Sauvegarde du choix dans le navigateur (votre cookie technique)
    setCookie("user_consent", status, {
      path: "/",
      maxAge: 31536000, // 1 an
      sameSite: "lax",
    });

    // 2. Communication CRUCIALE avec GTM
    // On s'assure que le dataLayer est initialisé
    window.dataLayer = window.dataLayer || [];

    // On pousse l'événement que GTM doit écouter
    window.dataLayer.push({
      event: "consent_update",
      consent_status: status,
      // Optionnel: On peut aussi envoyer l'état au Consent Mode de Google
      analytics_storage: status === "accepted" ? "granted" : "denied",
    });

    console.log("Données envoyées au dataLayer :", window.dataLayer);

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-sm z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 text-gray-900">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-bold text-lg leading-tight">🍪 Cookies</h3>
        </div>

        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Nous utilisons des cookies pour analyser notre trafic. En acceptant,
          vous nous aidez à améliorer votre expérience.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleConsent("accepted")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm active:scale-95"
          >
            Tout accepter
          </button>
          <button
            onClick={() => handleConsent("declined")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-xl transition-all duration-200"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieModal;
