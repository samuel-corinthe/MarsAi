import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import rateLimit from "express-rate-limit";
import { google } from "googleapis";
import oauth2Client from "../utils/YT-client.js";
import { getDbPool } from "../db.js";
import { analyzeVideo } from "../utils/VideoAnalyser.js";
import { validateVideoData } from "../utils/VideoValidator.js";
import { validateFormData } from "../utils/FormValidator.js";
import { validateAltchaMiddleware } from "../utils/AltchaValidator.js";
import { validateEmail } from "../utils/EmailValidator.js";
import { validateFileMagicBytes } from "../utils/FileTypeValidator.js";
import { validateHoneypot } from "../utils/HoneypotValidator.js";
import { cleanMetadataMiddleware } from "../utils/MetadataCleaner.js";

const router = express.Router();
const pool = getDbPool();

const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024;
const MAX_SRT_SIZE_BYTES = 1024 * 1024;
const POSTER_UPLOAD_DIR = "uploads/posters";
const SUBTITLE_UPLOAD_DIR = "uploads/subtitles";
const DEFAULT_POSTER_SEED = "marsai";

const ipLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  validate: false,
  handler: (req, res, next, options) => {
    console.warn("[LIMITER] Limite IP atteinte");
    res.status(options.statusCode).json(options.message);
  },
  message: { error: "Trop de soumissions depuis cette connexion. Reessayez demain." },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  validate: false,
  keyGenerator: (req) => req.body?.email || req.ip || "unknown",
  message: { error: "Cet email a deja soumis 3 videos aujourd'hui." },
  standardHeaders: true,
  legacyHeaders: false,
});

const activeUploads = new Set();

