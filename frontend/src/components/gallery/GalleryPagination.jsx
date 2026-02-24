export default function GalleryPagination({
  totalPages,
  currentPage,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-20 flex-wrap">
      {Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${
              page === currentPage
                ? "bg-blue-600 text-white shadow-xl"
                : "text-slate-400 border-2 border-transparent hover:text-blue-600 hover:border-blue-200"
            }`}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}
