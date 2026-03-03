import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { BreadcrumbSchema, ArticleSchema } from "../components/Schema";
import PageLoader from "../components/ui/PageLoader";
import {
  getPageBySlug,
  getSitePhaseState,
  getWpPostsByCategory,
  sendContactForm,
} from "../api";
import Home from "./Home";
import JuryWpage from "./jury";
import NotFound from "./NotFound";
import LegalPage from "./LegalPage";
import CallForProject from "./Appel a projet";
import { useTheme } from "../context/ThemeContext";
import {
  buildLocalizedSlugPath,
  getLocalizedPath,
} from "../utils/localizedRoutes";

const normalizeAgendaTagKey = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractAgendaTerms = (embeddedTerms, agendaCategoryId) => {
  const termGroups = Array.isArray(embeddedTerms) ? embeddedTerms : [];
  const flattened = termGroups.flatMap((group) =>
    Array.isArray(group) ? group : [],
  );

  const relevant = flattened.filter((term) => {
    if (!term || typeof term !== "object") return false;
    const taxonomy = String(term.taxonomy || "");
    if (taxonomy === "category") return term.id !== agendaCategoryId;
    if (taxonomy === "post_tag") return true;
    if (taxonomy === "post_format") return false;
    return Boolean(term.slug || term.name);
  });

  const uniqueByKey = new Map();
  relevant.forEach((term) => {
    const taxonomy = String(term.taxonomy || "term");
    const key =
      term.id != null
        ? `${taxonomy}:${term.id}`
        : `${taxonomy}:${String(term.slug || term.name || "").toLowerCase()}`;
    if (!uniqueByKey.has(key)) uniqueByKey.set(key, term);
  });

  return Array.from(uniqueByKey.values());
};

const inferAgendaFallbackTerms = (post, existingTerms) => {
  if (Array.isArray(existingTerms) && existingTerms.length > 0) {
    return existingTerms;
  }

  const seed = [
    post?.title?.rendered || "",
    post?.excerpt?.rendered || "",
    post?.content?.rendered || "",
  ]
    .map((part) => stripHtml(part))
    .join(" ");

  const normalized = normalizeAgendaTagKey(seed);
  if (
    normalized.includes("home_and_coffee_networking") ||
    (normalized.includes("coffee") && normalized.includes("network"))
  ) {
    return [
      {
        id: `fallback-home-coffee-${post?.id || "x"}`,
        slug: "home-and-coffee-networking",
        name: "Home and coffee Networking",
        taxonomy: "fallback_tag",
      },
    ];
  }

  if (normalized.includes("networking")) {
    return [
      {
        id: `fallback-networking-${post?.id || "x"}`,
        slug: "networking",
        name: "Networking",
        taxonomy: "fallback_tag",
      },
    ];
  }

  return [];
};

const buildTranslationSignature = (translations) => {
  if (!translations || typeof translations !== "object") return "";
  const ids = Object.values(translations)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b);
  return ids.length ? ids.join("-") : "";
};

const findMatchingAgendaArticle = (previousArticle, items, targetLanguage) => {
  if (!previousArticle || !Array.isArray(items) || items.length === 0)
    return null;

  const previousTranslations = previousArticle.translations;
  if (
    previousTranslations &&
    typeof previousTranslations === "object" &&
    previousTranslations[targetLanguage]
  ) {
    const targetId = Number(previousTranslations[targetLanguage]);
    const matchByTranslatedId = items.find(
      (item) => Number(item.id) === targetId,
    );
    if (matchByTranslatedId) return matchByTranslatedId;
  }

  if (previousArticle.translationSignature) {
    const matchBySignature = items.find(
      (item) =>
        item.translationSignature &&
        item.translationSignature === previousArticle.translationSignature,
    );
    if (matchBySignature) return matchBySignature;
  }

  if (previousArticle.slug) {
    const matchBySlug = items.find(
      (item) => item.slug === previousArticle.slug,
    );
    if (matchBySlug) return matchBySlug;
  }

  if (previousArticle.date && previousArticle.heure) {
    const matchByDateHour = items.find(
      (item) =>
        item.date === previousArticle.date &&
        item.heure === previousArticle.heure,
    );
    if (matchByDateHour) return matchByDateHour;
  }

  const previousTitleKey = normalizeAgendaTagKey(
    stripHtml(previousArticle.titleText || previousArticle.titre || ""),
  );
  if (previousTitleKey) {
    const matchByTitle = items.find(
      (item) =>
        normalizeAgendaTagKey(stripHtml(item.titleText || item.titre || "")) ===
        previousTitleKey,
    );
    if (matchByTitle) return matchByTitle;
  }

  if (previousArticle.date) {
    const matchByDate = items.find(
      (item) => item.date === previousArticle.date,
    );
    if (matchByDate) return matchByDate;
  }

  return null;
};

