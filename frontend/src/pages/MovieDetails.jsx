import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import {
  deleteMyMovieRating,
  getCurrentSessionUser,
  getMovieById,
  getMyMovieRating,
  upsertMyMovieRating,
} from "../api";

function normalizeGenres(movie) {
  if (!movie) return [];
  if (Array.isArray(movie.genre)) return movie.genre;
  if (typeof movie.genre === "string" && movie.genre.trim()) return [movie.genre.trim()];
  return [];
}

const MovieDetails = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const galleryPath = i18n.language === "en" ? "/movies" : "/films";

  const [movie, setMovie] = useState(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieError, setMovieError] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialRating, setOfficialRating] = useState(null);
  const [officialComment, setOfficialComment] = useState("");
  const [tempRating, setTempRating] = useState(0);
  const [tempComment, setTempComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const movieId = Number.parseInt(id, 10);

  const seoTitle = movie?.title || t("movie_details.not_found");
  const seoDescription = movie?.description || t("movie_details.back_to_gallery");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMovieLoading(true);
      setMovieError("");

      if (!Number.isFinite(movieId) || movieId <= 0) {
        setMovie(null);
        setMovieLoading(false);
        return;
      }

      try {
        const payload = await getMovieById(movieId);
        if (cancelled) return;
        setMovie(payload || null);
      } catch (error) {
        if (!cancelled) {
          setMovie(null);
          setMovieError(error?.message || "Impossible de charger ce film.");
        }
      } finally {
        if (!cancelled) {
          setMovieLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setRatingError("");
      setSessionChecked(false);
      setRatingLoading(false);

      if (!Number.isFinite(movieId) || movieId <= 0) {
        setIsAdmin(false);
        setOfficialRating(null);
        setOfficialComment("");
        setSessionChecked(true);
        return;
      }

      try {
        const sessionPayload = await getCurrentSessionUser();
        if (cancelled) return;

        const role = String(sessionPayload?.user?.role || "").toLowerCase();
        const canRate =
          Boolean(sessionPayload?.authenticated) &&
          (role === "admin" || role === "superadmin");
        setIsAdmin(canRate);

        if (!canRate) {
          setOfficialRating(null);
          setOfficialComment("");
          return;
        }

        setRatingLoading(true);
        try {
          const ratingPayload = await getMyMovieRating(movieId);
          if (cancelled) return;
          const myScore = Number(ratingPayload?.myScore);
          const myComment = String(ratingPayload?.myComment || "");
          setOfficialRating(Number.isFinite(myScore) ? myScore : null);
          setOfficialComment(myComment);
        } catch (error) {
          if (!cancelled) {
            setRatingError(error?.message || "Impossible de charger votre note.");
          }
        } finally {
          if (!cancelled) setRatingLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setOfficialRating(null);
          setOfficialComment("");
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const openRatingModal = () => {
    if (!isAdmin || !sessionChecked || ratingLoading) return;
    setTempRating(officialRating || 0);
    setTempComment(officialComment || "");
    setIsModalOpen(true);
  };

  const handleSaveVote = async () => {
    if (!isAdmin) return;
    if (!Number.isInteger(tempRating) || tempRating < 1 || tempRating > 5) return;

    setRatingError("");
    setRatingLoading(true);
    try {
      const normalizedComment = String(tempComment || "").trim();
      await upsertMyMovieRating(movieId, tempRating, normalizedComment);
      setOfficialRating(tempRating);
      setOfficialComment(normalizedComment);
      setIsModalOpen(false);
    } catch (error) {
      setRatingError(error?.message || "Impossible d'enregistrer la note.");
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDeleteVote = async () => {
    if (!isAdmin) return;

    setRatingError("");
    setRatingLoading(true);
    try {
      await deleteMyMovieRating(movieId);
      setOfficialRating(null);
      setOfficialComment("");
      setIsModalOpen(false);
    } catch (error) {
      setRatingError(error?.message || "Impossible de supprimer la note.");
    } finally {
      setRatingLoading(false);
    }
  };

  if (movieLoading) {
    return (
      <>
        <Seo
          title={t("movie_details.loading", "Chargement")}
          description={t("movie_details.back_to_gallery")}
          noIndex
        />
        <div className="min-h-screen bg-blue-950 text-white flex flex-col items-center justify-center p-6">
          <p className="text-xl font-black uppercase tracking-widest">
            {t("movie_details.loading", "Chargement...")}
          </p>
        </div>
      </>
    );
  }

  if (!movie) {
    return (
      <>
        <Seo
          title={t("movie_details.not_found")}
          description={t("movie_details.back_to_gallery")}
          noIndex
        />
        <div className="min-h-screen bg-blue-950 text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">
            {t("movie_details.not_found")}
          </h1>
          {movieError && (
            <p className="mb-6 text-sm text-rose-300 text-center max-w-xl">{movieError}</p>
          )}
          <Link
            to={galleryPath}
            className="bg-cyan-500 text-blue-950 px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all"
          >
            {t("movie_details.back_to_gallery")}
          </Link>
        </div>
      </>
    );
  }

  const movieGenres = normalizeGenres(movie);

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <div className="min-h-screen bg-blue-950 text-white font-sans relative">
        <div className="sticky top-0 z-30 border-b border-white/10 bg-blue-950/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
            <Link
              to={galleryPath}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/30 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-black/30 transition-all hover:border-cyan-300 hover:bg-cyan-500 hover:text-blue-950 sm:text-xs"
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="truncate">{t("movie_details.back_to_gallery")}</span>
            </Link>
          </div>
        </div>

        <section className="relative w-full pt-20 md:pt-32 pb-20 overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950">
          <div className="relative z-10 container mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start">
              <div className="w-64 h-70 md:w-80 shrink-0 shadow-2xl rounded-[40px] overflow-hidden border-4 border-white/10">
                <img
                  src={movie.img}
                  alt={movie.title}
                  className="w-full h-auto object-cover aspect-[2/3]"
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex justify-center md:justify-start gap-2 mb-6">
                  {movieGenres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-full uppercase tracking-wider"
                    >
                      {t(`genres.${genre.toLowerCase()}`, genre)}
                    </span>
                  ))}
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none uppercase">
                  {movie.title}
                </h1>

                <div className="flex justify-center md:justify-start items-center gap-6 text-slate-300 font-medium mb-10 text-lg">
                  <span className="flex items-center gap-2">
                    <span className="text-yellow-400 text-2xl">&#9733;</span>
                    {officialRating
                      ? `${officialRating}/5`
                      : t("movie_details.na")}
                  </span>
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                  <span>{movie.releaseDate}</span>
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                  <span>{movie.duration}</span>
                </div>

                <button className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-black px-12 py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 mx-auto md:mx-0 uppercase tracking-widest text-sm">
                  {t("movie_details.watch_movie")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-white text-slate-800 rounded-t-[60px] md:rounded-t-[100px] -mt-12 z-20 pb-20">
          <div className="container mx-auto px-6 md:px-20 pt-20">
            <div className="grid lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2">
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                    {t("movie_details.synopsis")}
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed font-medium">
                    {movie.description || t("movie_details.na")}
                  </p>
                </div>

                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-cyan-500 rounded-full"></span>{" "}
                    {t("movie_details.ai_stack")}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {movie.aiTools?.length > 0 ? (
                      movie.aiTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-5 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 uppercase text-xs tracking-widest"
                        >
                          {tool}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">
                        {t("movie_details.no_ai_tools")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                    {t("movie_details.casting")}
                  </h2>
                  {movie.cast?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {movie.cast.map((person, index) => (
                        <div
                          key={`${person.name || "cast"}-${index}`}
                          className="flex items-center gap-4 p-5 rounded-[30px] bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all"
                        >
                          <img
                            src={person.img || `https://i.pravatar.cc/150?u=cast-${movie.id}-${index}`}
                            className="w-16 h-16 rounded-2xl object-cover shadow-md"
                            alt={person.name || "Casting"}
                          />
                          <div>
                            <p className="font-black text-blue-900 leading-tight uppercase tracking-tighter">
                              {person.name || "Inconnu"}
                            </p>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                              {person.role || t("movie_details.na")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">{t("movie_details.na")}</p>
                  )}
                </div>

                {sessionChecked && isAdmin && (
                  <div className="mt-16 p-8 bg-blue-950 rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10">
                    <div>
                      <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-1">
                        {t("movie_details.admin_db_access")}
                      </p>
                      <h4 className="text-white font-black text-2xl uppercase tracking-tighter">
                        {t("movie_details.admin_note")} :{" "}
                        {officialRating
                          ? `${officialRating}/5`
                          : t("movie_details.admin_not_rated")}
                      </h4>
                      <p className="mt-2 text-sm text-cyan-100/90">
                        {t("movie_details.admin_comment")} :{" "}
                        {officialComment || t("movie_details.admin_no_comment")}
                      </p>
                    </div>
                    <button
                      onClick={openRatingModal}
                      className="bg-white text-blue-950 font-black px-10 py-4 rounded-2xl hover:bg-cyan-400 transition-all uppercase tracking-widest text-sm disabled:opacity-60"
                      disabled={ratingLoading}
                    >
                      {ratingLoading ? "..." : t("movie_details.admin_manage_note")}
                    </button>
                  </div>
                )}
                {ratingError && (
                  <p className="mt-4 text-sm font-semibold text-rose-500">{ratingError}</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100 h-fit shadow-sm">
                <h3 className="font-black text-blue-950 mb-8 uppercase text-sm tracking-[0.2em]">
                  {t("movie_details.tech_specs")}
                </h3>
                <div className="space-y-6">
                  <DetailRow
                    label={t("movie_details.global_rating")}
                    value={
                      officialRating
                        ? `${officialRating} / 5`
                        : t("movie_details.na")
                    }
                    isStar
                  />
                  <DetailRow
                    label={t("movie_details.director")}
                    value={movie.director}
                  />
                  <DetailRow
                    label={t("movie_details.release_date")}
                    value={movie.releaseDate}
                  />
                  <DetailRow
                    label={t("movie_details.duration")}
                    value={movie.duration}
                    last
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {sessionChecked && isAdmin && isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-blue-950/95 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="relative bg-white rounded-[50px] p-12 w-full max-w-sm shadow-2xl text-center">
              <h3 className="text-3xl font-black text-blue-950 mb-8 uppercase tracking-tighter italic">
                {t("movie_details.modal_title")}
              </h3>
              <div className="flex justify-center gap-3 mb-12">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTempRating(num)}
                    className={`w-12 h-14 rounded-2xl font-black text-2xl transition-all ${tempRating === num ? "bg-blue-600 text-white scale-110 shadow-xl" : "bg-slate-100 text-slate-300"}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="mb-6 text-left">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  {t("movie_details.modal_comment_label")}
                </label>
                <textarea
                  value={tempComment}
                  onChange={(event) => setTempComment(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder={t("movie_details.modal_comment_placeholder")}
                />
              </div>
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSaveVote}
                  className="w-full py-5 bg-blue-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all disabled:opacity-60"
                  disabled={ratingLoading || tempRating < 1 || tempRating > 5}
                >
                  {ratingLoading ? "..." : t("movie_details.modal_confirm")}
                </button>
                {officialRating && (
                  <button
                    onClick={handleDeleteVote}
                    className="text-red-500 font-bold uppercase text-xs tracking-widest py-2 disabled:opacity-60"
                    disabled={ratingLoading}
                  >
                    {t("movie_details.modal_delete")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const DetailRow = ({ label, value, isStar, last }) => (
  <div
    className={`flex flex-col ${!last ? "border-b border-slate-200 pb-4" : ""}`}
  >
    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">
      {label}
    </span>
    <span className="font-bold text-blue-900 uppercase flex items-center gap-2">
      {isStar && <span className="text-yellow-500 text-lg">&#9733;</span>}
      {value}
    </span>
  </div>
);

export default MovieDetails;
