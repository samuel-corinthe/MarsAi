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
import { sendUploadSuccessMail } from "../services/messagingService.js";
import { getSessionFromRequest } from "../services/authService.js";
import { getSitePhaseState } from "../services/sitePhaseService.js";
import {
  isObjectStorageConfigured,
  getObjectStorageMissingEnv,
  uploadFileToObjectStorage,
} from "../services/objectStorageService.js";

const router = express.Router();
const pool = getDbPool();

const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024;
const MAX_SRT_SIZE_BYTES = 1024 * 1024;
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

function toSafeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function parseSocialLinks(rawValue) {
  if (!rawValue) return {};

  let source = rawValue;
  if (typeof rawValue === "string") {
    try {
      source = JSON.parse(rawValue);
    } catch {
      return {};
    }
  }

  if (!source || typeof source !== "object") return {};

  const normalized = {};
  const website = toSafeExternalUrl(source.website);
  const instagram = toSafeExternalUrl(source.instagram);
  const facebook = toSafeExternalUrl(source.facebook);
  const x = toSafeExternalUrl(source.x || source.twitter);

  if (website) normalized.website = website;
  if (instagram) normalized.instagram = instagram;
  if (facebook) normalized.facebook = facebook;
  if (x) normalized.x = x;

  return normalized;
}