function concurrentLimiter(req, res, next) {
  const ip = req.ip;

  if (activeUploads.has(ip)) {
    console.warn("[CONCURRENT] Upload deja en cours pour", ip);
    return res.status(429).json({ error: "Un upload est deja en cours. Veuillez patienter." });
  }

  activeUploads.add(ip);
  res.on("close", () => activeUploads.delete(ip));
  return next();
}

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "video") {
      if (file.mimetype !== "video/mp4") {
        return cb(new Error(`Type video non autorise : ${file.mimetype}`));
      }
      return cb(null, true);
    }

    if (file.fieldname === "poster") {
      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedImageTypes.includes(file.mimetype)) {
        return cb(new Error(`Type image non autorise : ${file.mimetype}`));
      }
      return cb(null, true);
    }

    if (file.fieldname === "subtitle") {
      const ext = path.extname(file.originalname || "").toLowerCase();
      if (ext !== ".srt") {
        return cb(new Error("Seul le format .srt est accepte pour les sous-titres"));
      }
      const allowedSubtitleMimes = ["text/plain", "application/x-subrip", "application/octet-stream"];
      if (!allowedSubtitleMimes.includes(file.mimetype)) {
        return cb(new Error(`Type sous-titre non autorise : ${file.mimetype}`));
      }
      return cb(null, true);
    }

    return cb(new Error(`Champ fichier inconnu : ${file.fieldname}`));
  },
});

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function cleanupFile(filePath) {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function toSlug(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return DEFAULT_POSTER_SEED;

  const normalized = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || DEFAULT_POSTER_SEED;
}

function validateSrtContent(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  if (content.length > MAX_SRT_SIZE_BYTES) {
    return { valid: false, error: "Fichier SRT trop volumineux (max 1 Mo)" };
  }

  const srtPattern = /\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
  if (!srtPattern.test(content)) {
    return { valid: false, error: "Le fichier ne semble pas etre un SRT valide" };
  }

  if (/<script/i.test(content)) {
    return { valid: false, error: "Le contenu du fichier SRT n'est pas autorise" };
  }

  return { valid: true };
}

function mapYoutubeStatus(item) {
  return {
    id: item?.id || null,
    uploadStatus: item?.status?.uploadStatus || null,
    privacyStatus: item?.status?.privacyStatus || null,
    rejectionReason: item?.status?.rejectionReason || null,
    processingStatus: item?.processingDetails?.processingStatus || null,
    processingFailureReason: item?.processingDetails?.processingFailureReason || null,
  };
}

async function fetchYoutubeStatus(videoId) {
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const response = await youtube.videos.list({
    part: "status,processingDetails",
    id: videoId,
  });

  return response?.data?.items?.[0] || null;
}

router.get("/youtube/status/:id", async (req, res) => {
  const videoId = String(req.params.id || "").trim();
  if (!videoId) {
    return res.status(400).json({ error: "Identifiant video invalide." });
  }

  try {
    const item = await fetchYoutubeStatus(videoId);
    if (!item) {
      return res.status(404).json({ error: "Video introuvable sur YouTube." });
    }

    return res.json({
      ok: true,
      status: mapYoutubeStatus(item),
    });
  } catch (error) {
    console.error("[UPLOAD] status youtube error:", error.message);
    return res.status(500).json({
      error: "Impossible de recuperer le statut YouTube.",
      details: error.message,
    });
  }
});

router.post(
  "/youtube",
  ipLimiter,
  concurrentLimiter,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "subtitle", maxCount: 1 },
    { name: "poster", maxCount: 1 },
  ]),
  validateHoneypot,
  validateFileMagicBytes,
  validateAltchaMiddleware,
  validateFormData,
  validateEmail,
  emailLimiter,
  cleanMetadataMiddleware,
  async (req, res) => {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const videoFile = req.files?.video?.[0];
    const subtitleFile = req.files?.subtitle?.[0];
    const posterFile = req.files?.poster?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Aucun fichier video recu." });
    }

    if (subtitleFile) {
      const srtValidation = validateSrtContent(subtitleFile.path);
      if (!srtValidation.valid) {
        cleanupFile(videoFile.path);
        cleanupFile(subtitleFile.path);
        cleanupFile(posterFile?.path);
        return res.status(400).json({ error: srtValidation.error });
      }
    }

    try {
      const metadata = await analyzeVideo(videoFile.path);
      const validation = validateVideoData(metadata);

      if (!validation.isValid) {
        const refusalReasons = validation.errors.map((entry) => entry.message).join(" ; ");
        cleanupFile(videoFile.path);
        cleanupFile(subtitleFile?.path);
        cleanupFile(posterFile?.path);

        return res.status(400).json({
          error: `Video refusee : ${refusalReasons}`,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
          metadata: validation.metadata,
        });
      }

      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      const uploadResponse = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
          snippet: {
            title: title || "Upload MarsAI",
            description: description || "Video uploadee via MarsAI",
          },
          status: {
            privacyStatus: "private",
          },
        },
        media: {
          body: fs.createReadStream(videoFile.path),
        },
      });

      const youtubeId = String(uploadResponse?.data?.id || "").trim();
      if (!youtubeId) {
        throw new Error("YouTube n'a pas retourne d'identifiant video.");
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      const slug = toSlug(title);

      let posterUrl = `https://picsum.photos/seed/${slug}-${youtubeId}/600/900`;
      if (posterFile) {
        ensureDirectory(POSTER_UPLOAD_DIR);
        const posterExt = path.extname(posterFile.originalname || "").toLowerCase() || ".jpg";
        const posterName = `${slug}-${youtubeId}${posterExt}`;
        const posterDest = path.join(POSTER_UPLOAD_DIR, posterName);
        fs.renameSync(posterFile.path, posterDest);

        const backendBase = String(
          process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
        ).replace(/\/$/, "");

        posterUrl = `${backendBase}/uploads/posters/${posterName}`;
      }

      const submittedBy = `${String(req.body?.firstName || "").trim()} ${String(req.body?.lastName || "").trim()}`
        .trim() || "Utilisateur";
      const countryAlpha2 = String(req.body?.countryAlpha2 || "").trim().toUpperCase();
      const language = String(req.body?.language || "").trim();
      const aiTools = String(req.body?.aiTools || "").trim();
      const bio = req.body?.bio ? String(req.body.bio) : null;
      const socialLinks = req.body?.socialLinks ? String(req.body.socialLinks) : null;
      const duration = Math.max(1, Math.round(Number(metadata?.duration || 0)));
      const releaseYear = new Date().getFullYear();

      const [countryRows] = await pool.query(
        "SELECT id FROM countries WHERE alpha2 = ? LIMIT 1",
        [countryAlpha2],
      );

      if (!Array.isArray(countryRows) || countryRows.length === 0) {
        cleanupFile(videoFile.path);
        cleanupFile(subtitleFile?.path);
        return res.status(400).json({ error: "Code pays introuvable dans la base." });
      }

      const countryId = Number(countryRows[0].id);

      const [insertResult] = await pool.query(
        `INSERT INTO movies
          (title, age, bio, social_links, synopsis, duration, release_year, country_id, language, subtitle_language, ai_tools, poster_url, video_url, youtube_url, view_count, submitted_by, submission_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title || "Sans titre",
          Number.parseInt(req.body?.age, 10),
          bio,
          socialLinks,
          description,
          duration,
          releaseYear,
          countryId,
          language,
          null,
          aiTools,
          posterUrl,
          youtubeUrl,
          youtubeUrl,
          0,
          submittedBy,
          "en cours",
        ],
      );

      const movieId = Number(insertResult?.insertId || 0);

      if (subtitleFile && movieId > 0) {
        ensureDirectory(SUBTITLE_UPLOAD_DIR);
        const subtitleDest = path.join(SUBTITLE_UPLOAD_DIR, `${movieId}.srt`);
        fs.renameSync(subtitleFile.path, subtitleDest);
      }

      return res.status(200).json({
        ok: true,
        message: "Upload reussi !",
        videoId: youtubeId,
        movieId,
        videoUrl: youtubeUrl,
        statusEndpoint: `/api/upload/youtube/status/${youtubeId}`,
      });
    } catch (error) {
      console.error("[UPLOAD] Erreur:", error.message);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "Erreur interne du serveur",
          details: error.message,
        });
      }
      return null;
    } finally {
      cleanupFile(videoFile?.path);
      cleanupFile(subtitleFile?.path);
      cleanupFile(posterFile?.path);
    }
  },
);

export default router;