export default function WpPage({ isHome = false, fixedSlug = null }) {
  const { slug: routeSlug } = useParams();
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const routeSlugMapping = {
    agenda: { fr: "agenda", en: "schedule", ar: "schedule" },
    home: { fr: "accueil", en: "home", ar: "home" },
    call: {
      fr: "appel-a-projet",
      en: "call-for-project",
      ar: "call-for-project",
    },
    jury: { fr: "jury", en: "jury", ar: "jury" },
    contact: { fr: "contact", en: "contact", ar: "contact" },
    legal: { fr: "mentions-legales", en: "legal-notice", ar: "legal-notice" },
    cgu: { fr: "cgu", en: "gcu", ar: "gcu" },
    cgv: { fr: "cgv", en: "tos", ar: "tos" },
  };
  const wpSlugMapping = {
    agenda: { fr: "agenda", en: "schedule", ar: "برنامج" },
    home: { fr: "accueil", en: "home", ar: "home-ar" },
    call: {
      fr: "appel-a-projet",
      en: "call-for-project",
      ar: "call-for-project",
    },
    jury: { fr: "jury", en: "jury-eng", ar: "jury-ar" },
    contact: { fr: "contact", en: "contact", ar: "contact" },
    legal: { fr: "mentions-legales", en: "legal-notice", ar: "إشعار-قانوني" },
    cgu: { fr: "cgu", en: "tos", ar: "cgu-ar" },
    cgv: { fr: "cgv", en: "gcu", ar: "cgv-ar" },
  };
  const slugAliases = {
    "call-for-projects": "call-for-project",
  };
  const legalVariantBySlug = {
    cgv: "cgv",
    tos: "cgu",
    cgu: "cgu",
    gcu: "cgv",
    "mentions-legales": "mentions",
    "legal-notice": "mentions",
  };

  const findSlugMappingKey = (mapping, value) => {
    if (!value) return null;

    const normalizedValue = slugAliases[value] || value;
    const match = Object.entries(mapping).find(([, localizedSlugs]) =>
      Object.values(localizedSlugs).includes(normalizedValue),
    );

    return match ? match[0] : null;
  };

  const resolvePageKey = (value) =>
    findSlugMappingKey(wpSlugMapping, value) ||
    findSlugMappingKey(routeSlugMapping, value) ||
    (value ? slugAliases[value] || value : null);

  const getActiveSlug = () => {
    const lang = i18n.language || "fr";
    const pageKey = isHome ? "home" : resolvePageKey(fixedSlug || routeSlug);

    if (pageKey && wpSlugMapping[pageKey]) {
      return wpSlugMapping[pageKey][lang] || wpSlugMapping[pageKey].fr;
    }

    return slugAliases[routeSlug] || routeSlug;
  };

  const getActiveRouteSlug = () => {
    const lang = i18n.language || "fr";
    const pageKey = isHome ? "home" : resolvePageKey(fixedSlug || routeSlug);

    if (pageKey && routeSlugMapping[pageKey]) {
      return routeSlugMapping[pageKey][lang] || routeSlugMapping[pageKey].fr;
    }

    return slugAliases[routeSlug] || routeSlug;
  };

  const slug = getActiveSlug();
  const routePathSlug = getActiveRouteSlug();
  const pageKey = resolvePageKey(fixedSlug || routeSlug || slug);

  useEffect(() => {
    if (fixedSlug) return;
    const targetPath = isHome
      ? getLocalizedPath("home", i18n.language)
      : buildLocalizedSlugPath(routePathSlug, i18n.language);
    if (location.pathname !== targetPath && (routeSlug || isHome)) {
      navigate(targetPath, { replace: true });
    }
  }, [
    fixedSlug,
    i18n.language,
    isHome,
    location.pathname,
    navigate,
    routePathSlug,
    routeSlug,
    slug,
  ]);

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [datePage, setDatePage] = useState(0);
  const [canAccessCallForProject, setCanAccessCallForProject] = useState(null);

  const [agendaItems, setAgendaItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const isCallForProjectRoute = slug === "appel-a-projet" || slug === "call-for-project";

  const getCategoryColor = (catId) => {
    const colors = {
      15: "#ff4757",
      16: "#007bff",
      17: "#ffa502",
      default: "#2ed573",
    };
    return colors[catId] || colors.default;
  };

  const agendaTagAliases = {
    event: "event",
    events: "events",
    evenement: "event",
    evenements: "events",
    screening: "screening",
    screenings: "screenings",
    projection: "projection",
    projections: "projections",
    workshop: "workshop",
    workshops: "workshops",
    atelier: "workshop",
    ateliers: "workshops",
    masterclass: "masterclass",
    masterclasses: "masterclasses",
    conference: "conference",
    conferences: "conferences",
    panel: "panel",
    panels: "panels",
    table_ronde: "panel",
    tables_rondes: "panels",
    round_table: "panel",
    round_tables: "panels",
    networking: "networking",
    reseautage: "networking",
    social: "social",
    socials: "socials",
    social_event: "social",
    social_events: "socials",
    coffee_networking: "social",
    home_and_coffee: "social",
    home_and_coffee_networking: "social",
    competition: "competition",
    competitions: "competitions",
    concours: "competition",
  };

  const getAgendaTagLabel = (category) => {
    const fallback = String(category?.name || "").trim();
    const rawKey = normalizeAgendaTagKey(category?.slug || fallback);
    if (!rawKey) return fallback;
    const derivedKey =
      rawKey.includes("coffee") && rawKey.includes("network")
        ? "social"
        : rawKey;
    const key = agendaTagAliases[derivedKey] || derivedKey;
    return t(`agenda.tags.${key}`, { defaultValue: fallback });
  };

  const truncate = (text, max = 160) =>
    text.length > max ? `${text.slice(0, max).trim()}...` : text;

  const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00`);

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateParts = (dateStr) => {
    const d = parseDate(dateStr);
    const locale =
      i18n.language === "fr"
        ? "fr-FR"
        : i18n.language === "ar"
          ? "ar"
          : "en-GB";
    const monthShort = d
      .toLocaleDateString(locale, { month: "short" })
      .replace(".", "");
    const monthLong = d.toLocaleDateString(locale, { month: "long" });
    const weekday = d.toLocaleDateString(locale, { weekday: "long" });
    const weekdayShort = d
      .toLocaleDateString(locale, { weekday: "short" })
      .replace(".", "");
    return { day: d.getDate(), monthShort, monthLong, weekday, weekdayShort };
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isCallForProjectRoute) {
        setCanAccessCallForProject(true);
        return;
      }

      try {
        const sitePhase = await getSitePhaseState();
        if (cancelled) return;
        const phaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
        setCanAccessCallForProject(phaseKey === "phase_1");
      } catch {
        if (cancelled) return;
        setCanAccessCallForProject(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCallForProjectRoute]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const isCallForProjectPage = pageKey === "call";
        const isAgendaPage = pageKey === "agenda";
        const slugCandidates = isCallForProjectPage
          ? [...new Set([slug, "call-for-project", "call-for-projects", "appel-a-projet"])]
          : isAgendaPage
            ? [...new Set([slug, "برنامج", "schedule-ar", "agenda", "schedule"])]
          : [slug];
        const languageCandidates = isCallForProjectPage
          ? [...new Set([i18n.language, "en", "fr"])]
          : [i18n.language];
        let pageData = null;

        for (const candidate of slugCandidates) {
          for (const langCandidate of languageCandidates) {
            pageData = await getPageBySlug(candidate, langCandidate);
            if (pageData) break;
          }
          if (pageData) break;
        }
        if (cancelled) return;

        if (!pageData) {
          setPage(null);
        } else {
          setPage(pageData);
          const categoryMap = {
            fr: 14,
            en: 51,
            ar: 103,
          };
          const agendaCategoryId = categoryMap[i18n.language] || categoryMap.fr;
          if (pageKey === "agenda") {
            try {
              const allPosts = await getWpPostsByCategory({
                categoryId: agendaCategoryId,
                lang: i18n.language,
                perPage: 100,
                order: "asc",
                orderBy: "date",
                embed: true,
              });
              if (allPosts && Array.isArray(allPosts)) {
                const timeLocale =
                  i18n.language === "fr"
                    ? "fr-FR"
                    : i18n.language === "ar"
                      ? "ar"
                      : "en-GB";
                const formattedEvents = allPosts.map((post) => {
                  const rawTermsData = extractAgendaTerms(
                    post._embedded?.["wp:term"],
                    agendaCategoryId,
                  );
                  const termsData = inferAgendaFallbackTerms(
                    post,
                    rawTermsData,
                  );
                  const dateOnly = post.date.split("T")[0];
                  const excerpt =
                    post.excerpt?.rendered || post.content?.rendered || "";
                  const featured =
                    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
                    null;
                  return {
                    id: post.id,
                    slug: String(post.slug || ""),
                    translations:
                      post?.translations &&
                      typeof post.translations === "object"
                        ? post.translations
                        : null,
                    translationSignature: buildTranslationSignature(
                      post?.translations,
                    ),
                    language: String(post.lang || i18n.language || ""),
                    date: dateOnly,
                    titre: post.title.rendered,
                    titleText: stripHtml(post.title.rendered || ""),
                    contenu: post.content.rendered,
                    resume: truncate(stripHtml(excerpt), 180),
                    image: featured,
                    heure: new Date(post.date).toLocaleTimeString(timeLocale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    lieu: t("agenda.place_default"),
                    subCategories: termsData,
                  };
                });
                setAgendaItems(formattedEvents);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setPage(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, i18n.language, pageKey, t]);

  const dateOptions = useMemo(() => {
    const unique = Array.from(new Set(agendaItems.map((item) => item.date)));
    return unique.sort();
  }, [agendaItems]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    agendaItems.forEach((item) => {
      map.set(item.date, (map.get(item.date) || 0) + 1);
    });
    return map;
  }, [agendaItems]);

  const MAX_VISIBLE_DATES = 12;
  const canPaginateDates = dateOptions.length > MAX_VISIBLE_DATES;
  const datePageCount = canPaginateDates
    ? Math.ceil(dateOptions.length / MAX_VISIBLE_DATES)
    : 1;

  const pagedDates = useMemo(() => {
    if (!canPaginateDates) return dateOptions;
    const start = datePage * MAX_VISIBLE_DATES;
    return dateOptions.slice(start, start + MAX_VISIBLE_DATES);
  }, [dateOptions, datePage, canPaginateDates]);

  useEffect(() => {
    if (!dateOptions.length) {
      if (!selectedDate) {
        const today = getLocalDateString(new Date());
        setSelectedDate(today);
      }
      return;
    }

    const defaultDate = dateOptions[0];
    const desiredDate =
      selectedDate && dateOptions.includes(selectedDate)
        ? selectedDate
        : defaultDate;

    if (selectedDate !== desiredDate) {
      setSelectedDate(desiredDate);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    if (!canPaginateDates) {
      if (datePage !== 0) setDatePage(0);
      return;
    }
    const maxPageIndex = Math.max(0, datePageCount - 1);
    if (datePage > maxPageIndex) {
      setDatePage(maxPageIndex);
      return;
    }
    if (selectedDate) {
      const index = dateOptions.indexOf(selectedDate);
      if (index >= 0) {
        const nextPage = Math.floor(index / MAX_VISIBLE_DATES);
        if (nextPage !== datePage) setDatePage(nextPage);
      }
    }
  }, [canPaginateDates, datePage, datePageCount, dateOptions, selectedDate]);

  const activeEvents = agendaItems.filter((item) => item.date === selectedDate);

  useEffect(() => {
    if (!selectedArticle) return;
    if (loading) return;
    if (!agendaItems.length) {
      setSelectedArticle(null);
      return;
    }

    const mapped = findMatchingAgendaArticle(
      selectedArticle,
      agendaItems,
      i18n.language,
    );
    if (!mapped) {
      setSelectedArticle(null);
      return;
    }

    if (
      String(mapped.id) !== String(selectedArticle.id) ||
      String(mapped.language || "") !== String(selectedArticle.language || "")
    ) {
      setSelectedArticle(mapped);
    }
  }, [agendaItems, i18n.language, loading, selectedArticle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.target);
    const dataToSend = Object.fromEntries(formData);

    try {
      const result = await sendContactForm({
        ...dataToSend,
        lang: i18n.language,
      });
      alert(result?.message || t("contact.form.success_message"));
      e.target.reset();
    } catch (error) {
      alert(error?.message || t("contact.form.error_message"));
    } finally {
      setIsSending(false);
    }
  };

  if (isCallForProjectRoute && canAccessCallForProject === false) {
    return <Navigate to={getLocalizedPath("films", i18n.language)} replace />;
  }
  if (isCallForProjectRoute && canAccessCallForProject == null) {
    return <PageLoader message={t("ui.loading_page", "Loading...")} />;
  }

  if (loading) return <PageLoader message={t("ui.loading_page", "Loading...")} />;
  if (error) {
    return (
      <div className="app-container page">
        {t("common.load_page_error")}
      </div>
    );
  }
  if (!page) return <NotFound />;

  const seoTitle = page?.title?.rendered || slug;
  const seoDescription =
    page?.excerpt?.rendered || page?.content?.rendered || "";
  const seoLang = i18n.language;
  const homePath = getLocalizedPath("home", i18n.language);
  const currentPagePath = isHome
    ? homePath
    : buildLocalizedSlugPath(routePathSlug, i18n.language);
  const getPageName = () => {
    if (pageKey === "agenda") return t("nav.agenda", "Agenda");
    if (pageKey === "contact") return t("nav.contact", "Contact");
    return page?.title?.rendered?.replace(/<[^>]+>/g, "") || slug;
  };
  const breadcrumbItems = [
    {
      name: t("nav.home", "Accueil"),
      url: homePath,
    },
    {
      name: getPageName(),
      url: currentPagePath,
    },
  ];
  const contactTheme = isLight
    ? {
      page: "from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900",
      badge: "border-cyan-300/65 bg-cyan-100/80 text-cyan-800",
      iconBorder: "border-cyan-400/70",
      title: "text-slate-950",
      subtitle: "text-slate-700",
      divider: "border-cyan-200/80",
      card: "border-cyan-200/80 bg-[linear-gradient(150deg,rgba(248,252,255,0.95),rgba(230,243,255,0.9))] shadow-[0_20px_50px_rgba(2,23,55,0.16)]",
      label: "text-slate-700",
      input:
        "border-cyan-200/85 bg-[#f7fbff] text-slate-900 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40",
      iconText: "text-cyan-700",
      infoTitle: "text-cyan-800",
      infoText: "text-slate-700",
      mapBorder: "border-cyan-200/80",
    }
    : {
      page: "from-[#020617] via-[#0b1732] to-[#020617] text-slate-100",
      badge: "border-cyan-300/45 bg-cyan-400/10 text-cyan-200",
      iconBorder: "border-cyan-400/70",
      title: "text-white",
      subtitle: "text-slate-300",
      divider: "border-cyan-300/20",
      card: "border-slate-500/35 bg-slate-900/45 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
      label: "text-slate-300",
      input:
        "border-slate-500/45 bg-slate-950/65 text-white placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30",
      iconText: "text-cyan-200",
      infoTitle: "text-cyan-200",
      infoText: "text-slate-300",
      mapBorder: "border-slate-500/35",
    };
  const agendaTheme = isLight
    ? {
      page: "from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900",
      badge: "border-cyan-300/65 bg-cyan-100/80 text-cyan-800",
      title: "text-slate-950",
      subtitle: "text-slate-700",
      backBtn: "border-cyan-300/60 bg-cyan-100/80 text-cyan-800 hover:bg-cyan-200/70",
      glassCard: "border-cyan-200/80 bg-[linear-gradient(150deg,rgba(248,252,255,0.95),rgba(230,243,255,0.9))] shadow-[0_20px_50px_rgba(2,23,55,0.14)]",
      articleTitle: "text-slate-950",
      articleBody: "prose prose-slate mt-6 max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-a:text-cyan-800 prose-strong:text-slate-950",
      pill: "border-cyan-300/65 bg-cyan-100/80 text-cyan-800",
      empty: "text-slate-500",
      dateCurrent: "border-cyan-300/70 bg-gradient-to-br from-cyan-300 to-sky-300 text-slate-900 shadow-lg",
      dateDefault: "border-cyan-200/80 bg-[#f7fbff] text-slate-700 hover:border-cyan-300/70 hover:bg-cyan-100/70",
      cardTitle: "text-slate-950",
      cardText: "text-slate-700",
      cta: "text-cyan-700 hover:text-cyan-600",
      dateCardText: "text-slate-700",
    }
    : {
      page: "from-[#020617] via-[#0b1732] to-[#020617] text-slate-100",
      badge: "border-cyan-300/45 bg-cyan-400/10 text-cyan-200",
      title: "text-white",
      subtitle: "text-slate-300",
      backBtn: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20",
      glassCard: "border-slate-500/35 bg-slate-900/45 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
      articleTitle: "text-white",
      articleBody: "agenda-article prose prose-invert mt-6 max-w-none prose-headings:text-white prose-p:text-slate-200 prose-a:text-cyan-200 prose-strong:text-white",
      pill: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
      empty: "text-slate-300",
      dateCurrent: "border-cyan-200/65 bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-lg",
      dateDefault: "border-slate-500/35 bg-slate-950/55 text-white hover:border-cyan-300/45 hover:bg-cyan-400/10",
      cardTitle: "text-white",
      cardText: "text-slate-300",
      cta: "text-cyan-200 hover:text-cyan-100",
      dateCardText: "text-white",
    };

  if (pageKey === "call") {
    return <CallForProject page={page} />;
  }

  if (pageKey === "home") {
    return <Home page={page} />;
  }

  if (pageKey === "jury") {
    return <JuryWpage page={page} />;
  }

  const legalVariant = legalVariantBySlug[fixedSlug] || legalVariantBySlug[slug];
  if (legalVariant) {
    return <LegalPage page={page} variant={legalVariant} />;
  }

  if (pageKey === "contact") {
    return (
      <main className={`wp-contact-page relative min-h-screen overflow-hidden bg-gradient-to-b ${contactTheme.page}`}>
        <Seo title={seoTitle} description={seoDescription} lang={seoLang} />
        <BreadcrumbSchema items={breadcrumbItems} />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl"></div>
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10">
          <div>
            <p className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${contactTheme.badge}`}>
              {t("contact.badge")}
            </p>
            <div className={`mt-4 h-16 w-16 rounded-full border-4 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${contactTheme.iconBorder}`}>
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 8.5V17a2 2 0 01-2 2H5a2 2 0 01-2-2V8.5m18 0A2 2 0 0019 6H5a2 2 0 00-2 2.5m18 0l-9 6-9-6"
                />
              </svg>
            </div>
            <h1
              className={`mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl ${contactTheme.title}`}
              dangerouslySetInnerHTML={{ __html: page.title.rendered }}
            />
            <p className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${contactTheme.subtitle}`}>
              {seoDescription?.replace(/<[^>]+>/g, "")}
            </p>
          </div>

          <div className={`mt-10 grid gap-8 border-t pt-8 lg:grid-cols-[1.1fr_0.9fr] ${contactTheme.divider}`}>
            <form
              onSubmit={handleSubmit}
              className={`space-y-5 rounded-[28px] border p-6 sm:p-8 ${contactTheme.card}`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className={`text-[10px] font-black uppercase tracking-[0.22em] ${contactTheme.label}`}
                  >
                    {t("contact.form.label_name")}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder={t("contact.form.placeholder_name")}
                    autoComplete="name"
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${contactTheme.input}`}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className={`text-[10px] font-black uppercase tracking-[0.22em] ${contactTheme.label}`}
                  >
                    {t("contact.form.label_email")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder={t("contact.form.placeholder_email")}
                    autoComplete="email"
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${contactTheme.input}`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="subject"
                  className={`text-[10px] font-black uppercase tracking-[0.22em] ${contactTheme.label}`}
                >
                  {t("contact.form.label_subject")}
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder={t("contact.form.placeholder_subject")}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${contactTheme.input}`}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="message"
                  className={`text-[10px] font-black uppercase tracking-[0.22em] ${contactTheme.label}`}
                >
                  {t("contact.form.label_message")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  placeholder={t("contact.form.placeholder_message")}
                  className={`w-full resize-none rounded-2xl border px-4 py-3 outline-none transition ${contactTheme.input}`}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-400 py-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending
                  ? t("contact.form.button_loading")
                  : t("contact.form.button_idle")}
              </button>
            </form>

            <div className="space-y-6">
              <div className={`space-y-4 rounded-[28px] border p-5 sm:p-6 ${contactTheme.card}`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-cyan-400/40 flex items-center justify-center">
                    <svg
                      className={`w-5 h-5 ${contactTheme.iconText}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 11a1 1 0 100-2 1 1 0 000 2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 17v-4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${contactTheme.infoTitle}`}>
                      {t("contact.info.location_title")}
                    </p>
                    <p className={`text-sm ${contactTheme.infoText}`}>
                      {t("contact.info.address")}
                    </p>
                  </div>
                </div>

                <div className={`aspect-[4/3] overflow-hidden rounded-2xl border ${contactTheme.mapBorder}`}>
                  <iframe
                    title="Carte MarsAI"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2903.003971135914!2d5.368781999999999!3d43.3141763!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12c9c13ddc0211b9%3A0xd1642ae4b32c4bc4!2s%C3%89cole%20La%20Plateforme_%20Marseille%20-%20Entr%C3%A9e%20Sud!5e0!3m2!1sfr!2sfr!4v1770039690847!5m2!1sfr!2sfr"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isAgenda = pageKey === "agenda";
  const selectedParts = selectedDate ? formatDateParts(selectedDate) : null;
  const genericPageTheme = isLight
    ? {
      page: "min-h-screen bg-gradient-to-b from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900 p-4 md:p-12",
      prose: "prose prose-slate max-w-none rounded-xl border border-cyan-200/80 bg-[linear-gradient(150deg,rgba(248,252,255,0.95),rgba(230,243,255,0.9))] p-8 shadow-[0_20px_50px_rgba(2,23,55,0.14)]",
    }
    : {
      page: "min-h-screen bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617] text-slate-100 p-4 md:p-12",
      prose:
        "prose prose-invert max-w-none rounded-xl border border-cyan-300/20 bg-slate-900/55 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
    };

  return (
    <main
      className={
        isAgenda
          ? `wp-agenda-page relative min-h-screen overflow-hidden bg-gradient-to-b ${agendaTheme.page}`
          : genericPageTheme.page
      }
    >
      <Seo title={seoTitle} description={seoDescription} lang={seoLang} />
      <BreadcrumbSchema items={breadcrumbItems} />
      {!isAgenda && (
        <ArticleSchema
          headline={page?.title?.rendered}
          description={seoDescription}
          datePublished={page?.date}
          dateModified={page?.modified}
        />
      )}
      {isAgenda && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full"></div>
          <div className="absolute top-40 -left-24 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full"></div>
        </div>
      )}
      <div
        className={
          isAgenda
            ? "relative max-w-6xl mx-auto px-4 pb-16"
            : "max-w-6xl mx-auto"
        }
      >
        {isAgenda ? (
          <>
            <div className="pt-10 pb-8">
              <p className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${agendaTheme.badge}`}>
                {t("agenda.subtitle")}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full border-4 border-cyan-400/70 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.25}
                      d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1
                  className={`text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl ${agendaTheme.title}`}
                  dangerouslySetInnerHTML={{ __html: page.title.rendered }}
                />
              </div>
              <p className={`mt-3 max-w-3xl text-sm leading-relaxed sm:text-base ${agendaTheme.subtitle}`}>
                {seoDescription?.replace(/<[^>]+>/g, "")}
              </p>
            </div>

            {selectedArticle ? (
              <div className="mt-2">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition ${agendaTheme.backBtn}`}
                >
                  <span aria-hidden="true">←</span>
                  {t("agenda.back_to_agenda")}
                </button>

                <article className={`rounded-[30px] border p-5 sm:p-8 ${agendaTheme.glassCard}`}>
                  {selectedArticle.image ? (
                    <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-3xl border border-slate-500/35">
                      <img
                        src={selectedArticle.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#0b1732]/20 to-transparent" />
                    </div>
                  ) : null}

                  <h2
                    className={`text-2xl font-black uppercase tracking-tight sm:text-3xl ${agendaTheme.articleTitle}`}
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.titre,
                    }}
                  />

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]">
                    <span className={`rounded-full border px-3 py-1 ${agendaTheme.pill}`}>
                      {t("agenda.hour_label")}: {selectedArticle.heure}
                    </span>
                    <span className={`rounded-full border px-3 py-1 ${agendaTheme.pill}`}>
                      {t("agenda.place_label")}: {selectedArticle.lieu}
                    </span>
                    {selectedArticle.subCategories?.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-full border px-3 py-1"
                        style={{
                          color: getCategoryColor(cat.id),
                          borderColor: getCategoryColor(cat.id),
                        }}
                      >
                        {getAgendaTagLabel(cat)}
                      </span>
                    ))}
                  </div>

                  <div
                    className={agendaTheme.articleBody}
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.contenu,
                    }}
                  />
                </article>
              </div>
            ) : (
              <>
                <div className={`mt-4 rounded-[28px] border p-4 sm:p-6 ${agendaTheme.glassCard}`}>
                  {canPaginateDates && (
                    <div className="mb-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                      <button
                        type="button"
                        onClick={() => setDatePage((prev) => Math.max(0, prev - 1))}
                        disabled={datePage === 0}
                        className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={t("agenda.previous_dates_aria")}
                      >
                        {t("prev")}
                      </button>
                      <span>
                        {datePage + 1} / {datePageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDatePage((prev) => Math.min(datePageCount - 1, prev + 1))
                        }
                        disabled={datePage >= datePageCount - 1}
                        className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={t("agenda.next_dates_aria")}
                      >
                        {t("next")}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-2">
                    {pagedDates.length ? (
                      pagedDates.map((dateStr) => {
                        const parts = formatDateParts(dateStr);
                        const isSelected = dateStr === selectedDate;
                        const eventCount = eventsByDate.get(dateStr) || 0;
                        const hasEvents = eventCount > 0;
                        return (
                          <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`h-24 w-28 rounded-2xl border px-2 py-2 text-center transition sm:h-28 sm:w-32 ${
                              isSelected
                                ? agendaTheme.dateCurrent
                                : agendaTheme.dateDefault
                            }`}
                          >
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">
                              {parts.weekdayShort}
                            </p>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
                              {parts.monthShort}
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none">
                              {parts.day}
                            </p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-80">
                              {hasEvents
                                ? t("agenda.event_count", { count: eventCount })
                                : t("agenda.no_events_short")}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className={`py-6 text-sm ${agendaTheme.empty}`}>
                        {t("agenda.no_events_available")}
                      </div>
                    )}
                  </div>
                </div>

                {selectedParts && (
                  <div className="mt-6 flex justify-center">
                    <div className={`rounded-3xl border px-7 py-4 text-center ${agendaTheme.glassCard}`}>
                      <p className={`text-4xl font-black leading-none ${agendaTheme.dateCardText}`}>
                        {selectedParts.day}
                      </p>
                      <p className={`mt-1 text-xs font-black uppercase tracking-[0.2em] ${agendaTheme.subtitle}`}>
                        {selectedParts.weekday}
                      </p>
                      <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${agendaTheme.badge.includes("text-sky") ? "text-sky-700" : "text-cyan-200"}`}>
                        {selectedParts.monthLong}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {activeEvents.length ? (
                    activeEvents.map((ev) => (
                      <article
                        key={ev.id}
                        className={`group rounded-[28px] border p-4 transition hover:-translate-y-1 ${agendaTheme.glassCard}`}
                      >
                        <div className="relative mb-4 h-36 overflow-hidden rounded-2xl border border-slate-500/35 bg-slate-950/60">
                          {ev.image ? (
                            <img
                              src={ev.image}
                              alt=""
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] ${agendaTheme.empty}`}>
                              {t("agenda.event_badge")}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-transparent to-transparent" />
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {ev.subCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
                              style={{
                                color: getCategoryColor(cat.id),
                                borderColor: getCategoryColor(cat.id),
                              }}
                            >
                              {getAgendaTagLabel(cat)}
                            </span>
                          ))}
                        </div>

                        <h3
                          className={`text-lg font-black uppercase tracking-tight ${agendaTheme.cardTitle}`}
                          dangerouslySetInnerHTML={{ __html: ev.titre }}
                        />
                        <p className={`mt-2 text-sm leading-relaxed ${agendaTheme.cardText}`}>
                          {ev.resume}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
                          <span className={`rounded-full border px-3 py-1 ${agendaTheme.pill}`}>
                            {t("agenda.hour_label")}: {ev.heure}
                          </span>
                          <span className={`rounded-full border px-3 py-1 ${agendaTheme.pill}`}>
                            {t("agenda.place_label")}: {ev.lieu}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedArticle(ev)}
                          className={`mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition ${agendaTheme.cta}`}
                        >
                          <span>{t("agenda.read_article")}</span>
                          <span aria-hidden="true">➙</span>
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className={`col-span-full rounded-[28px] border p-8 text-center ${agendaTheme.glassCard} ${agendaTheme.empty}`}>
                      {t("agenda.no_events_today")}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div
            className={genericPageTheme.prose}
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        )}
      </div>
    </main>
  );
}
