import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug, getAgendaPosts } from "../api";
import NotFound from "./NotFound";
import "./Agenda.css";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agendaItems, setAgendaItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 8));

  // Fonction pour définir les couleurs des sous-catégories
  const getCategoryColor = (catId) => {
    const colors = {
      15: "#e74c3c", // Exemple: Rouge pour "Concerts"
      16: "#3498db", // Exemple: Bleu pour "Conférences"
      17: "#f1c40f", // Exemple: Jaune pour "Ateliers"
      default: "#2ecc71", // Vert par défaut
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
              // On utilise une URL qui inclut les détails des catégories (embed)
              const res = await fetch(
                "/wp-json/wp/v2/posts?categories=14&_embed&per_page=100",
              );
              const allPosts = await res.json();

              if (allPosts && Array.isArray(allPosts)) {
                const formattedEvents = allPosts.map((post) => {
                  const datePart = post.date.split("T")[0];

                  // On récupère les noms des catégories via _embedded
                  const categoriesData = post._embedded?.["wp:term"]?.[0] || [];
                  // On filtre pour ne pas afficher la catégorie parente "Agenda" (ID 14)
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
                    subCategories: subCats, // On stocke les sous-catégories ici
                  };
                });
                setAgendaItems(formattedEvents);
              }
            } catch (postError) {
              console.error("Erreur articles agenda:", postError);
            }
          }
        }
      } catch (error) {
        console.error("Erreur API Globale:", error);
        setPage(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // --- LOGIQUE SEMAINE ---
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

  if (loading) return <div className="app-container page">Chargement…</div>;
  if (!page) return <NotFound />;

  return (
    <main className="app-container page">
      <div className="card card-pad">
        <h1
          className="h1"
          dangerouslySetInnerHTML={{ __html: page.title.rendered }}
        />

        {slug === "agenda" ? (
          <div className="agenda-custom-wrapper mt-8">
            {/* Calendrier Semaine */}
            <div className="calendar-box week-view">
              <div className="calendar-grid week-grid">
                {weekDays.map((date, idx) => {
                  const isSelected =
                    getLocalDateString(selectedDate) ===
                    getLocalDateString(date);
                  return (
                    <div
                      key={idx}
                      className={`day-cell ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="day-name">
                        {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </span>
                      <span className="day-number">{date.getDate()}</span>
                      {hasEvent(date) && <span className="event-dot"></span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Liste des Événements */}
            <div className="events-sidebar">
              <h3>
                {selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              {activeEvents.length > 0 ? (
                activeEvents.map((ev) => (
                  <div key={ev.id} className="mini-event-card">
                    {/* Affichage des Badges de Catégories */}
                    <div className="category-badges">
                      {ev.subCategories.map((cat) => (
                        <span
                          key={cat.id}
                          className="badge"
                          style={{ backgroundColor: getCategoryColor(cat.id) }}
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>

                    <strong dangerouslySetInnerHTML={{ __html: ev.titre }} />
                    <p>
                      🕒 {ev.heure} | 📍 {ev.lieu}
                    </p>
                    <a
                      href={ev.link}
                      target="_blank"
                      rel="noreferrer"
                      className="event-link"
                    >
                      Voir l'article
                    </a>
                  </div>
                ))
              ) : (
                <p className="no-data">Aucun événement ce jour.</p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="richtext mt-6"
            dangerouslySetInnerHTML={{ __html: page.content.rendered }}
          />
        )}
      </div>
    </main>
  );
}
