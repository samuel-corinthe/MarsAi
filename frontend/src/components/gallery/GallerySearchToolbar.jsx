import { Link } from "react-router-dom";

export default function GallerySearchToolbar({
  searchRef,
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
  t,
}) {
  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="relative flex-grow" ref={searchRef}>
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-slate-400"
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
            placeholder={t(
              "gallery.search_placeholder",
              "Rechercher un film...",
            )}
            value={searchQuery}
            onFocus={onSearchFocus}
            onChange={(event) => {
              onSearchQueryChange(event.target.value);
            }}
            className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-lg font-bold text-blue-950 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-sm"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              {suggestions.map((movie) => (
                <Link
                  key={movie.id}
                  to={`/movie/${movie.id}`}
                  onClick={onSuggestionClick}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors border-b last:border-none border-slate-50"
                >
                  <img
                    src={movie.img}
                    alt=""
                    className="w-16 h-9 object-cover rounded-lg shadow-md"
                  />
                  <div>
                    <p className="font-black text-blue-950 text-sm uppercase tracking-tighter">
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
          className="h-[68px] min-w-[68px] rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-300/40 hover:bg-blue-700 transition-colors"
          aria-label="Ouvrir les filtres avances"
          title="Filtres avances"
        >
          <svg
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
              className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 hover:bg-blue-100"
            >
              Tri: {activeSortLabel} x
            </button>
          )}
          {(minRating > 0 || maxRating < 5) && (
            <button
              onClick={onResetRating}
              className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100"
            >
              Note {minRating}-{maxRating} x
            </button>
          )}
        </div>
      )}

      {canManagePhaseSelection && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-blue-900">
          {canManagePhase2Selection ? "Selection phase 2" : "Selection jury phase 3"}: {phase2SelectedCount}/{phaseSelectionMinRequired}
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
