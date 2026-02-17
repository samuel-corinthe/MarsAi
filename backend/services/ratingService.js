import { getDbPool } from "../db.js";
import {
  ensureRatingSchema,
  findMovieById,
  findMovieByIdForUpdate,
  findAdminRatingByMovie,
  findMovieRatingsSummary,
  upsertAdminRating,
  deleteAdminRating,
} from "../models/ratingModel.js";

export const COMMENT_MAX_LENGTH = 2000;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function toMovieId(rawValue) {
  const movieId = Number(rawValue);
  return Number.isFinite(movieId) && movieId > 0 ? movieId : null;
}

export function toAdminId(rawValue) {
  const adminId = Number(rawValue);
  return Number.isFinite(adminId) && adminId > 0 ? adminId : null;
}

export function toScore(rawValue) {
  const score = Number(rawValue);
  if (!Number.isFinite(score) || !Number.isInteger(score)) return null;
  if (score < 1 || score > 5) return null;
  return score;
}

export function toComment(rawValue) {
  if (rawValue == null) return { value: null, error: "" };
  const comment = String(rawValue).trim();
  if (!comment) return { value: null, error: "" };
  if (comment.length > COMMENT_MAX_LENGTH) {
    return {
      value: null,
      error: `comment invalide (max ${COMMENT_MAX_LENGTH} caracteres).`,
    };
  }

  return { value: comment, error: "" };
}

export async function getMyMovieRating({ adminId, movieId }) {
  const pool = getDbPool();
  await ensureRatingSchema(pool);

  const [movie, ratingRow, summaryRow] = await Promise.all([
    findMovieById(pool, movieId),
    findAdminRatingByMovie(pool, movieId, adminId),
    findMovieRatingsSummary(pool, movieId),
  ]);

  if (!movie) {
    throw createHttpError(404, "Film introuvable.");
  }

  const myScore = ratingRow ? Number(ratingRow.score) : null;
  const myComment = ratingRow ? String(ratingRow.comment || "") : "";
  const totalRatings = Number(summaryRow?.total || 0);
  const avgScoreRaw = summaryRow?.avg_score;
  const avgScore = avgScoreRaw == null ? null : Number(avgScoreRaw);

  return {
    movieId,
    myScore,
    myComment,
    summary: {
      totalRatings,
      avgScore,
    },
  };
}

export async function upsertMyMovieRating({ adminId, movieId, score, comment }) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await ensureRatingSchema(pool);
    await connection.beginTransaction();

    const movie = await findMovieByIdForUpdate(connection, movieId);
    if (!movie) {
      await connection.rollback();
      throw createHttpError(404, "Film introuvable.");
    }

    await upsertAdminRating(connection, {
      movieId,
      adminId,
      score,
      comment,
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    movieId,
    score,
    comment: comment || "",
  };
}

export async function deleteMyMovieRating({ adminId, movieId }) {
  const pool = getDbPool();
  await ensureRatingSchema(pool);
  await deleteAdminRating(pool, movieId, adminId);

  return {
    movieId,
    deleted: true,
  };
}
