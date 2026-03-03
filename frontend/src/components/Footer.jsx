import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentSessionUser, getSitePhaseState } from "../api";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentLang = i18n.language;

  // --- GESTION DES CHEMINS DYNAMIQUES ---
  const getPath = (slugs) => {
    const slug = slugs[currentLang] || slugs["fr"];
    return currentLang === "fr" ? `/${slug}` : `/${currentLang}/${slug}`;
  };

  const homePath = currentLang === "fr" ? "/" : `/${currentLang}`;

  // Définition des slugs pour chaque langue
  const paths = {
    about: { fr: "a-propos", en: "about", ar: "about" },
    agenda: { fr: "agenda", en: "schedule", ar: "schedule" },
    jury: { fr: "jury", en: "jury-eng", ar: "jury" },
    partners: { fr: "partenaires", en: "partners", ar: "partners" },
    submit: { fr: "deposer-un-film", en: "submit-film", ar: "submit-film" },
    call: {
      fr: "appel-a-projet",
      en: "call-for-project",
      ar: "call-for-project",
    },
    cgv: { fr: "cgv", en: "tos", ar: "tos" },
    cgu: { fr: "cgu", en: "gcu", ar: "gcu" },
    legal: { fr: "mentions-legales", en: "legal-notice", ar: "legal-notice" },
  };

  const footerLinks = {
    festival: {
      title: t("footer.festival"),
      links: [
        { name: t("nav.about"), path: getPath(paths.about) },
        { name: t("nav.agenda"), path: getPath(paths.agenda) },
        {
          name: t("footer.newsletter"),
          path:
            currentLang === "fr" ? "/newsletter" : `/${currentLang}/newsletter`,
        },
        { name: t("nav.jury"), path: getPath(paths.jury) },
        { name: t("nav.partners"), path: getPath(paths.partners) },
      ],
    },
    participer: {
      title: t("footer.participate"),
      links: [
        { name: t("nav.submitFilm"), path: getPath(paths.submit) },
        { name: t("nav.callForProjects"), path: getPath(paths.call) },
        { name: t("nav.agenda"), path: getPath(paths.agenda) },
      ],
    },
    legal: {
      title: t("footer.legal_title"),
      links: [
        { name: t("nav.terms_gv"), path: getPath(paths.cgv) },
        { name: t("nav.terms_gu"), path: getPath(paths.cgu) },
        { name: t("nav.legal"), path: getPath(paths.legal) },
        {
          name: t("nav.contact"),
          path: currentLang === "fr" ? "/contact" : `/${currentLang}/contact`,
        },
      ],
    },
  };

  // --- LOGIQUE DE PHASE (API) ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sitePhase = await getSitePhaseState();
        if (cancelled) return;
        const phaseKey = String(
          sitePhase?.currentPhase || "phase_1",
        ).toLowerCase();

        let hasAdminSession = false;
        try {
          const sessionPayload = await getCurrentSessionUser();
          const role = String(sessionPayload?.user?.role || "").toLowerCase();
          hasAdminSession = role === "admin" || role === "superadmin";
        } catch {
          hasAdminSession = false;
        }

        if (!cancelled) {
          setHideGalleryForVisitors(phaseKey === "phase_1" && !hasAdminSession);
          setHideSubmitForVisitors(
            (phaseKey === "phase_2" || phaseKey === "phase_3") &&
              !hasAdminSession,
          );
        }
      } catch {
        setHideGalleryForVisitors(false);
        setHideSubmitForVisitors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="relative bg-black border-t border-gray-900 overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* LOGO & DESC */}
            <div className="lg:col-span-2">
              <Link
                to={homePath}
                className="inline-flex items-center space-x-3 group mb-6"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-7 h-7 text-black"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <div>
                  <span
                    className="text-3xl font-black text-white tracking-tight uppercase"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    marsAI
                  </span>
                  <div className="text-xs text-cyan-400 font-mono tracking-wider -mt-1">
                    FESTIVAL 2026
                  </div>
                </div>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                {t("footer.description")}
              </p>
            </div>

            {/* SECTIONS DE LIENS */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links
                    .filter(
                      (link) =>
                        !hideGalleryForVisitors || !link.path.includes("films"),
                    )
                    .filter(
                      (link) =>
                        !hideSubmitForVisitors ||
                        (!link.path.includes("submit") &&
                          !link.path.includes("deposer")),
                    )
                    .map((link, idx) => (
                      <li key={idx}>
                        <Link
                          to={link.path}
                          className="text-gray-400 hover:text-cyan-400 text-sm transition-colors duration-200 inline-flex items-center group"
                        >
                          <span
                            className={`transform transition-transform duration-200 ${currentLang === "ar" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`}
                          >
                            {link.name}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-gray-900 py-6">
          <div className="flex items-center justify-center text-sm text-gray-500 text-center">
            <p>
              © {currentYear} marsAI Festival. {t("footer.rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
