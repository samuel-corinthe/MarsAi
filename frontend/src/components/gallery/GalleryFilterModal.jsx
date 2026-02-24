export default function GalleryFilterModal({
  isOpen,
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-blue-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md rounded-[36px] bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight text-blue-950">
            Filtres Avances
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <svg
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
                      ? "bg-blue-950 text-cyan-300"
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
              <span className="text-sm font-black text-blue-700">
                {minRating} - {maxRating}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Min
                </p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={minRating}
                  onChange={(event) => onMinRatingChange(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Max
                </p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={maxRating}
                  onChange={(event) => onMaxRatingChange(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onReset}
            className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
          >
            Reinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
