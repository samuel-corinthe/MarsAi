import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPageBySlug } from "../api";
import { useTranslation } from "react-i18next";
import Home from "./Home";
import JuryWpage from "./jury";
import NotFound from "./NotFound";
import LegalPage from "./LegalPage";

export default function WpPage({ isHome = false, fixedSlug = null }) {
  const { slug: routeSlug } = useParams();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // --- MAPPING POUR LA NAVIGATION ---
  const slugMapping = {
    agenda: "schedule",
    accueil: "home",
    jury: "jury-eng",
    "mentions-legales": "legal-notice",
    cgu: "gcu",
    cgv: "tos",
  };
  const legalVariantBySlug = {
    cgv: "cgv",
    tos: "cgv",
    cgu: "cgu",
    gcu: "cgu",
    "mentions-legales": "mentions",
    "legal-notice": "mentions",
  };

  const getActiveSlug = () => {
    if (isHome) return i18n.language === "en" ? "home" : "accueil";
    const entry = Object.entries(slugMapping).find(
      ([fr, en]) => fr === routeSlug || en === routeSlug,
    );
    if (entry) return i18n.language === "en" ? entry[1] : entry[0];
    return routeSlug;
  };

  const slug = getActiveSlug();

  // Redirection auto si changement de langue
  useEffect(() => {
    const targetPath = isHome
      ? i18n.language === "en"
        ? "/home"
        : "/accueil"
      : `/${slug}`;
    if (location.pathname !== targetPath && routeSlug) {
      navigate(targetPath, { replace: true });
    }
  }, [i18n.language, slug, navigate, location.pathname, isHome, routeSlug]);

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSending, setIsSending] = useState(false); // Ajouté pour le formulaire
  const [agendaItems, setAgendaItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // --- TES FONCTIONS UTILES ---
  const getCategoryColor = (catId) => {
    const colors = {
      15: "#ff4757",
      16: "#007bff",
      17: "#ffa502",
      default: "#2ed573",
    };
    return colors[catId] || colors.default;
  };
  const stripHtml = (html) =>
    (html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const truncate = (text, max = 160) =>
    text.length > max ? `${text.slice(0, max).trim()}...` : text;
  const parseDate = (dateStr) => new Date(`${dateStr}T00:00:00`);
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const addDays = (dateStr, delta) => {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + delta);
    return getLocalDateString(d);
  };
  const getWeekStart = (dateStr) => {
    const d = parseDate(dateStr);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return getLocalDateString(d);
  };
  const formatDateParts = (dateStr) => {
    const d = parseDate(dateStr);
    const locale = i18n.language === "fr" ? "fr-FR" : "en-GB";
    return {
      day: d.getDate(),
      monthShort: d
        .toLocaleDateString(locale, { month: "short" })
        .replace(".", ""),
      monthLong: d.toLocaleDateString(locale, { month: "long" }),
      weekday: d.toLocaleDateString(locale, { weekday: "long" }),
      weekdayShort: d
        .toLocaleDateString(locale, { weekday: "short" })
        .replace(".", ""),
    };
  };

  // --- GESTION FORMULAIRE CONTACT ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    // Simulation d'envoi
    setTimeout(() => {
      setIsSending(false);
      alert("Message envoyé !");
    }, 2000);
  };

  // --- FETCH DATA ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const pageData = await getPageBySlug(slug, i18n.language);
        if (cancelled) return;

        if (!pageData) {
          setPage(null);
        } else {
          setPage(pageData);

          // IDENTIFICATION DE L'ID (Vérifie bien que c'est le bon ID anglais ici)
          const agendaCategoryId = i18n.language === "fr" ? 14 : 51;

          // Sécurité : on vérifie si on est sur une page d'agenda (FR ou EN)
          const isAgendaSlug = slug === "agenda" || slug === "schedule";

          if (isAgendaSlug) {
            console.log(
              "Chargement de l'agenda pour la langue:",
              i18n.language,
              "ID:",
              agendaCategoryId,
            );

            const res = await fetch(
              `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/posts?categories=${agendaCategoryId}&_embed&per_page=100&order=asc&orderby=date&lang=${i18n.language}`,
            );
            const allPosts = await res.json();

            if (allPosts && Array.isArray(allPosts) && allPosts.length > 0) {
              const formatted = allPosts.map((post) => ({
                id: post.id,
                date: post.date.split("T")[0],
                titre: post.title.rendered,
                contenu: post.content.rendered,
                resume: truncate(
                  stripHtml(post.excerpt?.rendered || post.content?.rendered),
                  180,
                ),
                image:
                  post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
                heure: new Date(post.date).toLocaleTimeString(
                  i18n.language === "fr" ? "fr-FR" : "en-GB",
                  { hour: "2-digit", minute: "2-digit" },
                ),
                lieu: "Marseille",
                subCategories: (post._embedded?.["wp:term"]?.[0] || []).filter(
                  (c) => c.id !== agendaCategoryId,
                ),
              }));

              setAgendaItems(formatted);

              // TRÈS IMPORTANT : On initialise la date sur le premier événement trouvé
              const firstDate = formatted[0].date;
              setSelectedDate(firstDate);
              setWeekStart(getWeekStart(firstDate));

              console.log(
                "Événements chargés:",
                formatted.length,
                "Première date:",
                firstDate,
              );
            } else {
              console.warn(
                "Aucun article trouvé pour la catégorie",
                agendaCategoryId,
              );
              setAgendaItems([]);
            }
          }
        }
      } catch (err) {
        console.error("Erreur Fetch:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, i18n.language]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    agendaItems.forEach((item) =>
      map.set(item.date, (map.get(item.date) || 0) + 1),
    );
    return map;
  }, [agendaItems]);

  const weekDates = useMemo(
    () =>
      weekStart
        ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        : [],
    [weekStart],
  );
  const activeEvents = agendaItems.filter((item) => item.date === selectedDate);
  const isAgenda = slug === "agenda" || slug === "schedule";
  const selectedParts = selectedDate ? formatDateParts(selectedDate) : null;

  if (loading)
    return <div className="app-container page"> {t("loading")} </div>;
  if (!page) return <NotFound />;

  // --- RENDU SPÉCIFIQUE ---
  if (slug === "accueil" || slug === "home") return <Home page={page} />;
  if (slug === "jury" || slug === "jury-eng") return <JuryWpage page={page} />;
  if (legalVariantBySlug[slug]) {
    return <LegalPage page={page} variant={legalVariantBySlug[slug]} />;
  }

  // --- PAGE CONTACT ---
  if (slug === "contact") {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 p-6 sm:p-12">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-8 rounded-xl shadow-sm">
          <h1
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
            dangerouslySetInnerHTML={{ __html: page.title.rendered }}
          />
          <div
            className="prose prose-slate max-w-none mb-10 text-gray-600"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  {i18n.language === "fr" ? "Nom complet" : "Full Name"}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  {i18n.language === "fr" ? "Adresse e-mail" : "Email Address"}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label
                htmlFor="subject"
                className="text-sm font-medium text-gray-700"
              >
                {i18n.language === "fr" ? "Objet" : "Subject"}
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label
                htmlFor="message"
                className="text-sm font-medium text-gray-700"
              >
                {i18n.language === "fr" ? "Votre message" : "Your message"}
              </label>
              <textarea
                id="message"
                name="message"
                rows="5"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400"
            >
              {isSending
                ? i18n.language === "fr"
                  ? "Envoi en cours..."
                  : "Sending..."
                : i18n.language === "fr"
                  ? "Envoyer le message"
                  : "Send Message"}
            </button>
          </form>
        </div>

        <div className="mt-12 max-w-3xl mx-auto rounded-xl overflow-hidden border">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2903.655822941036!2d5.368735376594326!3d43.300523074312214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12c9c0944062400b%3A0x6d90da893b890a!2sLa%20Plateforme%20Marseille!5e0!3m2!1sfr!2sfr!4v1715600000000!5m2!1sfr!2sfr"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        isAgenda
          ? "min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden"
          : "min-h-screen bg-[#fcfcfc] text-[#333] p-4 md:p-12"
      }
    >
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
            {/* HEADER AGENDA */}
            <div className="pt-10 pb-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-cyan-400/70 flex items-center justify-center shadow-lg">
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
                    d="M12 8v5l3 3m-3 8a9 9 0 100-18 9 9 0 000 18z"
                  />
                </svg>
              </div>
              <h1
                className="text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                dangerouslySetInnerHTML={{ __html: page.title.rendered }}
              />
            </div>

            {selectedArticle ? (
              <div className="mt-6">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="mb-6 text-white/90 font-bold flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <span>←</span>{" "}
                  {i18n.language === "fr"
                    ? "Retour à l'agenda"
                    : "Back to schedule"}
                </button>
                <article className="bg-white/5 p-5 sm:p-10 rounded-[36px] border border-cyan-400/20 backdrop-blur">
                  {selectedArticle.image && (
                    <img
                      src={selectedArticle.image}
                      className="w-full aspect-video object-cover rounded-[28px] mb-6"
                      alt=""
                    />
                  )}
                  <h2
                    className="text-3xl md:text-5xl font-black mb-6"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: selectedArticle.titre }}
                  />
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.contenu,
                    }}
                  />
                </article>
              </div>
            ) : (
              <>
                {/* CALENDRIER */}
                <div className="mt-6 bg-white/5 border border-cyan-400/20 rounded-[32px] p-4 shadow-2xl max-w-5xl mx-auto">
                  <div className="flex items-center justify-between pb-4">
                    <button
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                      className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] uppercase"
                    >
                      {t("prev")}
                    </button>
                    <span
                      className="text-[10px] uppercase tracking-widest text-cyan-100/80"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {selectedParts?.monthLong}
                    </span>
                    <button
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                      className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] uppercase"
                    >
                      {t("next")}
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 sm:gap-3">
                    {weekDates.map((dateStr) => {
                      const p = formatDateParts(dateStr);
                      const isSelected = dateStr === selectedDate;
                      const count = eventsByDate.get(dateStr) || 0;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`h-24 sm:h-32 rounded-3xl flex flex-col items-center justify-center gap-1 border transition-all ${isSelected ? "bg-gradient-to-br from-cyan-400 to-blue-600 border-cyan-200" : "bg-white/5 border-white/10"}`}
                        >
                          <span
                            className="text-[9px] uppercase opacity-70"
                            style={{ fontFamily: "'Space Mono', monospace" }}
                          >
                            {p.weekdayShort}
                          </span>
                          <span
                            className="text-xl sm:text-2xl font-black"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                          >
                            {p.day}
                          </span>
                          {count > 0 && (
                            <span className="text-[8px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                              {count} EVT
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LISTE EVENTS */}
                <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {activeEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="group bg-white/5 border border-cyan-400/20 rounded-3xl p-4 transition-all hover:-translate-y-1"
                    >
                      <div className="relative h-40 rounded-2xl overflow-hidden mb-4 bg-white/10">
                        {ev.image && (
                          <img
                            src={ev.image}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>
                      <h3
                        className="text-lg font-bold mb-2"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        dangerouslySetInnerHTML={{ __html: ev.titre }}
                      />
                      <p className="text-xs text-white/70 mb-4">{ev.resume}</p>
                      <button
                        onClick={() => setSelectedArticle(ev)}
                        className="text-[10px] font-bold uppercase tracking-widest text-cyan-200"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        READ MORE ➙
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div
            className="prose prose-slate max-w-none bg-white p-8 rounded-xl border"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        )}
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono&display=swap');`}</style>
    </main>
  );
}
