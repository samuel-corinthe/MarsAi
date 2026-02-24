import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentSessionUser, getSitePhaseState } from "../api";
import SocialIcon from "./ui/SocialIcon";

export default function Footer() {
  const { t, i18n } = useTranslation();
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);

  const currentYear = new Date().getFullYear();
  const homePath = i18n.language === "en" ? "/home" : "/accueil";
  const aboutPath = i18n.language === "en" ? "/about" : "/a-propos";
  const agendaPath = i18n.language === "en" ? "/schedule" : "/agenda";
  const juryPath = i18n.language === "en" ? "/jury-eng" : "/jury";
  const partnersPath = i18n.language === "en" ? "/partners" : "/partenaires";
  const callForProjectsPath = i18n.language === "en" ? "/call-for-project" : "/appel-a-projet";
  const submitFilmPath = i18n.language === "en" ? "/submit-film" : "/deposer-un-film";
  const cgvPath = i18n.language === "en" ? "/tos" : "/cgv";
  const cguPath = i18n.language === "en" ? "/gcu" : "/cgu";
  const legalPath = i18n.language === "en" ? "/legal-notice" : "/mentions-legales";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sitePhase, sessionPayload] = await Promise.all([
          getSitePhaseState(),
          getCurrentSessionUser().catch(() => null),
        ]);
        if (cancelled) return;

        const phaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
        const role = String(sessionPayload?.user?.role || "").toLowerCase();
        const hasAdminSession = role === "admin" || role === "superadmin";

        setHideGalleryForVisitors(phaseKey === "phase_1" && !hasAdminSession);
        setHideSubmitForVisitors(
          (phaseKey === "phase_2" || phaseKey === "phase_3") && !hasAdminSession,
        );
      } catch {
        if (cancelled) return;
        setHideGalleryForVisitors(false);
        setHideSubmitForVisitors(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () => [
      {
        title: t("footer.festival"),
        links: [
          { label: t("nav.about"), path: aboutPath },
          { label: t("nav.agenda"), path: agendaPath },
          { label: t("nav.jury"), path: juryPath },
          { label: t("nav.partners"), path: partnersPath },
          { label: t("footer.newsletter"), path: "/newsletter" },
        ],
      },
      {
        title: t("footer.participate"),
        links: [
          { label: t("nav.submitFilm"), path: submitFilmPath, type: "submit" },
          { label: t("nav.callForProjects"), path: callForProjectsPath },
          { label: t("nav.films"), path: i18n.language === "en" ? "/movies" : "/films", type: "gallery" },
        ],
      },
      {
        title: t("footer.legal_title"),
        links: [
          { label: t("nav.terms_gv"), path: cgvPath },
          { label: t("nav.terms_gu"), path: cguPath },
          { label: t("nav.legal"), path: legalPath },
          { label: t("nav.contact"), path: "/contact" },
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
    return true;
  };

  return (
    <footer className="relative border-t border-slate-700/70 bg-slate-950/90">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="site-container py-12 md:py-14">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to={homePath} className="inline-flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-sky-500 text-slate-950 shadow-[0_12px_28px_rgba(14,165,233,0.42)]">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </span>
              <span className="leading-none">
                <span className="block text-2xl font-black uppercase tracking-tight text-white">marsAI</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/85">
                  Festival 2026
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300">{t("footer.description")}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.name}
                  title={social.name}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/70 text-slate-300 transition-colors hover:border-cyan-300/60 hover:text-cyan-200"
                >
                  <SocialIcon network={social.key} className="h-4 w-4" />
                  <span className="sr-only">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/90">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {section.links.filter(shouldShowLink).map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="site-link text-sm font-semibold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-700/70 pt-5 text-center text-xs font-semibold text-slate-400">
          <p>
            {currentYear} marsAI Festival. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
