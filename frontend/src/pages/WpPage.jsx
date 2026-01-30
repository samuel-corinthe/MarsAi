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

  // On affiche la semaine du 13 Juin 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 13));

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
              const allPosts = await getAgendaPosts();
              const ID_AGENDA = 14;

              if (allPosts && Array.isArray(allPosts)) {
                const formattedEvents = allPosts
                  .filter(
                    (post) =>
                      post.categories && post.categories.includes(ID_AGENDA),
                  )
                  .map((post) => {
                    // RÉPARATION DATE : On prend la chaîne brute YYYY-MM-DD sans conversion UTC
                    const datePart = post.date.split("T")[0];

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

  // --- LOGIQUE AFFICHAGE SEMAINE (13 JUIN 2026) ---

  const weekStart = new Date(2026, 5, 8);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Fonction de comparaison de date sécurisée (format YYYY-MM-DD local)
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hasEvent = (date) => {
    return agendaItems.some((item) => item.date === getLocalDateString(date));
  };

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
            <div className="calendar-box week-view">
              <div className="calendar-header">
                <h3>Événements - Juin 2026</h3>
              </div>

              <div className="calendar-grid week-grid">
                {weekDays.map((date, idx) => {
                  const isSelected =
                    getLocalDateString(selectedDate) ===
                    getLocalDateString(date);
                  const dayLabel = date.toLocaleDateString("fr-FR", {
                    weekday: "short",
                  });
                  const dayNum = date.getDate();

                  return (
                    <div
                      key={idx}
                      className={`day-cell ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="day-name">{dayLabel}</span>
                      <span className="day-number">{dayNum}</span>
                      {hasEvent(date) && <span className="event-dot"></span>}
                    </div>
                  );
                })}
              </div>
            </div>

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
                    <strong dangerouslySetInnerHTML={{ __html: ev.titre }} />
                    <p>🕒 {ev.heure}</p>
                    <p>📍 {ev.lieu}</p>
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
                <p className="no-data">Rien de prévu ce jour.</p>
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
