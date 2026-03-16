import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import PageLoader from "../components/ui/PageLoader";
import { getPublicStats } from "../api";

const COPY = {
  fr: {
    seoTitlePublic: "Statistiques",
    seoTitleDashboard: "Dashboard Stats",
    seoDescription:
      "Chiffres cles du festival MarsAI : films recus, pays representes, langues, sous-titres et outils IA declares.",
    badge: "Observatoire MarsAI",
    titlePublic: "Statistiques du festival",
    titleDashboard: "Stats du festival",
    subtitle:
      "Une lecture simple des films recus, des pays representes, des langues declarees et des outils IA utilises.",
    backHome: "Retour accueil",
    backDashboard: "Retour dashboard",
    openDashboard: "Ouvrir le dashboard",
    openPublic: "Voir la page publique",
    loading: "Chargement des statistiques...",
    errorTitle: "Statistiques indisponibles",
    errorBody:
      "La page ne peut pas afficher les donnees consolidees pour le moment.",
    totalFilms: "Films soumis",
    totalFilmsMeta: "Catalogue actuellement pris en compte",
    totalCountries: "Pays representes",
    totalCountriesMeta: "Cliquez pour voir le detail par pays",
    totalCountriesHint: "Voir la liste",
    totalMinutes: "Minutes cumulees",
    totalMinutesMetaPrefix: "Duree moyenne :",
    totalMinutesSuffix: " min",
    subtitles: "Films sous-titres",
    subtitlesCoveragePrefix: "Couverture :",
    subtitlesCoverageSuffix: "du catalogue",
    originalLanguagesTitle: "Langues originales",
    originalLanguagesBody:
      "Repartition des langues de tournage declarees sur les films.",
    subtitleLanguagesTitle: "Langues de sous-titres",
    subtitleLanguagesBody:
      "Films accompagnes d'une piste de sous-titres exploitable.",
    ageTitle: "Age des realisateurs",
    ageBody:
      "Les ages non renseignes sont isoles pour eviter de fausser la derniere tranche.",
    toolsTitle: "Outils IA utilises",
    toolsBody:
      "Declaration libre des outils de creation mentionnes par les participants.",
    noData: "Aucune donnee disponible.",
    noSubtitlesData: "Aucun film sous-titre pour le moment.",
    withoutSubtitlesSuffix: "sans sous-titres.",
    modalTitle: "Pays representes",
    modalBody:
      "Pays d'origine identifies a partir des films actuellement retenus dans les statistiques.",
    close: "Fermer",
    filmsWord: "film",
    filmsWordPlural: "films",
    percentOfKnownAges: "du total age renseigne",
  },
  en: {
    seoTitlePublic: "Stats",
    seoTitleDashboard: "Dashboard Stats",
    seoDescription:
      "Key MarsAI festival figures: submitted films, represented countries, languages, subtitles and declared AI tools.",
    badge: "MarsAI Observatory",
    titlePublic: "Festival stats",
    titleDashboard: "Festival stats",
    subtitle:
      "A simple overview of submitted films, represented countries, declared languages and AI tools used.",
    backHome: "Back home",
    backDashboard: "Back to dashboard",
    openDashboard: "Open dashboard",
    openPublic: "Open public page",
    loading: "Loading stats...",
    errorTitle: "Stats unavailable",
    errorBody: "The page cannot display consolidated data right now.",
    totalFilms: "Submitted films",
    totalFilmsMeta: "Catalog currently included",
    totalCountries: "Represented countries",
    totalCountriesMeta: "Click to view the detailed list",
    totalCountriesHint: "View list",
    totalMinutes: "Total minutes",
    totalMinutesMetaPrefix: "Average runtime:",
    totalMinutesSuffix: " min",
    subtitles: "Subtitled films",
    subtitlesCoveragePrefix: "Coverage:",
    subtitlesCoverageSuffix: "of catalog",
    originalLanguagesTitle: "Original languages",
    originalLanguagesBody: "Distribution of shooting languages declared on submitted films.",
    subtitleLanguagesTitle: "Subtitle languages",
    subtitleLanguagesBody: "Films accompanied by a usable subtitle track.",
    ageTitle: "Directors age",
    ageBody: "Missing ages are isolated so the last bracket is not inflated.",
    toolsTitle: "AI tools used",
    toolsBody: "Free-form declaration of creation tools mentioned by participants.",
    noData: "No data available.",
    noSubtitlesData: "No subtitled film at the moment.",
    withoutSubtitlesSuffix: "without subtitles.",
    modalTitle: "Represented countries",
    modalBody: "Country of origin identified from films currently counted in the stats.",
    close: "Close",
    filmsWord: "film",
    filmsWordPlural: "films",
    percentOfKnownAges: "of known-age total",
  },
  ar: {
    seoTitlePublic: "الإحصاءات",
    seoTitleDashboard: "إحصاءات اللوحة",
    seoDescription:
      "أرقام مهرجان MarsAI: الأفلام المرسلة، الدول الممثلة، اللغات، الترجمات والأدوات المعتمدة على الذكاء الاصطناعي.",
    badge: "مرصد MarsAI",
    titlePublic: "إحصاءات المهرجان",
    titleDashboard: "إحصاءات المهرجان",
    subtitle:
      "نظرة واضحة على الأفلام المرسلة، الدول الممثلة، اللغات المعلنة وأدوات الذكاء الاصطناعي المستخدمة.",
    backHome: "العودة إلى الرئيسية",
    backDashboard: "العودة إلى اللوحة",
    openDashboard: "فتح اللوحة",
    openPublic: "عرض الصفحة العامة",
    loading: "جار تحميل الإحصاءات...",
    errorTitle: "الإحصاءات غير متاحة",
    errorBody: "لا يمكن عرض البيانات المجمعة حالياً.",
    totalFilms: "الأفلام المرسلة",
    totalFilmsMeta: "الكتالوج المعتمد حالياً",
    totalCountries: "الدول الممثلة",
    totalCountriesMeta: "اضغط لعرض القائمة التفصيلية",
    totalCountriesHint: "عرض القائمة",
    totalMinutes: "إجمالي الدقائق",
    totalMinutesMetaPrefix: "متوسط المدة:",
    totalMinutesSuffix: " دقيقة",
    subtitles: "أفلام مترجمة",
    subtitlesCoveragePrefix: "التغطية:",
    subtitlesCoverageSuffix: "من الكتالوج",
    originalLanguagesTitle: "اللغات الأصلية",
    originalLanguagesBody: "توزيع لغات التصوير المعلنة في الأفلام.",
    subtitleLanguagesTitle: "لغات الترجمة",
    subtitleLanguagesBody: "الأفلام التي تحتوي على مسار ترجمة قابل للاستخدام.",
    ageTitle: "أعمار المخرجين",
    ageBody: "يتم عزل الأعمار غير المعلنة حتى لا تتضخم الفئة الأخيرة.",
    toolsTitle: "أدوات الذكاء الاصطناعي المستخدمة",
    toolsBody: "تصريح حر بالأدوات المذكورة من قبل المشاركين.",
    noData: "لا توجد بيانات متاحة.",
    noSubtitlesData: "لا يوجد أي فيلم مترجم حالياً.",
    withoutSubtitlesSuffix: "بدون ترجمة.",
    modalTitle: "الدول الممثلة",
    modalBody: "بلدان المنشأ المحددة انطلاقاً من الأفلام المحتسبة حالياً في الإحصاءات.",
    close: "إغلاق",
    filmsWord: "فيلم",
    filmsWordPlural: "أفلام",
    percentOfKnownAges: "من إجمالي الأعمار المعلنة",
  },
};

