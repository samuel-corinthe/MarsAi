import { getDbPool } from "../db.js";
import {
  ensureDashboardSchema,
  fetchAdminUsers,
  fetchDashboardMovies,
  fetchNotedCount,
  fetchSelectionCount,
  fetchMoviesTotal,
  fetchAdminLogs,
  fetchNewsletterCount,
} from "../models/dashboardModel.js";
import {
  getDefaultMoviePosterUrl,
  isLegacyGeneratedPosterUrl,
} from "../utils/defaultPoster.js";

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

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

function toDashboardPosterUrl(row) {
  const rawPoster = String(row.poster_url || row.posterUrl || row.img || "").trim();
  if (rawPoster && !isLegacyGeneratedPosterUrl(rawPoster)) return rawPoster;

  const movieId = Number(row.id);
  const seed = Number.isFinite(movieId) && movieId > 0 ? movieId : "fallback";
  return getDefaultMoviePosterUrl(seed);
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
  const countries = [...new Set(films.map((film) => film.country))].sort((a, b) =>
    a.localeCompare(b, "fr"),
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

function toValidUserId(rawValue) {
  const userId = Number(rawValue);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export async function getDashboardPayload({ authUserId, authRole, queryAdminId }) {
  if (!process.env.DB_USER || !process.env.DB_NAME) {
    throw createHttpError(
      500,
      "Configuration base de donnees incomplete. Definis DB_HOST, DB_PORT, DB_USER, DB_PASSWORD et DB_NAME.",
    );
  }

  const safeAuthUserId = toValidUserId(authUserId);
  if (!safeAuthUserId) {
    throw createHttpError(401, "Session invalide.");
  }

  let requestedAdminId = safeAuthUserId;
  const safeQueryAdminId = toValidUserId(queryAdminId);
  if (authRole === "superadmin" && safeQueryAdminId) {
    requestedAdminId = safeQueryAdminId;
  }

  const pool = getDbPool();
  await ensureDashboardSchema(pool);

  const usersRows = await fetchAdminUsers(pool);
  if (!usersRows.length) {
    throw createHttpError(404, "Aucun utilisateur admin trouve.");
  }

  const currentUserRow = resolveCurrentUser(usersRows, requestedAdminId);
  const currentUserId = Number(currentUserRow.id);
  const selectionQuota = Number(process.env.SELECTION_QUOTA || 55);

  const [movieRows, noted, selected, moviesTotal, logsRows, newsletterCount] = await Promise.all([
    fetchDashboardMovies(pool, currentUserId),
    fetchNotedCount(pool, currentUserId),
    fetchSelectionCount(pool),
    fetchMoviesTotal(pool),
    fetchAdminLogs(pool),
    fetchNewsletterCount(pool),
  ]);

  const films = movieRows.map((row) => {
    const isSelected = Number(row.is_selected) > 0;
    const status = mapMovieStatus(row.submission_status, isSelected);

    return {
      id: row.id,
      title: row.title,
      slug: toSlug(row.title),
      director: String(row.submitted_by || "Anonyme").trim() || "Anonyme",
      img: toDashboardPosterUrl(row),
      country: row.name_fr || row.name_eng || "Inconnu",
      countryCode: String(row.country_alpha2 || "").trim().toLowerCase() || null,
      countryFlagPath: String(row.country_flag_path || "").trim() || null,
      status,
      rating: row.avg_rating == null ? 0 : Number(row.avg_rating),
      myRating: row.my_score == null ? null : Number(row.my_score),
      myComment: String(row.my_comment || ""),
      notesCount: Number(row.notes_count || 0),
      phase: mapPhase(status),
      duration: `${Number(row.duration || 0)} min`,
      tools: row.ai_tools || "N/A",
    };
  });

  const adminsCount = usersRows.filter((user) => ["admin", "superadmin"].includes(user.role)).length;
  const submitted = moviesTotal;
  const logs = logsRows.length ? logsRows.map(mapLogRow) : ["Aucun log disponible."];

  return {
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
  };
}
