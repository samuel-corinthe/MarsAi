export default function GalleryFilterModal({
  isOpen,
  isLight,
  onClose,
  sortOptions,
  sortBy,
  onSortChange,
  minRating,
  maxRating,
  onMinRatingChange,
  onMaxRatingChange,
  onReset,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <div
        className={`absolute inset-0 backdrop-blur-md ${
          isLight ? "bg-[#031233]/62" : "bg-cyan-950/80"
        }`}
        onClick={onClose}
      ></div>

      <div
        className={`relative w-full max-w-md rounded-[36px] p-8 shadow-2xl ${
          isLight
            ? "border border-cyan-200/80 bg-[linear-gradient(150deg,rgba(248,252,255,0.98),rgba(230,243,255,0.95))]"
            : "bg-white"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <h2
            id="filter-modal-title"
            className={`text-2xl font-black uppercase tracking-tight ${
              isLight ? "text-cyan-900" : "text-cyan-700"
            }`}
          >
            Filtres Avances
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer les filtres"
            className={`rounded-full p-2 ${
              isLight
                ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Trier par
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                    sortBy === option.value
                      ? isLight
                        ? "bg-[#0b1f46] text-cyan-300"
                        : "bg-cyan-950 text-cyan-200"
                      : isLight
                        ? "bg-cyan-50 text-slate-600 hover:bg-cyan-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Note (min - max)
              </p>
              <span
                className={`text-sm font-black ${
                  isLight ? "text-cyan-800" : "text-cyan-700"
                }`}
              >
                {minRating} - {maxRating}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="rating-min"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Min
                </label>
                <input
                  id="rating-min"
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={minRating}
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={minRating}
                  onChange={(event) => onMinRatingChange(Number(event.target.value))}
                  className={`w-full ${isLight ? "accent-cyan-600" : "accent-cyan-500"}`}
                />
              </div>
              <div>
                <label
                  htmlFor="rating-max"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Max
                </label>
                <input
                  id="rating-max"
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={maxRating}
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={maxRating}
                  onChange={(event) => onMaxRatingChange(Number(event.target.value))}
                  className={`w-full ${isLight ? "accent-cyan-600" : "accent-cyan-500"}`}
                />
              </div>
            </div>
          </div>

          <button
            onClick={onReset}
            className={`w-full rounded-2xl border py-3 text-xs font-black uppercase tracking-widest ${
              isLight
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            Reinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
