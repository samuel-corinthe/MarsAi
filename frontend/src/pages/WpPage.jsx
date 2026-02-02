import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agendaItems, setAgendaItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 8));

  // Style des badges (optionnel, sinon on garde le bleu partout)
  const getCategoryColor = (catId) => {
    const colors = {
      15: "#ff4757", // Rouge pour Concerts
      16: "#007bff", // Bleu pour Conférences
      17: "#ffa502", // Orange pour Ateliers
      default: "#2ed573", // Vert
    };
    return colors[catId] || colors.default;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const pageData = await getPageBySlug(slug);
        if (!pageData) {
          setPage(null);
        } else {
          setPage(pageData);
          if (slug === "agenda") {
            try {
              const res = await fetch(
                "/wp-json/wp/v2/posts?categories=14&_embed&per_page=100",
              );
              const allPosts = await res.json();
              if (allPosts && Array.isArray(allPosts)) {
                const formattedEvents = allPosts.map((post) => {
                  const datePart = post.date.split("T")[0];
                  const categoriesData = post._embedded?.["wp:term"]?.[0] || [];
                  const subCats = categoriesData.filter((cat) => cat.id !== 14);
                  return {
                    id: post.id,
                    date: datePart,
                    titre: post.title.rendered,
                    heure: new Date(post.date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    lieu: "Marseille",
                    link: post.link,
                    subCategories: subCats,
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
        setPage(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const weekStart = new Date(2026, 5, 8);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hasEvent = (date) =>
    agendaItems.some((item) => item.date === getLocalDateString(date));
  const activeEvents = agendaItems.filter(
    (item) => item.date === getLocalDateString(selectedDate),
  );

  if (loading)
    return (
      <div className="flex justify-center py-20 text-gray-400">Chargement…</div>
    );
  if (!page) return <NotFound />;

  return (
    <main className="min-h-screen bg-[#fcfcfc] text-[#333] p-4 md:p-12">
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-3xl font-bold mb-10 text-[#1a1a1a]"
          dangerouslySetInnerHTML={{ __html: page.title.rendered }}
        />

        {slug === "agenda" ? (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* SECTION CALENDRIER (calendar-box) */}
            <div className="flex-1 bg-white p-6 rounded-[16px] border border-[#eaeaea] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold capitalize">Juin 2026</h3>
              </div>

              {/* Grille du calendrier (calendar-grid) */}
              <div className="grid grid-cols-7 gap-2">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                  (day) => (
                    <span
                      key={day}
                      className="text-[10px] md:text-xs font-semibold text-[#a0a0a0] uppercase pb-2 text-center"
                    >
                      {day}
                    </span>
                  ),
                )}

                {weekDays.map((date, idx) => {
                  const isSelected =
                    getLocalDateString(selectedDate) ===
                    getLocalDateString(date);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-full transition-all text-sm md:text-base ${
                        isSelected
                          ? "bg-[#007bff] text-white font-bold shadow-[0_4px_10px_rgba(0,123,255,0.3)]"
                          : "hover:bg-[#f5f5f5] text-[#333]"
                      }`}
                    >
                      <span>{date.getDate()}</span>

                      {/* Point indicateur (event-dot) */}
                      {hasEvent(date) && (
                        <div
                          className={`absolute bottom-1.5 md:bottom-2 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-[#ff4757]"}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION LATERALE (events-sidebar) */}
            <div className="w-full lg:w-[350px]">
              <h3 className="text-xl font-bold mb-6 text-[#1a1a1a] capitalize">
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              <div className="space-y-4">
                {activeEvents.length > 0 ? (
                  activeEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white border border-[#eee] p-5 rounded-[12px] border-l-[5px] border-l-[#007bff] transition-transform hover:scale-[1.02]"
                    >
                      <div className="flex flex-wrap gap-2 mb-3">
                        {ev.subCategories.map((cat) => (
                          <span
                            key={cat.id}
                            style={{ color: getCategoryColor(cat.id) }}
                            className="text-[10px] font-bold uppercase tracking-wide"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>

                      <h4
                        className="text-base font-bold text-[#1a1a1a] mb-2 leading-tight"
                        dangerouslySetInnerHTML={{ __html: ev.titre }}
                      />

                      <p className="text-xs text-gray-500 mb-4 font-medium ">
                        🕒 {ev.heure} | 📍 {ev.lieu}
                      </p>

                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[#007bff] hover:underline"
                      >
                        VOIR L'ARTICLE →
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm">Aucun événement ce jour.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
