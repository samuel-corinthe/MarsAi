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
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1. Récupération de la page principale (ex: "agenda")
        const pageData = await getPageBySlug(slug);

        if (!pageData) {
          setPage(null);
        } else {
          setPage(pageData);

          // 2. Si on est sur la page agenda, on récupère les articles
          if (slug === "agenda") {
            try {
              const allPosts = await getAgendaPosts();

              // LOG de debug : pour voir ce que l'API renvoie réellement
              console.log("Articles bruts reçus de WP :", allPosts);

              const ID_AGENDA = 14; //  ID de catégorie

              if (allPosts && Array.isArray(allPosts)) {
                const formattedEvents = allPosts
                  .filter(
                    (post) =>
                      post.categories && post.categories.includes(ID_AGENDA),
                  )
                  .map((post) => ({
                    id: post.id,
                    // post.date format: "2026-06-13T10:00:00" -> "2026-06-13"
                    date: post.date.split("T")[0],
                    titre: post.title.rendered,
                    heure: new Date(post.date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    lieu: "Marseille",
                    link: post.link,
                  }));

                console.log(
                  "Événements filtrés pour le calendrier :",
                  formattedEvents,
                );
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

  // --- LOGIQUE DU CALENDRIER ---
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const days = [];
  // Ajustement pour commencer par Lundi
  const startOffset =
    firstDayOfMonth(currentYear, currentMonth) === 0
      ? 6
      : firstDayOfMonth(currentYear, currentMonth) - 1;

  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth(currentYear, currentMonth); d++)
    days.push(d);

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const hasEvent = (day) => {
    if (!day) return false;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return agendaItems.some((item) => item.date === dateStr);
  };

  // Filtrage des événements pour la date sélectionnée (cliquée)
  const displayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const activeEvents = agendaItems.filter(
    (item) => item.date === displayDateStr,
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
            <div className="calendar-box">
              <div className="calendar-header">
                <button
                  onClick={() =>
                    setSelectedDate(new Date(currentYear, currentMonth - 1, 1))
                  }
                >
                  {" "}
                  &lt;{" "}
                </button>
                <h3 className="capitalize">
                  {selectedDate.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  onClick={() =>
                    setSelectedDate(new Date(currentYear, currentMonth + 1, 1))
                  }
                >
                  {" "}
                  &gt;{" "}
                </button>
              </div>

              <div className="calendar-grid">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div key={d} className="weekday">
                    {d}
                  </div>
                ))}
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`day-cell ${!day ? "empty" : ""} ${isToday(day) ? "today" : ""} ${selectedDate.getDate() === day ? "selected" : ""}`}
                    onClick={() =>
                      day &&
                      setSelectedDate(new Date(currentYear, currentMonth, day))
                    }
                  >
                    <span>{day}</span>
                    {hasEvent(day) && <span className="event-dot"></span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="events-sidebar">
              <h3>
                {selectedDate.getDate()}{" "}
                {selectedDate.toLocaleDateString("fr-FR", { month: "long" })}
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
                      Lire l'article
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
