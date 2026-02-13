import express from "express";
import { getDbPool } from "../db.js";

const router = express.Router();

const STATUS_ORDER = ["en cours", "accepte", "selectionne", "refuse"];

const navItems = [
  { label: "Vue admin", href: "admin-top" },
  { label: "Profil", href: "profile" },
  { label: "Liste films", href: "films" },
  { label: "Widgets admin", href: "admin-widgets" },
  { label: "Super admin", href: "super-top" },
  { label: "Comptes", href: "accounts" },
  { label: "Phases", href: "phases" },
  { label: "Logs", href: "logs" },
  { label: "Newsletter", href: "newsletter" },
];

function normalizeLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function mapMovieStatus(rawStatus, isSelected) {
  if (isSelected) return "selectionne";

  const normalized = normalizeLabel(rawStatus);
  if (normalized === "accepte") return "accepte";
  if (normalized === "refuse") return "refuse";
  if (normalized === "en cours") return "en cours";
  return normalized || "en cours";
}

function mapPhase(status) {
  if (status === "selectionne") return "Finale";
  if (status === "en cours" || status === "accepte") return "Selection";
  return "Pre-selection";
}

function toStatusList(films) {
  const available = new Set(films.map((film) => film.status));
  const ordered = STATUS_ORDER.filter((status) => available.has(status));
  const extras = [...available].filter((status) => !STATUS_ORDER.includes(status));
  return ["tous", ...ordered, ...extras];
}

