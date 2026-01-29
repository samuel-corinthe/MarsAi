import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";
import "./Agenda.css";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  // État pour la date sélectionnée (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Tes données d'événements
  const agendaItems = [
    {
      id: 1,
      date: "2026-01-29",
      titre: "Atelier IA",
      heure: "14:00",
      lieu: "Marseille",
    },
    {
      id: 2,
      date: "2026-02-14",
      titre: "Meetup Tech",
      heure: "10:00",
      lieu: "En ligne",
    },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getPageBySlug(slug);
        setPage(data);
      } catch {
        setPage(null);
      }
      setLoading(false);
    })();
  }, [slug]);

  // --- LOGIQUE DU CALENDRIER ---
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const days = [];
  // On ajuste pour que la semaine commence le Lundi (0=Dimanche en JS)
  const startOffset =
    firstDayOfMonth(currentYear, currentMonth) === 0
      ? 6
      : firstDayOfMonth(currentYear, currentMonth) - 1;

  for (let i = 0; i < startOffset; i++) days.push(null); // Cases vides
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

  // Filtrage des événements pour le jour cliqué
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
                  &lt;
                </button>
                <h3>
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
                  &gt;
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
                Événements du {selectedDate.getDate()}{" "}
                {selectedDate.toLocaleDateString("fr-FR", { month: "long" })}
              </h3>
              {activeEvents.length > 0 ? (
                activeEvents.map((ev) => (
                  <div key={ev.id} className="mini-event-card">
                    <strong>
                      {ev.heure} - {ev.titre}
                    </strong>
                    <p>📍 {ev.lieu}</p>
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
