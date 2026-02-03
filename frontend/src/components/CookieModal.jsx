import React, { useState, useEffect } from "react";
import { useCookies } from "react-cookie";

export default function CookieModal() {
  const [cookies, setCookie] = useCookies(["accept_cookies"]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (cookies.accept_cookies === undefined) {
      setShowModal(true);
    }
  }, [cookies]);

  const acceptCookies = () => {
    setCookie("accept_cookies", "true", { path: "/", maxAge: 31536000 });
    setShowModal(false);
  };

  const declineCookies = () => {
    setCookie("accept_cookies", "false", { path: "/", maxAge: 31536000 });
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 md:right-auto md:max-w-sm z-[10000]">
      <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-1">🍪 Cookies</h4>
          <p className="text-sm text-gray-500 leading-relaxed">
            Nous utilisons des cookies pour optimiser votre navigation sur notre
            site web.
          </p>
        </div>

        {/* Changement ici : flex-row au lieu de flex-col */}
        <div className="flex flex-row gap-3">
          <button
            onClick={acceptCookies}
            className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-100"
          >
            ACCEPTER
          </button>
          <button
            onClick={declineCookies}
            className="flex-1 bg-white-500 hover:bg-gray-200 border border-2 text-grey font-bold py-3 px-4 rounded-xl transition-colors duration-200"
          >
            REFUSER
          </button>
        </div>
      </div>
    </div>
  );
}