function toCountryList(films) {
  const countries = [...new Set(films.map((film) => film.country))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
  return ["tous", ...countries];
}

function buildPhaseTimeline({ quota, submitted, selected }) {
  const year = new Date().getUTCFullYear();
  const depotSelected = Math.min(selected, Math.round(quota * 0.25));

  return [
    {
      key: "depot",
      label: "Depot",
      start: `${year}-01-10T00:00:00Z`,
      end: `${year}-02-28T23:59:59Z`,
      quota,
      submitted,
      selected: depotSelected,
      description: "Collecte des films et verification des droits.",
    },
    {
      key: "selection",
      label: "Selection",
      start: `${year}-03-01T00:00:00Z`,
      end: `${year}-03-14T23:59:59Z`,
      quota,
      submitted,
      selected,
      description: "Notation et choix des finalistes.",
    },
    {
      key: "annonce",
      label: "Annonce",
      start: `${year}-03-20T00:00:00Z`,
      end: `${year}-03-21T23:59:59Z`,
      quota,
      submitted,
      selected,
      description: "Annonce publique et preparation presse.",
    },
  ];
}

function mapLogRow(row) {
  const actor = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Admin inconnu";
  const fallbackMessage = `${row.action_type || "Action"} sur ${row.target_table || "table"} #${
    row.target_id ?? "-"
  }`;
  const message = row.description || fallbackMessage;
  return `${actor}: ${message}`;
}

function resolveCurrentUser(usersRows, requestedAdminId) {
  if (Number.isFinite(requestedAdminId)) {
    const byId = usersRows.find((user) => Number(user.id) === requestedAdminId);
    if (byId) return byId;
  }

  const firstSuperAdmin = usersRows.find((user) => user.role === "superadmin");
  return firstSuperAdmin || usersRows[0];
}

function mapCurrentUser(userRow) {
  const fullName = `${userRow.first_name ?? ""} ${userRow.last_name ?? ""}`.trim();

  return {
    id: userRow.id,
    name: fullName || userRow.email || `admin-${userRow.id}`,
    email: userRow.email,
    phone: process.env.DASHBOARD_DEFAULT_PHONE || "",
    role: userRow.role || "admin",
    status: "actif",
    timezone: process.env.DASHBOARD_DEFAULT_TIMEZONE || "Europe/Paris",
    region: process.env.DASHBOARD_DEFAULT_REGION || "Europe",
    language: process.env.DASHBOARD_DEFAULT_LANGUAGE || "fr",
  };
}

router.get("/", async (req, res) => {
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    return res.status(500).json({
      error:
        "Configuration base de donnees incomplete. Definis DB_HOST, DB_PORT, DB_USER, DB_PASSWORD et DB_NAME.",
    });
  }

  const pool = getDbPool();
  const queryAdminId = Number(req.query.adminId);
  const authUserId = Number(req.auth?.userId);
  const authRole = req.auth?.role;

  if (!Number.isFinite(authUserId)) {
    return res.status(401).json({ error: "Session invalide." });
  }

  let requestedAdminId = authUserId;
  if (authRole === "superadmin" && Number.isFinite(queryAdminId)) {
    requestedAdminId = queryAdminId;
  }

  try {
    const [usersRows] = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM users ORDER BY id ASC",
    );

    if (!usersRows.length) {
      return res.status(404).json({ error: "Aucun utilisateur admin trouve." });
    }

    const currentUserRow = resolveCurrentUser(usersRows, requestedAdminId);
    const currentUserId = Number(currentUserRow.id);
    const selectionQuota = Number(process.env.SELECTION_QUOTA || 55);

    const [
      [movieRows],
      [notedRows],
      [selectionRows],
      [moviesTotalRows],
      [logsRows],
      [newsletterRows],
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            m.id,
            m.title,
            m.duration,
            m.ai_tools,
            m.submission_status,
            c.name_fr,
            c.name_eng,
            COUNT(ar.id) AS notes_count,
            AVG(ar.score) AS avg_rating,
            MAX(CASE WHEN ase.id IS NULL THEN 0 ELSE 1 END) AS is_selected
          FROM movies m
          LEFT JOIN countries c ON c.id = m.country_id
          LEFT JOIN admin_ratings ar ON ar.movie_id = m.id
          LEFT JOIN admin_selections ase ON ase.movie_id = m.id
          GROUP BY
            m.id,
            m.title,
            m.duration,
            m.ai_tools,
            m.submission_status,
            c.name_fr,
            c.name_eng
          ORDER BY m.id DESC
          LIMIT 200
        `,
      ),
      pool.query("SELECT COUNT(*) AS total FROM admin_ratings WHERE admin_id = ?", [
        currentUserId,
      ]),
      pool.query("SELECT COUNT(*) AS total FROM admin_selections"),
      pool.query("SELECT COUNT(*) AS total FROM movies"),
      pool.query(
        `
          SELECT
            l.action_type,
            l.target_table,
            l.target_id,
            l.description,
            u.first_name,
            u.last_name
          FROM admin_logs l
          LEFT JOIN users u ON u.id = l.admin_id
          ORDER BY l.action_date DESC
          LIMIT 20
        `,
      ),
      pool.query("SELECT COUNT(*) AS total FROM newsletter_subs"),
    ]);

    const films = movieRows.map((row) => {
      const isSelected = Number(row.is_selected) > 0;
      const status = mapMovieStatus(row.submission_status, isSelected);

      return {
        id: row.id,
        title: row.title,
        slug: toSlug(row.title),
        country: row.name_fr || row.name_eng || "Inconnu",
        status,
        rating: row.avg_rating == null ? 0 : Number(row.avg_rating),
        notesCount: Number(row.notes_count || 0),
        phase: mapPhase(status),
        duration: `${Number(row.duration || 0)} min`,
        tools: row.ai_tools || "N/A",
      };
    });

    const noted = Number(notedRows[0]?.total || 0);
    const selected = Number(selectionRows[0]?.total || 0);
    const moviesTotal = Number(moviesTotalRows[0]?.total || 0);
    const adminsCount = usersRows.filter((user) =>
      ["admin", "superadmin"].includes(user.role),
    ).length;
    const submitted = moviesTotal;
    const logs = logsRows.length ? logsRows.map(mapLogRow) : ["Aucun log disponible."];
    const newsletterCount = Number(newsletterRows[0]?.total || 0);

    return res.json({
      selectionTarget: selectionQuota,
      adminKpis: {
        noted,
        remaining: Math.max(0, moviesTotal - noted),
        selected,
        quota: selectionQuota,
      },
      films,
      statuses: toStatusList(films),
      countries: toCountryList(films),
      phaseFilters: ["toutes", "Pre-selection", "Selection", "Finale"],
      notes: ["toutes", ">= 4", "3 - 4", "< 3"],
      navItems,
      phaseTimeline: buildPhaseTimeline({
        quota: selectionQuota,
        submitted,
        selected,
      }),
      currentUser: mapCurrentUser(currentUserRow),
      adminsCount,
      logs,
      newsletterCount,
    });
  } catch (error) {
    console.error("[DASHBOARD] Erreur SQL:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les donnees dashboard depuis MariaDB.",
      details: error.message,
    });
  }
});

export default router;
