import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const adminKpis = {
  noted: 24,
  remaining: 31,
  selected: 42,
  quota: 55,
};

const films = [
  {
    title: "L'Aube Quantique",
    country: "France",
    status: "en cours",
    rating: 4.1,
    notesCount: 48,
    phase: "Sélection",
    duration: "18 min",
    tools: "Gen-vidéo + sound design IA",
  },
  {
    title: "Neon Dust",
    country: "États-Unis",
    status: "accepté",
    rating: 4.6,
    notesCount: 61,
    phase: "Finale",
    duration: "22 min",
    tools: "Rotoscopie IA",
  },
  {
    title: "Ciel Inversé",
    country: "Canada",
    status: "refusé",
    rating: 2.8,
    notesCount: 30,
    phase: "Pré-sélection",
    duration: "15 min",
    tools: "Upscale IA",
  },
  {
    title: "Retina",
    country: "Espagne",
    status: "en cours",
    rating: 3.9,
    notesCount: 21,
    phase: "Sélection",
    duration: "19 min",
    tools: "Storyboard IA",
  },
  {
    title: "Low Orbit",
    country: "Royaume-Uni",
    status: "accepté",
    rating: 4.4,
    notesCount: 55,
    phase: "Finale",
    duration: "24 min",
    tools: "Voice clone",
  },
];

const statuses = ["tous", "en cours", "accepté", "refusé"];
const countries = ["tous", "France", "États-Unis", "Canada", "Espagne", "Royaume-Uni"];
const phases = ["toutes", "Pré-sélection", "Sélection", "Finale"];
const notes = ["toutes", "≥ 4", "3 - 4", "< 3"];
const navItems = [
  { label: "Vue admin", href: "admin-top" },
  { label: "Liste films", href: "films" },
  { label: "Widgets admin", href: "admin-widgets" },
  { label: "Super admin", href: "super-top" },
  { label: "Comptes", href: "accounts" },
  { label: "Phases", href: "phases" },
  { label: "Logs", href: "logs" },
  { label: "Newsletter", href: "newsletter" },
];

function SparkLine({ data, stroke = "#f6c452" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 60 - ((val - min) / (max - min || 1)) * 60;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="spark">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f6c452" />
            <stop offset="60%" stopColor="#f2438b" />
            <stop offset="100%" stopColor="#25d0ff" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="url(#sparkGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          points={points}
        />
        <polyline
          fill="url(#sparkGradient)"
          opacity="0.18"
          points={`${points} 100,60 0,60`}
        />
      </svg>
    </div>
  );
}

function DonutSplit({ accepted, pending, rejected }) {
  const total = accepted + pending + rejected || 1;
  const a = (accepted / total) * 360;
  const p = (pending / total) * 360;
  const r = 360 - a - p;
  const style = {
    background: `conic-gradient(#25d0ff 0deg ${a}deg, #f6c452 ${a}deg ${a + p}deg, #f2438b ${a + p}deg 360deg)`,
  };

  return (
    <div className="donut" style={style}>
      <div className="core">
        <div className="text-xs text-slate-300/80">Statuts</div>
        <div className="font-semibold">{accepted}/{total}</div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-slate-300/80">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <div className="text-xs font-semibold">{Math.round(value)}%</div>
    </div>
  );
}

function Pill({ children, tone = "pink", active = false, onClick }) {
  const toneClass =
    tone === "cyan" ? "pill-cyan" : tone === "amber" ? "pill-amber" : "pill-pink";
  return (
    <button className={`chip ${active ? "chip-active" : ""} ${toneClass}`} onClick={onClick}>
      {children}
    </button>
  );
}