const AGE_LABELS = {
  "Moins de 25 ans": {
    fr: "Moins de 25 ans",
    en: "Under 25",
    ar: "أقل من 25 سنة",
  },
  "25 - 35 ans": {
    fr: "25 - 35 ans",
    en: "25 - 35",
    ar: "25 - 35 سنة",
  },
  "36 - 45 ans": {
    fr: "36 - 45 ans",
    en: "36 - 45",
    ar: "36 - 45 سنة",
  },
  "46 - 55 ans": {
    fr: "46 - 55 ans",
    en: "46 - 55",
    ar: "46 - 55 سنة",
  },
  "55 ans et plus": {
    fr: "55 ans et plus",
    en: "55 and above",
    ar: "55 سنة فما فوق",
  },
  "Age non renseigne": {
    fr: "Age non renseigne",
    en: "Age not provided",
    ar: "العمر غير محدد",
  },
};

function resolveLocale(language) {
  if (language === "en") return "en-US";
  if (language === "ar") return "ar-EG";
  return "fr-FR";
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function getFilmLabel(count, content) {
  return Number(count) > 1 ? content.filmsWordPlural : content.filmsWord;
}

function translateAgeRange(label, language) {
  return AGE_LABELS[String(label || "").trim()]?.[language] || label;
}

function useCountUp(target, enabled) {
  const [value, setValue] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      setTriggered(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const safeTarget = Number(target) || 0;
    if (!enabled || !triggered || safeTarget <= 0) {
      setValue(safeTarget);
      return undefined;
    }

    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / 1400, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * safeTarget));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, target, triggered]);

  return { value, ref };
}

