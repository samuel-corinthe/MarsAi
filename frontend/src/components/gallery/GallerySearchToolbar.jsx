import { Link } from "react-router-dom";
import { getLocalizedMoviePath } from "../../utils/localizedRoutes";

export default function GallerySearchToolbar({
  searchRef,
  isLight,
  searchQuery,
  onSearchQueryChange,
  onSearchFocus,
  showSuggestions,
  suggestions,
  onSuggestionClick,
  onOpenFilters,
  sortBy,
  minRating,
  maxRating,
  activeSortLabel,
  onResetSort,
  onResetRating,
  canManagePhaseSelection,
  canManagePhase2Selection,
  phase2SelectedCount,
  phaseSelectionMinRequired,
  phase2SelectionError,
  language,
  t,
}) {
  return (
    <div role="search" className="w-full max-w-2xl">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-grow" ref={searchRef}>
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg
              aria-hidden="true"
              className={`h-5 w-5 ${isLight ? "text-cyan-700/70" : "text-slate-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            aria-label={t("gallery.search_placeholder", "Rechercher un film...")}
            placeholder={t(
              "gallery.search_placeholder",
              "Rechercher un film...",
            )}
            value={searchQuery}
            onFocus={onSearchFocus}
            onChange={(event) => {
              onSearchQueryChange(event.target.value);
            }}
            className={`w-full rounded-3xl border-2 py-5 pl-14 pr-6 text-lg font-bold outline-none transition-all ${
              isLight
                ? "border-cyan-100 bg-[linear-gradient(145deg,rgba(248,252,255,0.96),rgba(232,244,255,0.92))] text-slate-900 shadow-[0_14px_34px_rgba(2,23,55,0.12)] focus:border-cyan-400 focus:bg-white"
                : "border-slate-100 bg-slate-50 text-blue-950 shadow-sm focus:border-blue-600 focus:bg-white"
            }`}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div
              className={`absolute z-[100] mt-2 w-full overflow-hidden rounded-2xl border shadow-2xl ${
                isLight
                  ? "border-cyan-100 bg-[linear-gradient(145deg,rgba(248,252,255,0.98),rgba(231,243,255,0.95))]"
                  : "border-slate-100 bg-white"
              }`}
            >
              {suggestions.map((movie) => (
                <Link
                  key={movie.id}
                  to={getLocalizedMoviePath(movie.id, language)}
                  onClick={onSuggestionClick}
                  className={`flex w-full items-center gap-4 border-b px-6 py-4 transition-colors last:border-none ${
                    isLight
                      ? "border-cyan-50 hover:bg-cyan-50/70"
                      : "border-slate-50 hover:bg-blue-50"
                  }`}
                >
                  <img
                    src={movie.img}
                    alt=""
                    className="w-16 h-9 object-cover rounded-lg shadow-md"
                  />
                  <div>
                    <p
                      className={`font-black text-sm uppercase tracking-tighter ${
                        isLight ? "text-blue-950" : "text-cyan-400"
                      }`}
                    >
                      {movie.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onOpenFilters}
          className={`h-12 w-full rounded-2xl text-white shadow-lg transition-colors sm:h-[68px] sm:min-w-[68px] sm:w-auto ${
            isLight
              ? "bg-gradient-to-r from-cyan-500 to-sky-500 shadow-cyan-400/40 hover:brightness-105"
              : "bg-cyan-500 shadow-cyan-900/40 hover:bg-cyan-400"
          }`}
          aria-label={t("gallery.filter_button_aria")}
          title={t("gallery.filter_button_title")}
        >
          <svg
            aria-hidden="true"
            className="mx-auto h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 6h16M7 12h10M10 18h4"
            />
          </svg>
        </button>
      </div>

      {(sortBy !== "default" || minRating > 0 || maxRating < 5) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sortBy !== "default" && (
            <button
              onClick={onResetSort}
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                isLight
                  ? "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {t("gallery.sort_chip", { label: activeSortLabel })} x
            </button>
          )}
          {(minRating > 0 || maxRating < 5) && (
            <button
              onClick={onResetRating}
              className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100"
            >
              {t("gallery.rating_chip", { min: minRating, max: maxRating })} x
            </button>
          )}
        </div>
      )}

      {canManagePhaseSelection && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-wider ${
            isLight
              ? "border-cyan-200/80 bg-cyan-100/70 text-cyan-900"
              : "border-blue-100 bg-blue-50 text-blue-900"
          }`}
        >
          {canManagePhase2Selection
            ? t("gallery.selection_phase2")
            : t("gallery.selection_phase3")}: {phase2SelectedCount}/{phaseSelectionMinRequired}
        </div>
      )}
      {phase2SelectionError && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {phase2SelectionError}
        </div>
      )}
    </div>
  );
}