function parseCastEntries(rawValue) {
  if (!rawValue) return [];

  let source = rawValue;
  if (typeof rawValue === "string") {
    try {
      source = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(source)) return [];

  return source
    .map((entry) => {
      const name = String(entry?.name || "").trim();
      const role = String(entry?.role || "").trim();
      const avatarUrl = String(entry?.avatarUrl || entry?.img || "").trim();

      if (!name && !role && !avatarUrl) return null;

      return {
        name,
        role,
        avatarUrl,
      };
    })
    .filter((entry) => entry && entry.name && entry.role)
    .slice(0, 10);
}

function buildYoutubeDescription({ description, bio, socialLinks }) {
  const sections = [];

  const socialEntries = [];
  if (socialLinks.instagram) socialEntries.push(`[Instagram] ${socialLinks.instagram}`);
  if (socialLinks.facebook) socialEntries.push(`[Facebook] ${socialLinks.facebook}`);
  if (socialLinks.x) socialEntries.push(`[X] ${socialLinks.x}`);
  if (socialLinks.website) socialEntries.push(`[Site web] ${socialLinks.website}`);
  if (socialEntries.length > 0) {
    sections.push(socialEntries.join("\n"));
  }

  const cleanedBio = String(bio || "").trim();
  if (cleanedBio) {
    sections.push(`Bio:\n${cleanedBio}`);
  }

  const cleanedDescription = String(description || "").trim();
  if (cleanedDescription) {
    sections.push(`Description:\n${cleanedDescription}`);
  }

  return sections.join("\n\n").trim() || "Video uploadee via MarsAI";
}

function toCountryFlagPath(flagPath, alpha2) {
  const alpha2Value = String(alpha2 || "").trim().toLowerCase();
  const fallbackPath = alpha2Value ? `/images/flags/${alpha2Value}.png` : "";
  const raw = String(flagPath || "").trim();
  if (!raw) return fallbackPath;
  if (/^https?:\/\//i.test(raw)) return raw;

  let normalized = raw.startsWith("/") ? raw : `/${raw}`;
  normalized = normalized.replace(/\/images\/flags\/png100px\//i, "/images/flags/");

  if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(normalized) && alpha2Value) {
    normalized = `/images/flags/${alpha2Value}.png`;
  }

  return normalized || fallbackPath;
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

router.get("/countries", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          alpha2,
          name_fr,
          name_eng,
          flag_path
        FROM countries
        ORDER BY name_fr ASC, name_eng ASC, alpha2 ASC
      `,
    );

    const countries = (Array.isArray(rows) ? rows : []).map((row) => {
      const alpha2 = String(row.alpha2 || "").trim().toUpperCase();
      return {
        id: Number(row.id),
        alpha2,
        nameFr: String(row.name_fr || "").trim(),
        nameEn: String(row.name_eng || "").trim(),
        flagPath: toCountryFlagPath(row.flag_path, alpha2),
      };
    });

    return res.json({ ok: true, countries });
  } catch (error) {
    console.error("[UPLOAD] countries error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les pays.",
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
    const bio = req.body?.bio ? String(req.body.bio).trim() : "";
    const parsedSocialLinks = parseSocialLinks(req.body?.socialLinks ? String(req.body.socialLinks) : null);
    const socialLinks = Object.keys(parsedSocialLinks).length > 0
      ? JSON.stringify(parsedSocialLinks)
      : null;
    const castEntries = parseCastEntries(req.body?.cast ? String(req.body.cast) : null);
    const youtubeDescription = buildYoutubeDescription({
      description,
      bio,
      socialLinks: parsedSocialLinks,
    });
    const videoFile = req.files?.video?.[0];
    const subtitleFile = req.files?.subtitle?.[0];
    const posterFile = req.files?.poster?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Aucun fichier video recu." });
    }

    if (!isObjectStorageConfigured()) {
      cleanupFile(videoFile.path);
      cleanupFile(subtitleFile?.path);
      cleanupFile(posterFile?.path);
      return res.status(500).json({
        error: "Stockage Scaleway S3 non configure.",
        details: `Variables manquantes: ${getObjectStorageMissingEnv().join(", ")}`,
      });
    }

    try {
      const sitePhaseState = await getSitePhaseState();
      const phaseKey = String(sitePhaseState?.currentPhase || "phase_1").toLowerCase();
      if (phaseKey === "phase_2" || phaseKey === "phase_3") {
        const session = getSessionFromRequest(req);
        const role = String(session?.role || "").toLowerCase();
        const hasAdminSession = role === "admin" || role === "superadmin";
        if (!hasAdminSession) {
          cleanupFile(videoFile.path);
          cleanupFile(subtitleFile?.path);
          cleanupFile(posterFile?.path);
          return res.status(403).json({
            error: "Uploads visiteurs desactives pendant les phases 2 et 3.",
          });
        }
      }
    } catch (phaseError) {
      cleanupFile(videoFile.path);
      cleanupFile(subtitleFile?.path);
      cleanupFile(posterFile?.path);
      return res.status(500).json({
        error: "Impossible de verifier la phase du site avant upload.",
        details: phaseError.message,
      });
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
            description: youtubeDescription,
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
      const videoName = `${slug}-${youtubeId}.mp4`;
      const storedVideo = await uploadFileToObjectStorage({
        localFilePath: videoFile.path,
        objectKey: `videos/${videoName}`,
        contentType: "video/mp4",
        cacheControl: "public, max-age=31536000, immutable",
      });
      const videoStorageUrl = storedVideo.url;

      let posterUrl = `https://picsum.photos/seed/${slug}-${youtubeId}/600/900`;
      if (posterFile) {
        const posterExt = path.extname(posterFile.originalname || "").toLowerCase() || ".jpg";
        const posterName = `${slug}-${youtubeId}${posterExt}`;
        const storedPoster = await uploadFileToObjectStorage({
          localFilePath: posterFile.path,
          objectKey: `posters/${posterName}`,
          contentType: posterFile.mimetype || undefined,
          cacheControl: "public, max-age=31536000, immutable",
        });
        posterUrl = storedPoster.url;
      }

      if (subtitleFile) {
        const subtitleName = `${slug}-${youtubeId}.srt`;
        await uploadFileToObjectStorage({
          localFilePath: subtitleFile.path,
          objectKey: `subtitles/${subtitleName}`,
          contentType: "application/x-subrip",
          cacheControl: "public, max-age=31536000, immutable",
        });
      }

      const submittedBy = `${String(req.body?.firstName || "").trim()} ${String(req.body?.lastName || "").trim()}`
        .trim() || "Utilisateur";
      const countryAlpha2 = String(req.body?.countryAlpha2 || "").trim().toUpperCase();
      const language = String(req.body?.language || "").trim();
      const aiTools = String(req.body?.aiTools || "").trim();
      const dbBio = bio || null;
      const duration = Math.max(1, Math.round(Number(metadata?.duration || 0)));
      const releaseYear = new Date().getFullYear();

      const [countryRows] = await pool.query(
        "SELECT id FROM countries WHERE alpha2 = ? LIMIT 1",
        [countryAlpha2],
      );

      if (!Array.isArray(countryRows) || countryRows.length === 0) {
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
          dbBio,
          socialLinks,
          description,
          duration,
          releaseYear,
          countryId,
          language,
          null,
          aiTools,
          posterUrl,
          videoStorageUrl,
          youtubeUrl,
          0,
          submittedBy,
          "en cours",
        ],
      );

      const movieId = Number(insertResult?.insertId || 0);

      if (movieId > 0 && castEntries.length > 0) {
        try {
          for (const [index, member] of castEntries.entries()) {
            await pool.query(
              `INSERT INTO movie_cast (movie_id, person_name, role_name, avatar_url, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [
                movieId,
                member.name,
                member.role || null,
                member.avatarUrl || null,
                index + 1,
              ],
            );
          }
        } catch (castError) {
          if (String(castError?.code || "") === "ER_NO_SUCH_TABLE") {
            console.warn("[UPLOAD] Table movie_cast absente, casting ignore.");
          } else {
            throw castError;
          }
        }
      }

      let confirmationEmailSent = false;
      let confirmationEmailError = "";
      try {
        await sendUploadSuccessMail({
          toEmail: String(req.body?.email || "").trim(),
          firstName: String(req.body?.firstName || "").trim(),
          lastName: String(req.body?.lastName || "").trim(),
          movieTitle: title || "Sans titre",
          videoUrl: youtubeUrl,
        });
        confirmationEmailSent = true;
      } catch (mailError) {
        confirmationEmailError = String(mailError?.message || "Echec envoi confirmation email");
        console.error("[UPLOAD] confirmation email error:", confirmationEmailError);
      }

      return res.status(200).json({
        ok: true,
        message: "Upload reussi !",
        videoId: youtubeId,
        movieId,
        videoUrl: videoStorageUrl,
        youtubeUrl,
        statusEndpoint: `/api/upload/youtube/status/${youtubeId}`,
        confirmationEmailSent,
        ...(confirmationEmailSent ? {} : { confirmationEmailError }),
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