function FilmRow({ film }) {
  const badgeColor =
    film.status === "accepté"
      ? "bg-emerald-500/20 text-emerald-200"
      : film.status === "en cours"
        ? "bg-amber-400/15 text-amber-200"
        : "bg-rose-500/15 text-rose-200";

  return (
    <div className="table-row grid grid-cols-12 items-center gap-3 text-sm">
      <div className="col-span-4">
        <div className="font-semibold">{film.title}</div>
        <div className="text-xs text-slate-300/80">{film.tools}</div>
      </div>
      <div className="col-span-2 text-slate-200">{film.country}</div>
      <div className="col-span-2">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
          {film.status}
        </span>
      </div>
      <div className="col-span-2 font-semibold">{film.rating.toFixed(1)} ★</div>
      <div className="col-span-2 flex gap-2">
        <button className="btn-ghost px-3 py-1.5 rounded-lg border border-white/10">
          Voir
        </button>
        <button className="btn-primary px-3 py-1.5 rounded-lg">
          Noter
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [filters, setFilters] = useState({
    status: "tous",
    country: "tous",
    phase: "toutes",
    note: "toutes",
  });
  const [activeNav, setActiveNav] = useState(navItems[0].href);

  const handleNav = (href) => {
    setActiveNav(href);
    const el = document.getElementById(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredFilms = useMemo(() => {
    return films.filter((film) => {
      if (filters.status !== "tous" && film.status !== filters.status) return false;
      if (filters.country !== "tous" && film.country !== filters.country) return false;
      if (filters.phase !== "toutes" && film.phase !== filters.phase) return false;
      if (filters.note === "≥ 4" && film.rating < 4) return false;
      if (filters.note === "3 - 4" && (film.rating < 3 || film.rating >= 4)) return false;
      if (filters.note === "< 3" && film.rating >= 3) return false;
      return true;
    });
  }, [filters]);

  const selectionRatio = (adminKpis.selected / adminKpis.quota) * 100;

  const superStats = {
    films: 128,
    admins: 14,
    phasesProgress: 72,
    countdown: "12 jours restants (annonce finale 14 mars 2026)",
  };

  const logs = [
    "Admin Léa a accepté « Neon Dust »",
    "Super admin Idriss a modifié les dates de sélection",
    "Admin Chloé a noté « Retina » 4/5",
    "Super admin Idriss a exporté la newsletter (1423 emails)",
  ];

  return (
    <div className="dash-page">
      <div className="dash-shell dash-layout">
        <div className="flex gap-5 items-start">
          {/* Sidebar desktop */}
          <aside className="dash-sidenav">
            <Link to="/" className="flex items-center gap-2 px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              Home
            </Link>
            {navItems.map((item) => (
              <button
                key={item.href}
                className={activeNav === item.href ? "active" : ""}
                onClick={() => handleNav(item.href)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 space-y-8">
        <header id="admin-top" className="glass p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="pill pill-pink">Festival IA - cockpit</div>
            <h1 className="dash-title mt-3">Dashboard Admin & Super Admin</h1>
            <p className="dash-subtitle">
              Vue unifiée : juger les films, piloter les règles et la gouvernance du festival.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Pill tone="cyan">Quotas 55</Pill>
            <Pill tone="amber">Deadline proche</Pill>
            <Pill>Traçabilité active</Pill>
          </div>
        </header>

        {/* Admin area */}
        <section id="films" className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 glass p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="pill pill-cyan">Espace admin</div>
                <h2 className="text-2xl font-semibold mt-2">Vision rapide</h2>
              </div>
              <button
                className="btn-primary rounded-full px-4 py-2"
                disabled={adminKpis.selected >= adminKpis.quota}
                style={{
                  opacity: adminKpis.selected >= adminKpis.quota ? 0.6 : 1,
                  cursor: adminKpis.selected >= adminKpis.quota ? "not-allowed" : "pointer",
                }}
              >
                Ajouter à la sélection ({adminKpis.selected}/{adminKpis.quota})
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="stat-card glass-strong">
                <div className="kpi-label">Films notés par vous</div>
                <div className="kpi-value">{adminKpis.noted}</div>
                <div className="kpi-trend text-emerald-300">+4 cette semaine</div>
                <SparkLine data={[2, 5, 4, 7, 6, 9, 8]} stroke="#25d0ff" />
              </div>
              <div className="stat-card">
                <div className="kpi-label">Restants à voir</div>
                <div className="kpi-value">{adminKpis.remaining}</div>
                <div className="kpi-trend text-amber-200">Prioriser aujourd'hui</div>
                <SparkLine data={[9, 8, 7, 6, 5, 4, 4]} stroke="#f6c452" />
              </div>
              <div className="stat-card">
                <div className="kpi-label">Sélection officielle</div>
                <div className="kpi-value">
                  {adminKpis.selected}/{adminKpis.quota}
                </div>
                <div className="bar-track mt-2">
                  <div className="bar-fill" style={{ width: `${selectionRatio}%` }} />
                </div>
                <div className="kpi-trend text-pink-200 mt-1">
                  Quota critique à 55
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <Pill
                  key={s}
                  tone="pink"
                  active={filters.status === s}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
                >
                  Statut : {s}
                </Pill>
              ))}
              {countries.map((c) => (
                <Pill
                  key={c}
                  tone="cyan"
                  active={filters.country === c}
                  onClick={() => setFilters((f) => ({ ...f, country: c }))}
                >
                  Pays : {c}
                </Pill>
              ))}
              {phases.map((p) => (
                <Pill
                  key={p}
                  tone="amber"
                  active={filters.phase === p}
                  onClick={() => setFilters((f) => ({ ...f, phase: p }))}
                >
                  Phase : {p}
                </Pill>
              ))}
              {notes.map((n) => (
                <Pill
                  key={n}
                  active={filters.note === n}
                  onClick={() => setFilters((f) => ({ ...f, note: n }))}
                >
                  Note {n}
                </Pill>
              ))}
            </div>

            {/* Film table */}
            <div className="list-card">
              <div className="grid grid-cols-12 gap-3 table-header pb-2">
                <div className="col-span-4">Film</div>
                <div className="col-span-2">Pays</div>
                <div className="col-span-2">Statut</div>
                <div className="col-span-2">Moy. notes</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y divide-white/5">
                {filteredFilms.map((film) => (
                  <FilmRow key={film.title} film={film} />
                ))}
                {filteredFilms.length === 0 && (
                  <div className="py-6 text-sm text-slate-300">Aucun film ne correspond aux filtres.</div>
                )}
              </div>
            </div>
          </div>

          {/* Admin side widgets */}
          <div id="admin-widgets" className="xl:col-span-4 space-y-4">
            <div className="glass p-5 flex items-center gap-4">
              <DonutSplit accepted={2} pending={2} rejected={1} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-300" /> Acceptés (2)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-300" /> En cours (2)
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-300" /> Refusés (1)
                </div>
                <p className="text-xs text-slate-300/80">
                  Vue perso basée sur vos notations.
                </p>
              </div>
            </div>

            <div className="glass p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Retards de notation</h3>
                <span className="pill pill-amber">Priorité</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-200">
                <li>4 films en attente depuis 72h</li>
                <li>2 films proches de la deadline (48h)</li>
                <li>Quota 55 : {adminKpis.selected}/55 utilisés</li>
              </ul>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${selectionRatio}%` }} />
              </div>
            </div>

            <div className="glass p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Vos indicateurs</h3>
                <span className="text-xs text-slate-300/70">Auto-refresh 5 min</span>
              </div>
              <ProgressBar label="Notes déposées" value={68} color="linear-gradient(90deg,#25d0ff,#f6c452)" />
              <ProgressBar label="Commentaires" value={54} color="linear-gradient(90deg,#f2438b,#25d0ff)" />
              <ProgressBar label="Visionnage" value={72} color="linear-gradient(90deg,#f6c452,#f2438b)" />
            </div>
          </div>
        </section>

        {/* Super admin area */}
        <section id="super-top" className="glass p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="pill pill-pink">Espace super admin</div>
              <h2 className="text-2xl font-semibold mt-2">Pilotage & gouvernance</h2>
              <p className="dash-subtitle">
                Comptes, phases, règles métier, logs et newsletter — tout au même endroit.
              </p>
            </div>
            <button className="btn-primary rounded-full px-4 py-2">Créer un admin</button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="stat-card glass-strong">
              <div className="kpi-label">Films soumis</div>
              <div className="kpi-value">{superStats.films}</div>
              <div className="kpi-trend text-cyan-200">+12 vs hier</div>
            </div>
            <div className="stat-card">
              <div className="kpi-label">Admins actifs</div>
              <div className="kpi-value">{superStats.admins}</div>
              <div className="kpi-trend text-emerald-200">+1 nouveau</div>
            </div>
            <div className="stat-card">
              <div className="kpi-label">Progression phases</div>
              <div className="kpi-value">{superStats.phasesProgress}%</div>
              <div className="bar-track mt-2">
                <div className="bar-fill" style={{ width: `${superStats.phasesProgress}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <div className="kpi-label">Compte à rebours</div>
              <div className="kpi-value text-xl">{superStats.countdown}</div>
              <SparkLine data={[5, 4, 3, 3, 2, 1, 0]} stroke="#25d0ff" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2" id="accounts">
            <div className="list-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Gestion des comptes</h3>
                <span className="pill pill-cyan">Rôles</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Idriss</div>
                    <div className="text-xs text-slate-300/80">Super admin</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-1.5 rounded-lg border border-white/10">Logs</button>
                    <button className="btn-primary px-3 py-1.5 rounded-lg">Modifier</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Léa</div>
                    <div className="text-xs text-slate-300/80">Admin - Europe</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-1.5 rounded-lg border border-white/10">Désactiver</button>
                    <button className="btn-primary px-3 py-1.5 rounded-lg">Promouvoir</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Yuto</div>
                    <div className="text-xs text-slate-300/80">Admin - Asie</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-1.5 rounded-lg border border-white/10">Désactiver</button>
                    <button className="btn-primary px-3 py-1.5 rounded-lg">Promouvoir</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="list-card space-y-3" id="phases">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Phases & règles</h3>
                <span className="pill pill-amber">Dates clés</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li>📥 Dépôt : jusqu'au 28 fév 2026</li>
                <li>🧭 Sélection : 1 mars → 14 mars 2026</li>
                <li>📢 Annonce publique : 20 mars 2026</li>
              </ul>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${superStats.phasesProgress}%` }} />
              </div>
              <button className="btn-primary w-full mt-2 rounded-lg">Modifier les règles (quota 55, notation)</button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="list-card space-y-3 md:col-span-2" id="logs">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Logs & sécurité</h3>
                <span className="pill pill-pink">Traçabilité</span>
              </div>
              <ul className="space-y-2 text-sm">
                {logs.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button className="btn-ghost px-3 py-2 rounded-lg border border-white/10">Filtrer par admin</button>
                <button className="btn-primary px-3 py-2 rounded-lg">Exporter CSV</button>
              </div>
            </div>

            <div className="list-card space-y-3" id="newsletter">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Newsletter</h3>
                <span className="pill pill-cyan">1 423 inscrits</span>
              </div>
              <p className="text-sm text-slate-200">
                Export rapide pour annonce finale. Validation RGPD et opt-in déjà effectués.
              </p>
              <button className="btn-primary w-full rounded-lg">Exporter emails</button>
              <button className="btn-ghost w-full rounded-lg border border-white/10">Voir abonnés</button>
            </div>
          </div>
        </section>
          </div>
        </div>

        {/* Bottom nav mobile */}
        <div className="bottom-nav">
          <button
            className={activeNav === "admin-top" ? "active" : ""}
            onClick={() => handleNav("admin-top")}
          >
            Admin
          </button>
          <button
            className={activeNav === "films" ? "active" : ""}
            onClick={() => handleNav("films")}
          >
            Films
          </button>
          <button
            className={activeNav === "super-top" ? "active" : ""}
            onClick={() => handleNav("super-top")}
          >
            Super
          </button>
          <button
            className={activeNav === "logs" ? "active" : ""}
            onClick={() => handleNav("logs")}
          >
            Logs
          </button>
          <button onClick={() => (window.location.href = "/")}>Home</button>
        </div>

      </div>
    </div>
  );
}