function FlagBadge({ alpha2 }) {
  if (!alpha2) {
    return (
      <span className="flex h-[18px] w-6 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-slate-200">
        --
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w20/${String(alpha2).toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${String(alpha2).toLowerCase()}.png 2x`}
      width="20"
      height="15"
      alt={alpha2}
      className="rounded-sm shrink-0"
      loading="lazy"
    />
  );
}

function KpiCard({
  dashboardMode,
  label,
  target,
  locale,
  suffix = "",
  meta = "",
  toneClass = "text-cyan-200",
  onClick,
  hint = "",
}) {
  const { value, ref } = useCountUp(target, true);
  const Component = onClick ? "button" : "div";
  const baseClass = dashboardMode
    ? "stat-card min-h-[180px] text-left"
    : "site-panel site-panel-solid min-h-[180px] text-left";
  const interactiveClass = onClick
    ? "cursor-pointer transition hover:-translate-y-1 hover:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
    : "";

  return (
    <Component
      ref={ref}
      {...(onClick ? { type: "button", onClick } : {})}
      className={`${baseClass} ${interactiveClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="kpi-label">{label}</p>
        {hint ? <span className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">{hint}</span> : null}
      </div>
      <div className={`kpi-value text-4xl ${toneClass}`}>
        {formatNumber(value, locale)}
        {suffix}
      </div>
      {meta ? <p className="text-sm text-slate-200/80">{meta}</p> : null}
    </Component>
  );
}

function BarRow({
  label,
  count,
  total,
  locale,
  content,
  gradient = "linear-gradient(90deg,#22d3ee,#38bdf8,#818cf8)",
}) {
  const pct = total > 0 ? Math.round((Number(count) / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-slate-300/80">
          {formatNumber(count, locale)} {getFilmLabel(count, content)} - {pct}%
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: gradient }} />
      </div>
    </div>
  );
}

function SectionPanel({ dashboardMode, title, body, children }) {
  const className = dashboardMode ? "list-card space-y-5" : "site-panel site-panel-solid space-y-5";

  return (
    <section className={className}>
      <div>
        <h2 className={dashboardMode ? "text-xl font-black uppercase tracking-tight text-white" : "site-section-title"}>
          {title}
        </h2>
        <p className={dashboardMode ? "mt-2 text-sm text-slate-300/80" : "site-section-subtitle"}>
          {body}
        </p>
      </div>
      {children}
    </section>
  );
}

function CountriesModal({
  countries,
  dashboardMode,
  content,
  locale,
  onClose,
  dir,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const panelClass = dashboardMode ? "glass" : "site-panel site-panel-solid";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-countries-title"
        dir={dir}
        className={`${panelClass} w-full max-w-2xl max-h-[85vh] overflow-hidden`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h2 id="stats-countries-title" className="text-xl font-black uppercase tracking-tight text-white">
              {content.modalTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-300/80">
              {countries.length} {content.modalBody}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={dashboardMode ? "btn-ghost rounded-full px-4 py-2 border border-white/10" : "site-btn-secondary"}
          >
            {content.close}
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <ul className="space-y-2">
            {countries.map((country, index) => (
              <li
                key={`${country.alpha2 || "xx"}-${country.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs text-slate-300/70">{index + 1}</span>
                  <FlagBadge alpha2={country.alpha2} />
                  <span className="font-semibold text-white">{country.name}</span>
                </div>
                <span className="text-sm font-bold text-cyan-200">
                  {formatNumber(country.count, locale)} {getFilmLabel(country.count, content)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage({ dashboardMode = false }) {
  const language = "fr";
  const content = COPY.fr;
  const locale = resolveLocale(language);
  const dir = "ltr";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countriesOpen, setCountriesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getPublicStats();
        if (!cancelled) {
          setStats(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || content.errorBody);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [content.errorBody]);

  const backPath = "/dashboard";
  const backLabel = content.backDashboard;
  const pageTitle = content.seoTitleDashboard;

  if (loading) {
    return (
      <>
        <Seo title={`${pageTitle} - MarsAI`} description={content.seoDescription} noIndex />
        <div className={dashboardMode ? "dash-page" : "site-page"} dir={dir}>
          <PageLoader message={content.loading} />
        </div>
      </>
    );
  }

  if (error || !stats) {
    const wrapperClass = dashboardMode ? "dash-page" : "site-page py-14";
    const containerClass = dashboardMode ? "dash-shell" : "site-container";
    const panelClass = dashboardMode ? "glass p-8 space-y-4" : "site-panel site-panel-solid mx-auto max-w-4xl space-y-4";

    return (
      <>
        <Seo title={`${pageTitle} - MarsAI`} description={content.seoDescription} noIndex />
        <main className={wrapperClass} dir={dir}>
          <div className={containerClass}>
            <div className={panelClass}>
              <span className={dashboardMode ? "pill pill-blue stats-dashboard-kicker" : "site-kicker"}>
                {content.badge}
              </span>
              <h1 className={dashboardMode ? "dash-title text-white" : "site-title"}>{content.errorTitle}</h1>
              <p className={dashboardMode ? "dash-subtitle stats-dashboard-subtitle" : "site-subtitle"}>
                {content.errorBody}
              </p>
              <p className="text-sm text-rose-300">{error || content.noData}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={backPath}
                  className={dashboardMode ? "btn-ghost rounded-full px-4 py-2 border border-white/10" : "site-btn-secondary"}
                >
                  {backLabel}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const languages = Array.isArray(stats.languages) ? stats.languages : [];
  const subtitleLanguages = Array.isArray(stats.subtitleLanguages) ? stats.subtitleLanguages : [];
  const ageGroups = Array.isArray(stats.ageGroups) ? stats.ageGroups : [];
  const countries = Array.isArray(stats.countries) ? stats.countries : [];
  const aiTools = Array.isArray(stats.aiTools) ? stats.aiTools : [];
  const totalFilms = Number(stats.totalFilms) || 0;
  const totalCountries = Number(stats.totalCountries) || 0;
  const totalMinutes = Number(stats.totalMinutes) || 0;
  const avgMinutes = Number(stats.avgMinutes) || 0;
  const filmsWithSubtitles = Number(stats.filmsWithSubtitles) || 0;
  const filmsWithoutSubtitles = Math.max(0, totalFilms - filmsWithSubtitles);
  const totalFilmsForLang = languages.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const totalFilmsForSub = subtitleLanguages.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const totalFilmsForAge = ageGroups.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const totalAiUsages = aiTools.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const subtitleCoverage = totalFilms > 0
    ? Math.round((filmsWithSubtitles / totalFilms) * 100)
    : 0;
  const wrapperClass = dashboardMode ? "dash-page" : "site-page py-14";
  const containerClass = dashboardMode ? "dash-shell space-y-6" : "site-container space-y-10";
  const heroClass = dashboardMode ? "glass p-6 md:p-8" : "site-hero";

  return (
    <>
      <Seo title={`${pageTitle} - MarsAI`} description={content.seoDescription} noIndex />

      {countriesOpen && countries.length > 0 ? (
        <CountriesModal
          countries={countries}
          dashboardMode={dashboardMode}
          content={content}
          locale={locale}
          onClose={() => setCountriesOpen(false)}
          dir={dir}
        />
      ) : null}

      <main className={wrapperClass} dir={dir}>
        <div className={containerClass}>
          <header className={heroClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <span className={dashboardMode ? "pill pill-cyan stats-dashboard-kicker" : "site-kicker stats-public-kicker"}>
                  {content.badge}
                </span>
                <h1 className={dashboardMode ? "dash-title mt-4 text-white" : "site-title mt-5"}>
                  {dashboardMode ? content.titleDashboard : content.titlePublic}
                </h1>
                <p className={dashboardMode ? "dash-subtitle stats-dashboard-subtitle" : "site-subtitle stats-public-subtitle"}>
                  {content.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={backPath}
                  className={dashboardMode ? "btn-ghost rounded-full px-4 py-2 border border-white/10" : "site-btn-secondary"}
                >
                  {backLabel}
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              dashboardMode={dashboardMode}
              label={content.totalFilms}
              target={totalFilms}
              locale={locale}
              meta={content.totalFilmsMeta}
              toneClass="text-cyan-200"
            />
            <KpiCard
              dashboardMode={dashboardMode}
              label={content.totalCountries}
              target={totalCountries}
              locale={locale}
              meta={content.totalCountriesMeta}
              toneClass="text-emerald-200"
              onClick={() => setCountriesOpen(true)}
              hint={content.totalCountriesHint}
            />
            <KpiCard
              dashboardMode={dashboardMode}
              label={content.totalMinutes}
              target={totalMinutes}
              locale={locale}
              suffix={content.totalMinutesSuffix}
              meta={`${content.totalMinutesMetaPrefix} ${formatNumber(avgMinutes, locale)}${content.totalMinutesSuffix}`}
              toneClass="text-indigo-200"
            />
            <KpiCard
              dashboardMode={dashboardMode}
              label={content.subtitles}
              target={filmsWithSubtitles}
              locale={locale}
              meta={`${content.subtitlesCoveragePrefix} ${subtitleCoverage}% ${content.subtitlesCoverageSuffix}`}
              toneClass="text-cyan-100"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <SectionPanel
              dashboardMode={dashboardMode}
              title={content.originalLanguagesTitle}
              body={content.originalLanguagesBody}
            >
              {languages.length === 0 ? (
                <p className="text-sm text-slate-300/80">{content.noData}</p>
              ) : (
                <div className="space-y-4">
                  {languages.map((item) => (
                    <BarRow
                      key={`lang-${item.language}`}
                      label={item.language}
                      count={item.count}
                      total={totalFilmsForLang}
                      locale={locale}
                      content={content}
                    />
                  ))}
                </div>
              )}
            </SectionPanel>

            <SectionPanel
              dashboardMode={dashboardMode}
              title={content.subtitleLanguagesTitle}
              body={content.subtitleLanguagesBody}
            >
              {subtitleLanguages.length === 0 ? (
                <p className="text-sm text-slate-300/80">{content.noSubtitlesData}</p>
              ) : (
                <div className="space-y-4">
                  {subtitleLanguages.map((item) => (
                    <BarRow
                      key={`subtitle-${item.language}`}
                      label={item.language}
                      count={item.count}
                      total={totalFilmsForSub}
                      locale={locale}
                      content={content}
                      gradient="linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa)"
                    />
                  ))}
                  <p className="text-sm text-slate-300/80">
                    {formatNumber(filmsWithoutSubtitles, locale)} {getFilmLabel(filmsWithoutSubtitles, content)} {content.withoutSubtitlesSuffix}
                  </p>
                </div>
              )}
            </SectionPanel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
            <SectionPanel
              dashboardMode={dashboardMode}
              title={content.ageTitle}
              body={content.ageBody}
            >
              {ageGroups.length === 0 ? (
                <p className="text-sm text-slate-300/80">{content.noData}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {ageGroups.map((group) => {
                    const count = Number(group.count) || 0;
                    const pct = totalFilmsForAge > 0 ? Math.round((count / totalFilmsForAge) * 100) : 0;

                    return (
                      <div
                        key={`age-${group.ageRange}`}
                        className={dashboardMode ? "stat-card min-h-[160px] justify-between" : "site-panel site-panel-solid min-h-[160px] justify-between"}
                      >
                        <div className="kpi-label">{translateAgeRange(group.ageRange, language)}</div>
                        <div className="kpi-value text-white">{formatNumber(count, locale)}</div>
                        <div className="text-sm text-slate-300/80">
                          {pct}% {content.percentOfKnownAges}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionPanel>

            <SectionPanel
              dashboardMode={dashboardMode}
              title={content.toolsTitle}
              body={content.toolsBody}
            >
              {aiTools.length === 0 ? (
                <p className="text-sm text-slate-300/80">{content.noData}</p>
              ) : (
                <div className="space-y-4">
                  {aiTools.map((tool) => (
                    <BarRow
                      key={`tool-${tool.tool}`}
                      label={tool.tool}
                      count={tool.count}
                      total={totalAiUsages}
                      locale={locale}
                      content={content}
                      gradient="linear-gradient(90deg,#2dd4bf,#22d3ee,#38bdf8)"
                    />
                  ))}
                </div>
              )}
            </SectionPanel>
          </section>
        </div>

        <style>{`
          body[data-theme="light"] .stats-dashboard-kicker {
            border-color: rgba(59, 130, 246, 0.5) !important;
            color: #1d4ed8 !important;
            background: rgba(219, 234, 254, 0.88) !important;
          }

          body[data-theme="light"] .stats-dashboard-subtitle {
            color: #1e293b !important;
          }

          body[data-theme="light"] .stats-public-kicker {
            border-color: rgba(59, 130, 246, 0.5) !important;
            color: #1d4ed8 !important;
            background: rgba(219, 234, 254, 0.88) !important;
          }

          body[data-theme="light"] .stats-public-subtitle {
            color: #1e293b !important;
          }
        `}</style>
      </main>
    </>
  );
}
