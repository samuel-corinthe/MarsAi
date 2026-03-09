import { Link } from "react-router-dom";
import { withDeploymentBase } from "../../utils/deploymentPath";

const COUNTRY_NAME_TO_CODE = {
  france: "fr",
  "etats unis": "us",
  "united states": "us",
  usa: "us",
  canada: "ca",
  espagne: "es",
  spain: "es",
  "royaume uni": "gb",
  "united kingdom": "gb",
  uk: "gb",
  belgique: "be",
  belgium: "be",
  allemagne: "de",
  germany: "de",
  italie: "it",
  italy: "it",
  maroc: "ma",
  algerie: "dz",
  tunisie: "tn",
};

function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeCountryName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCountryCode(film) {
  const rawCode = String(film.countryCode || film.country_code || "")
    .trim()
    .toLowerCase();
  if (/^[a-z]{2}$/.test(rawCode)) return rawCode;

  const normalizedCountry = normalizeCountryName(film.country);
  return COUNTRY_NAME_TO_CODE[normalizedCountry] || null;
}

function resolveMovieId(film) {
  const movieId = Number(film?.id ?? film?.movieId ?? film?.movie_id);
  if (!Number.isFinite(movieId) || movieId <= 0) return null;
  return movieId;
}

export default function FilmRow({
  film,
  filmsBasePath,
  onClaim,
  onRelease,
  onRate,
  canManagePhase2Selection,
  isPhase2Selected,
  isSelectionQuotaReached,
  isSelectionDisabled,
  selectionDisabledLabel,
  onTogglePhase2Select,
  phase2SelectionBusyMovieId,
  busyMovieId,
  selectionAddLabel,
  selectionRemoveLabel,
}) {
  const filmTitle = String(film.title || "Sans titre");
  const ratingLabel = Number.isFinite(film.rating) ? film.rating.toFixed(1) : "-";
  const myRatingLabel = Number.isFinite(film.myRating) ? `${film.myRating}/5` : "Non notee";
  const myComment = String(film.myComment || "").trim();
  const filmSlug = film.slug ?? toSlug(filmTitle);
  const movieId = resolveMovieId(film);
  const hasMovieId = movieId !== null;
  const moviePath = hasMovieId ? `/movie/${movieId}` : `${filmsBasePath}/${filmSlug}`;
  const isBusy = Number(busyMovieId) === Number(movieId);
  const canClaim = Boolean(film.canClaim);
  const canRelease = Boolean(film.canRelease);
  const directorLabel = String(
    film.director || film.submittedBy || film.submitted_by || "Anonyme",
  ).trim() || "Anonyme";
  const countryCode = resolveCountryCode(film);
  const posterUrl = String(
    film.img || film.poster || film.posterUrl || film.poster_url || "",
  ).trim();
  const CardWrapper = hasMovieId ? Link : "div";
  const cardWrapperProps = hasMovieId ? { to: moviePath } : {};
  const isPhase2SelectionBusy =
    Number(phase2SelectionBusyMovieId) === Number(movieId);

  return (
    <div className="dashboard-film-row rounded-3xl border border-slate-300/35 bg-slate-900/60 p-4 backdrop-blur md:p-5">
      <div className="grid gap-5 lg:grid-cols-[260px_1fr_220px] lg:items-start">
        <CardWrapper className="group block text-inherit" {...cardWrapperProps}>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-500/35 bg-slate-950 shadow-xl">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={filmTitle}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 px-4 text-center">
                <span className="text-xs font-black uppercase tracking-wide text-slate-200">
                  {filmTitle}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 px-1">
            <h4 className="truncate text-base font-black uppercase tracking-tight text-white">
              {filmTitle}
            </h4>
            <div className="mt-1 flex items-center gap-2">
              {countryCode ? (
                <img
                  src={withDeploymentBase(`/images/flags/${countryCode}.png`)}
                  className="h-3.5 w-5 rounded-[2px] border border-slate-200 object-cover shadow-sm"
                  alt={countryCode.toUpperCase()}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-3.5 w-5 rounded-[2px] bg-slate-200" />
              )}
              <p className="truncate text-[11px] font-black uppercase tracking-[0.15em] text-cyan-200/90">
                {directorLabel}
              </p>
            </div>
          </div>
        </CardWrapper>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-300/40 bg-slate-800/75 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-100">
              {film.status}
            </span>
            <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-200">
              {film.phase}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-slate-200/95 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-400/35 bg-slate-800/60 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/90">Pays</p>
              <p className="mt-0.5 font-semibold text-slate-100">{film.country}</p>
            </div>
            <div className="rounded-xl border border-slate-400/35 bg-slate-800/60 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/90">Duree</p>
              <p className="mt-0.5 font-semibold text-slate-100">{film.duration}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-400/35 bg-slate-800/60 px-3 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200/90">Stack IA</p>
            <p className="mt-0.5 text-sm font-medium text-slate-100/95">{film.tools || "Non renseigne"}</p>
          </div>

          <div className="rounded-xl border border-slate-400/35 bg-slate-800/60 px-3 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200/95">Mon commentaire</p>
            <p className="mt-1 text-sm text-slate-100/95" title={myComment || "Aucun commentaire"}>
              {myComment || "Aucun commentaire"}
            </p>
          </div>
        </div>

        <div className="space-y-3 lg:pl-2">
          <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200/95">Notes</p>
            <p className="mt-1 text-lg font-black text-white">
              {ratingLabel}
              <span className="ml-1 text-xs font-semibold text-slate-300/85">({film.notesCount})</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-100/95">Ma note: {myRatingLabel}</p>
          </div>

          <div className="grid gap-2">
            {hasMovieId ? (
              <Link className="btn-ghost justify-center rounded-xl border border-white/10 px-3 py-2" to={moviePath}>
                Visionner
              </Link>
            ) : (
              <button
                type="button"
                className="btn-ghost cursor-not-allowed justify-center rounded-xl border border-white/10 px-3 py-2 opacity-60"
                disabled
              >
                Visionner
              </button>
            )}

            <button
              className="btn-primary justify-center rounded-xl px-3 py-2 disabled:opacity-60"
              onClick={() => onRate?.({ ...film, id: movieId })}
              disabled={!hasMovieId}
            >
              Noter
            </button>

            {canManagePhase2Selection && (
              <button
                className="btn-ghost justify-center rounded-xl border border-white/10 px-3 py-2 disabled:opacity-60"
                onClick={() => onTogglePhase2Select?.(movieId, Boolean(isPhase2Selected))}
                disabled={!hasMovieId || isPhase2SelectionBusy || isSelectionDisabled || isSelectionQuotaReached}
              >
                {isPhase2SelectionBusy
                  ? "..."
                  : isSelectionQuotaReached
                    ? "Quota atteint"
                    : isSelectionDisabled
                      ? (selectionDisabledLabel || "Indisponible")
                      : isPhase2Selected
                        ? (selectionRemoveLabel || "Retirer")
                        : (selectionAddLabel || "Selectionner")}
              </button>
            )}

            {canClaim && (
              <button
                className="btn-primary justify-center rounded-xl px-3 py-2 disabled:opacity-60"
                onClick={() => onClaim?.(film)}
                disabled={isBusy}
              >
                {isBusy ? "..." : "Prendre"}
              </button>
            )}

            {canRelease && (
              <button
                className="btn-ghost justify-center rounded-xl border border-white/10 px-3 py-2 disabled:opacity-60"
                onClick={() => onRelease?.(film)}
                disabled={isBusy}
              >
                {isBusy ? "..." : "Retirer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
