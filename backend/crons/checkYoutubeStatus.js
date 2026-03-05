import { google } from "googleapis";
import oauth2Client from "../utils/YT-client.js";
import { getDbPool } from "../db.js";

function extractVideoId(youtubeUrl) {
  const raw = String(youtubeUrl || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id || null;
    }

    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = pathParts.indexOf("shorts");
      if (shortsIndex >= 0 && pathParts[shortsIndex + 1]) {
        return pathParts[shortsIndex + 1];
      }
    }
  } catch {
    // Fall through to regex fallback.
  }

  const fallback = raw.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  return fallback ? fallback[1] : null;
}

function hasYoutubeCredentials() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_REFRESH_TOKEN",
  ];
  return required.every((name) => String(process.env[name] || "").trim().length > 0);
}

async function refuseMovie(pool, movieId) {
  await pool.query("UPDATE movies SET submission_status = 'refusé' WHERE id = ?", [movieId]);
}

export async function checkYoutubeStatus() {
  if (!hasYoutubeCredentials()) {
    console.warn("[CRON][youtube] skipped: missing Google OAuth env vars");
    return;
  }

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const pool = getDbPool();

  try {
    const [movies] = await pool.query(
      "SELECT id, title, youtube_url FROM movies WHERE youtube_url IS NOT NULL AND youtube_url != ''",
    );

    if (!Array.isArray(movies) || movies.length === 0) {
      console.log("[CRON][youtube] no movie with youtube_url in database");
      return;
    }

    const moviesByVideoId = new Map();
    for (const movie of movies) {
      const videoId = extractVideoId(movie.youtube_url);
      if (!videoId) continue;
      if (!moviesByVideoId.has(videoId)) moviesByVideoId.set(videoId, []);
      moviesByVideoId.get(videoId).push(movie);
    }

    const videoIds = [...moviesByVideoId.keys()];
    if (videoIds.length === 0) {
      console.log("[CRON][youtube] no valid YouTube video id found in URLs");
      return;
    }

    let issues = 0;

    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const response = await youtube.videos.list({
        part: "status,snippet",
        id: batch.join(","),
      });

      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      const returnedIds = new Set(items.map((item) => item?.id).filter(Boolean));

      for (const video of items) {
        const videoId = String(video?.id || "");
        const uploadStatus = String(video?.status?.uploadStatus || "").toLowerCase();
        if (uploadStatus !== "rejected" && uploadStatus !== "failed") continue;

        const reason =
          video?.status?.rejectionReason || video?.status?.failureReason || "unknown_reason";
        const linkedMovies = moviesByVideoId.get(videoId) || [];

        for (const movie of linkedMovies) {
          await refuseMovie(pool, movie.id);
          issues += 1;
          console.warn(
            `[CRON][youtube] marked movie as refused: id=${movie.id}, title="${movie.title}", videoId=${videoId}, reason=${reason}`,
          );
        }
      }

      for (const missingId of batch.filter((id) => !returnedIds.has(id))) {
        const linkedMovies = moviesByVideoId.get(missingId) || [];
        for (const movie of linkedMovies) {
          await refuseMovie(pool, movie.id);
          issues += 1;
          console.warn(
            `[CRON][youtube] missing video -> movie refused: id=${movie.id}, title="${movie.title}", videoId=${missingId}`,
          );
        }
      }
    }

    console.log(
      `[CRON][youtube] done, videosChecked=${videoIds.length}, problematicMovies=${issues}`,
    );
  } catch (error) {
    console.error("[CRON][youtube] failed:", error.message);
  }
}
