import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import Home from "./Home";
import JuryWpage from "./jury";
import NotFound from "./NotFound";
import LegalPage from "./LegalPage";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [agendaItems, setAgendaItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

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
    const diff = (day + 6) % 7; // Monday as start of week
    d.setDate(d.getDate() - diff);
    return getLocalDateString(d);
  };

  const formatDateParts = (dateStr) => {
    const d = parseDate(dateStr);
    const monthShort = d
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", "");
    const monthLong = d.toLocaleDateString("fr-FR", { month: "long" });
    const weekday = d.toLocaleDateString("fr-FR", { weekday: "long" });
    const weekdayShort = d
      .toLocaleDateString("fr-FR", { weekday: "short" })
      .replace(".", "");
    return { day: d.getDate(), monthShort, monthLong, weekday, weekdayShort };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const pageData = await getPageBySlug(slug);
        if (cancelled) return;

        if (!pageData) {
          setPage(null);
        } else {
          setPage(pageData);
          if (slug === "agenda") {
            try {
              const res = await fetch(
                "/wp-json/wp/v2/posts?categories=14&_embed&per_page=100&order=asc&orderby=date",
              );
              const allPosts = await res.json();
              if (allPosts && Array.isArray(allPosts)) {
                const formattedEvents = allPosts.map((post) => {
                  const categoriesData = post._embedded?.["wp:term"]?.[0] || [];
                  const dateOnly = post.date.split("T")[0];
                  const excerpt =
                    post.excerpt?.rendered || post.content?.rendered || "";
                  const featured =
                    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
                    null;
                  return {
                    id: post.id,
                    date: dateOnly,
                    titre: post.title.rendered,
                    contenu: post.content.rendered,
                    resume: truncate(stripHtml(excerpt), 180),
                    image: featured,
                    heure: new Date(post.date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    lieu: "Marseille",
                    subCategories: categoriesData.filter((cat) => cat.id !== 14),
                  };
                });
                setAgendaItems(formattedEvents);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      } catch (err) {
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
  }, [slug]);

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

  const weekDates = useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  useEffect(() => {
    if (!dateOptions.length) {
      if (!selectedDate) {
        const today = getLocalDateString(new Date());
        setSelectedDate(today);
        setWeekStart(getWeekStart(today));
      }
      return;
    }
    const defaultDate = dateOptions[0];
    if (!selectedDate) {
      setSelectedDate(defaultDate);
      setWeekStart(getWeekStart(defaultDate));
      return;
    }
    if (!weekStart) {
      setWeekStart(getWeekStart(selectedDate));
    }
  }, [dateOptions, selectedDate, weekStart]);

  const handleWeekChange = (delta) => {
    if (!weekStart) return;
    const nextStart = addDays(weekStart, delta * 7);
    const nextWeekDates = Array.from({ length: 7 }, (_, i) =>
      addDays(nextStart, i),
    );
    setWeekStart(nextStart);
    if (!nextWeekDates.includes(selectedDate)) {
      setSelectedDate(nextStart);
    }
  };

  const activeEvents = agendaItems.filter((item) => item.date === selectedDate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.target);
    const dataToSend = Object.fromEntries(formData);

    try {
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Message envoyé avec succès !");
        e.target.reset();
      } else {
        alert("Erreur : " + result.message);
      }
    } catch (error) {
      alert("Impossible de contacter le serveur.");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="app-container page">Chargement</div>;
  if (error) {
    return (
      <div className="app-container page">
        Impossible de charger la page pour le moment.
      </div>
    );
  }
  if (!page) return <NotFound />;

  if (slug === "accueil") {
    return <Home page={page} />;
  }

  if (slug === "jury") {
    return <JuryWpage page={page} />;
  }

  if (slug === "cgv" || slug === "cgu") {
    return <LegalPage page={page} variant={slug} />;
  }

  if (slug === "mentions-legales") {
    return <LegalPage page={page} variant="mentions" />;
  }

  if (slug === "contact") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full"></div>
          <div className="absolute top-40 -left-24 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-cyan-400/70 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
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
              className="text-4xl md:text-5xl font-black mt-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: page.title.rendered }}
            />
            <p
              className="text-xs uppercase tracking-[0.4em] text-cyan-200 mt-2"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Contact
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit}
              className="bg-white/5 border border-cyan-400/20 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-[10px] uppercase tracking-[0.3em] text-white/70"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Votre nom"
                    autoComplete="name"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-300 outline-none transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-[10px] uppercase tracking-[0.3em] text-white/70"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    Adresse e-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="vous@email.com"
                    autoComplete="email"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-300 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="subject"
                  className="text-[10px] uppercase tracking-[0.3em] text-white/70"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Objet
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="Sujet de votre message"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-300 outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="message"
                  className="text-[10px] uppercase tracking-[0.3em] text-white/70"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  Votre message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  placeholder="Dites-nous ce dont vous avez besoin."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-300 outline-none transition resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold uppercase tracking-[0.25em] text-[11px] py-3.5 rounded-2xl transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {isSending ? "Envoi en cours..." : "Envoyer le message"}
              </button>
            </form>

            <div className="space-y-6">
              <div className="bg-white/5 border border-cyan-400/20 rounded-[32px] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-cyan-400/40 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-cyan-200"
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
                    <p
                      className="text-[10px] uppercase tracking-[0.3em] text-cyan-200"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      Localisation
                    </p>
                    <p className="text-white/80 text-sm">
                      École La Plateforme_, Marseille
                    </p>
                  </div>
                </div>

                <div className="mt-4 aspect-[4/3] rounded-2xl overflow-hidden border border-white/10">
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

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        `}</style>
      </main>
    );
  }

  const isAgenda = slug === "agenda";
  const selectedParts = selectedDate ? formatDateParts(selectedDate) : null;

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
        style={isAgenda ? { fontFamily: "'Inter', sans-serif" } : undefined}
      >
        {isAgenda ? (
          <>
            <div className="pt-10 pb-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-cyan-400/70 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
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
                    d="M12 8v5l3 3"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                  />
                </svg>
              </div>
              <h1
                className="text-4xl md:text-5xl font-black mt-4 text-white"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                dangerouslySetInnerHTML={{ __html: page.title.rendered }}
              />
              <p
                className="text-xs uppercase tracking-[0.4em] text-cyan-200 mt-2"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Schedule
              </p>
            </div>

            {selectedArticle ? (
              <div className="mt-6">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="mb-6 text-white/90 font-bold flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <span>&larr;</span>
                  Retour a l'agenda
                </button>

                <div className="max-w-4xl mx-auto">
                  <article className="bg-white/5 text-white p-5 sm:p-8 md:p-10 rounded-[36px] border border-cyan-400/20 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
                    {selectedArticle.image ? (
                      <div className="relative aspect-[16/9] rounded-[28px] overflow-hidden mb-6">
                        <img
                          src={selectedArticle.image}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#062a7a]/80 via-[#0b5be9]/30 to-transparent" />
                        <div className="absolute bottom-4 left-5 right-5">
                          <h2
                            className="text-2xl md:text-4xl font-black text-white leading-tight"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                            dangerouslySetInnerHTML={{
                              __html: selectedArticle.titre,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <h2
                        className="text-2xl md:text-4xl font-black text-white mb-6 leading-tight"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        dangerouslySetInnerHTML={{ __html: selectedArticle.titre }}
                      />
                    )}

                    <div
                      className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-100/80 mb-6"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30">
                        Heure: {selectedArticle.heure}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30">
                        Lieu: {selectedArticle.lieu}
                      </span>
                      {selectedArticle.subCategories?.map((cat) => (
                        <span
                          key={cat.id}
                          className="px-3 py-1 rounded-full border"
                          style={{
                            color: getCategoryColor(cat.id),
                            borderColor: getCategoryColor(cat.id),
                          }}
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>

                    <div
                      className="agenda-article prose prose-invert prose-headings:font-black prose-headings:text-white prose-p:text-white/80 prose-a:text-cyan-200 prose-a:no-underline hover:prose-a:underline prose-strong:text-white max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: selectedArticle.contenu,
                      }}
                    />
                  </article>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 bg-white/5 border border-cyan-400/20 rounded-[32px] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] max-w-5xl mx-auto">
                  <div
                    className="flex items-center justify-between px-1 pb-4 text-xs text-white/80"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    <button
                      onClick={() => handleWeekChange(-1)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 hover:bg-cyan-500/20 transition"
                      aria-label="Semaine precedente"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      <span className="hidden sm:inline">Semaine precedente</span>
                    </button>
                    {weekStart && weekDates.length ? (
                      <div
                        className="uppercase tracking-[0.3em] text-[10px] text-cyan-100/80"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {formatDateParts(weekStart).day} {" "}
                        {formatDateParts(weekStart).monthShort} - {" "}
                        {formatDateParts(weekDates[6]).day} {" "}
                        {formatDateParts(weekDates[6]).monthShort}
                      </div>
                    ) : null}
                    <button
                      onClick={() => handleWeekChange(1)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 hover:bg-cyan-500/20 transition"
                      aria-label="Semaine suivante"
                    >
                      <span className="hidden sm:inline">Semaine suivante</span>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 sm:gap-3 pb-2">
                    {weekDates.length ? (
                      weekDates.map((dateStr) => {
                        const parts = formatDateParts(dateStr);
                        const isSelected = dateStr === selectedDate;
                        const eventCount = eventsByDate.get(dateStr) || 0;
                        const hasEvents = eventCount > 0;
                        return (
                          <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`h-24 sm:h-32 rounded-3xl flex flex-col items-center justify-center gap-1.5 border transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                              isSelected
                                ? "bg-gradient-to-br from-cyan-400 to-blue-600 text-white border-cyan-200/60 shadow-lg"
                                : "bg-white/5 text-white border-white/10 hover:bg-cyan-500/10"
                            }`}
                          >
                            <span
                              className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70"
                              style={{ fontFamily: "'Space Mono', monospace" }}
                            >
                              {parts.weekdayShort}
                            </span>
                            <span
                              className="text-[10px] sm:text-[11px] uppercase tracking-widest"
                              style={{ fontFamily: "'Space Mono', monospace" }}
                            >
                              {parts.monthShort}
                            </span>
                            <span
                              className="text-xl sm:text-2xl font-black"
                              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                            >
                              {parts.day}
                            </span>
                            {hasEvents ? (
                              <span
                                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-cyan-500/20 text-cyan-100"
                                }`}
                              >
                                {eventCount} évènement
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-white/50">
                                rien
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-white/70 text-sm py-6 px-4">
                        Aucun evenement disponible.
                      </div>
                    )}
                  </div>
                </div>

                {selectedParts && (
                  <div className="mt-10 flex justify-center">
                    <div className="px-8 py-5 rounded-3xl bg-white/5 border border-cyan-400/20 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                      <div
                        className="text-5xl font-black"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {selectedParts.day}
                      </div>
                      <div
                        className="text-xs uppercase tracking-[0.4em] text-white/70"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {selectedParts.weekday}
                      </div>
                      <div
                        className="text-sm uppercase tracking-[0.3em] text-white/80 mt-1"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {selectedParts.monthLong}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3 justify-items-center">
                  {activeEvents.length ? (
                    activeEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="group w-full max-w-[380px] bg-white/5 border border-cyan-400/20 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur transition-transform hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                      >
                        <div className="relative h-32 sm:h-40 rounded-2xl overflow-hidden bg-white/10 mb-4">
                          {ev.image ? (
                            <img
                              src={ev.image}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/60 text-xs uppercase tracking-widest">
                              Event
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#051a4a]/80 via-black/10 to-transparent" />
                          <span className="absolute bottom-3 left-4 text-xs uppercase tracking-widest text-white/90">
                            Event
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {ev.subCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className="text-[10px] font-bold uppercase px-2 py-1 rounded-full border"
                              style={{
                                color: getCategoryColor(cat.id),
                                borderColor: getCategoryColor(cat.id),
                              }}
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>

                        <h3
                          className="text-lg font-bold mb-2"
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                          dangerouslySetInnerHTML={{ __html: ev.titre }}
                        />
                        <p className="text-sm text-white/75 leading-relaxed">
                          {ev.resume}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/80">
                          <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30">
                            Heure: {ev.heure}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30">
                            Lieu: {ev.lieu}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedArticle(ev)}
                          className="mt-4 text-xs font-bold uppercase tracking-widest text-cyan-200 hover:text-white"
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        >
                          Lire l'article ➙
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-white/10 border border-dashed border-white/20 rounded-3xl p-8 text-center text-white/70">
                      Aucun evenement ce jour.
                    </div>
                  )}
                </div>
              </>
            )}

            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

              .agenda-article h2,
              .agenda-article h3,
              .agenda-article h4 {
                font-family: 'Bebas Neue', sans-serif;
              }
            `}</style>
          </>
        ) : (
          <div
            className="prose prose-slate max-w-none bg-white p-8 rounded-xl border border-[#eaeaea]"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        )}
      </div>
    </main>
  );
}

