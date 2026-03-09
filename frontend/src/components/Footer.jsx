import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SocialIcon from "./ui/SocialIcon";
import { useTheme } from "../context/ThemeContext";
import usePhaseAccessController from "../controllers/usePhaseAccessController";
import { getLocalizedPath, normalizeLanguage } from "../utils/localizedRoutes";

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const isRtl = normalizeLanguage(i18n.language) === "ar";
  const {
    hideGalleryForVisitors,
    hideSubmitForVisitors,
    hideCallForProjects,
  } = usePhaseAccessController();

  const currentYear = new Date().getFullYear();
  const homePath = getLocalizedPath("home", i18n.language);
  const aboutPath = getLocalizedPath("about", i18n.language);
  const agendaPath = getLocalizedPath("agenda", i18n.language);
  const juryPath = getLocalizedPath("jury", i18n.language);
  const partnersPath = getLocalizedPath("partners", i18n.language);
  const callForProjectsPath = getLocalizedPath("call", i18n.language);
  const submitFilmPath = getLocalizedPath("submitFilm", i18n.language);
  const cgvPath = getLocalizedPath("cgv", i18n.language);
  const cguPath = getLocalizedPath("cgu", i18n.language);
  const legalPath = getLocalizedPath("legal", i18n.language);

  const sections = useMemo(
    () => [
      {
        title: t("footer.festival"),
        links: [
          { label: t("nav.about"), path: aboutPath },
          { label: t("nav.agenda"), path: agendaPath },
          { label: t("nav.jury"), path: juryPath },
          { label: t("nav.partners"), path: partnersPath },
          { label: t("footer.newsletter"), path: getLocalizedPath("newsletter", i18n.language) },
        ],
      },
      {
        title: t("footer.participate"),
        links: [
          { label: t("nav.submitFilm"), path: submitFilmPath, type: "submit" },
          { label: t("nav.callForProjects"), path: callForProjectsPath, type: "call" },
          { label: t("nav.films"), path: getLocalizedPath("films", i18n.language), type: "gallery" },
        ],
      },
      {
        title: t("footer.legal_title"),
        links: [
          { label: t("nav.terms_gv"), path: cgvPath },
          { label: t("nav.terms_gu"), path: cguPath },
          { label: t("nav.legal"), path: legalPath },
          { label: t("nav.contact"), path: getLocalizedPath("contact", i18n.language) },
        ],
      },
    ],
    [
      t,
      aboutPath,
      agendaPath,
      juryPath,
      partnersPath,
      submitFilmPath,
      callForProjectsPath,
      i18n.language,
      cgvPath,
      cguPath,
      legalPath,
    ],
  );

  const socialLinks = [
    { key: "instagram", name: "Instagram", href: "https://www.instagram.com/marsai" },
    { key: "x", name: "X", href: "https://twitter.com/marsai" },
    { key: "youtube", name: "YouTube", href: "https://www.youtube.com/marsai" },
    { key: "linkedin", name: "LinkedIn", href: "https://www.linkedin.com/company/marsai" },
  ];

  const shouldShowLink = (link) => {
    if (link.type === "gallery" && hideGalleryForVisitors) return false;
    if (link.type === "submit" && hideSubmitForVisitors) return false;
    if (link.type === "call" && hideCallForProjects) return false;
    return true;
  };

  const footerClassName = isLight
    ? "relative border-t border-cyan-200/80 bg-[linear-gradient(150deg,rgba(244,250,255,0.96),rgba(226,240,255,0.9))]"
    : "relative border-t border-slate-700/70 bg-slate-950/90";
  const lineClassName = isLight
    ? "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
    : "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent";
  const logoTitleClassName = isLight ? "text-slate-900" : "text-white";
  const logoSubClassName = isLight ? "text-cyan-700/90" : "text-cyan-300/85";
  const descriptionClassName = isLight ? "text-slate-700" : "text-slate-300";
  const socialButtonClassName = isLight
    ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50/80 text-cyan-700 transition-colors hover:border-cyan-300 hover:text-cyan-800"
    : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/60 hover:text-cyan-200";
  const sectionTitleClassName = isLight ? "text-cyan-700" : "text-cyan-200/90";
  const footerLinkClassName = isLight
    ? "text-sm font-semibold text-slate-700 transition-colors hover:text-cyan-700"
    : "site-link text-sm font-semibold";
  const bottomClassName = isLight
    ? "mt-10 border-t border-cyan-200/80 pt-5 text-center text-xs font-semibold text-slate-600"
    : "mt-10 border-t border-slate-700/70 pt-5 text-center text-xs font-semibold text-slate-400";

  return (
    <footer className={footerClassName} dir={isRtl ? "rtl" : "ltr"}>
      <div className={lineClassName} />
      <div className="site-container py-12 md:py-14">
        <div className={`grid gap-10 text-center lg:grid-cols-5 ${isRtl ? "lg:text-right" : "lg:text-left"}`}>
          <div className="lg:col-span-2">
            <Link to={homePath} className={`inline-flex items-center gap-3 justify-center ${isRtl ? "lg:justify-end" : "lg:justify-start"}`}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-sky-500 text-slate-950 shadow-[0_12px_28px_rgba(14,165,233,0.42)]">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </span>
              <span className="leading-none">
                <span className={`block text-2xl font-black uppercase tracking-tight ${logoTitleClassName}`}>marsAI</span>
                <span className={`block text-[11px] font-bold uppercase tracking-[0.22em] ${logoSubClassName}`}>
                  Festival 2026
                </span>
              </span>
            </Link>

            <p className={`mt-5 max-w-md text-sm leading-relaxed mx-auto ${isRtl ? "lg:mr-0 lg:ml-auto" : "lg:mx-0"} ${descriptionClassName}`}>{t("footer.description")}</p>

            <div className={`mt-6 flex flex-wrap items-center justify-center gap-2 ${isRtl ? "lg:justify-end" : "lg:justify-start"}`}>
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.name}
                  className={socialButtonClassName}
                >
                  <SocialIcon network={social.key} className="h-4 w-4" />
                  <span className="sr-only">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h2 className={`text-xs font-black uppercase tracking-[0.18em] ${sectionTitleClassName}`}>
                {section.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.filter(shouldShowLink).map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className={footerLinkClassName}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={bottomClassName}>
          <p>
            {currentYear} marsAI Festival. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
