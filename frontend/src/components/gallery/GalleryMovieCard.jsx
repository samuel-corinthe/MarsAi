import { Link } from "react-router-dom";

export default function GalleryMovieCard({
  movie,
  isLight,
  flagSrc,
  flagAlt,
  canManagePhaseSelection,
  isSelectionDisabled,
  isSelectionBusy,
  isSelectedForPhase2,
  isQuotaReachedForAdd,
  canManagePhase2Selection,
  onToggleSelection,
}) {
  return (
    <div className="group space-y-3">
      <Link to={`/movie/${movie.id}`} className="block">
        <div
          className={`relative mb-5 aspect-video overflow-hidden rounded-[30px] border shadow-xl ${
            isLight
              ? "border-cyan-100 bg-[linear-gradient(150deg,rgba(248,252,255,0.95),rgba(232,243,255,0.92))] shadow-[0_18px_40px_rgba(2,23,55,0.14)]"
              : "border-slate-50 bg-slate-100"
          }`}
        >
          <img
            src={movie.img}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        </div>
        <div className="px-2">
          <h4
            className={`font-black text-sm uppercase truncate mb-1 tracking-tight ${
              isLight ? "text-slate-900" : "text-cyan-300"
            }`}
          >
            {movie.title}
          </h4>
          <div className="flex items-center gap-2">
            {flagSrc ? (
              <img
                src={flagSrc}
                className={`h-3.5 w-5 rounded-[2px] border object-cover shadow-sm ${
                  isLight ? "border-cyan-100" : "border-slate-200"
                }`}
                alt={flagAlt}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-5 h-3.5 bg-slate-100 rounded-[2px]" />
            )}
            <p className={`text-[10px] font-black uppercase truncate tracking-[0.15em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {movie.director || "Anonyme"}
            </p>
          </div>
        </div>
      </Link>
      {canManagePhaseSelection && (
        <button
          type="button"
          className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
            isSelectionDisabled
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : isSelectedForPhase2
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
          } disabled:opacity-60`}
          onClick={onToggleSelection}
          disabled={isSelectionBusy || isSelectionDisabled}
        >
          {isSelectionBusy
            ? "..."
            : isSelectionDisabled
              ? (isQuotaReachedForAdd ? "Quota atteint" : "Non retenu phase 2")
              : isSelectedForPhase2
                ? (canManagePhase2Selection ? "Retirer de la phase 2" : "Retirer de la phase 3")
                : (canManagePhase2Selection ? "Selectionner pour phase 2" : "Selectionner pour phase 3")}
        </button>
      )}
    </div>
  );
}
