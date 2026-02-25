import path from "node:path";
import fs from "node:fs";
import { google } from "googleapis";
import oauth2Client from "../utils/YT-client.js";
import { analyzeVideo } from "../utils/VideoAnalyser.js";
import { validateVideoData } from "../utils/VideoValidator.js";
import { sendUploadSuccessMail } from "../services/messagingService.js";
import { getSessionFromRequest } from "../services/authService.js";
import { getSitePhaseState } from "../services/sitePhaseService.js";
import {
  isObjectStorageConfigured,
  getObjectStorageMissingEnv,
  uploadFileToObjectStorage,
} from "../services/objectStorageService.js";
import { listCountriesForUpload } from "../models/countryModel.js";
import {
  findCountryIdByAlpha2,
  createMovieRecord,
  createMovieCastEntries,
} from "../models/uploadSubmissionModel.js";
import { mapCountriesForUpload } from "../services/countryService.js";
import { fetchYoutubeStatus, mapYoutubeStatus } from "../services/youtubeStatusService.js";

const MAX_SRT_SIZE_BYTES = 1024 * 1024;
const DEFAULT_POSTER_SEED = "marsai";

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

export async function submitYoutubeUpload(req, res) {
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
    const countryId = await findCountryIdByAlpha2(countryAlpha2);
    if (!countryId) {
      return res.status(400).json({ error: "Code pays introuvable dans la base." });
    }

    const movieId = await createMovieRecord({
      title: title || "Sans titre",
      age: Number.parseInt(req.body?.age, 10),
      bio: dbBio,
      socialLinks,
      synopsis: description,
      duration,
      releaseYear,
      countryId,
      language,
      subtitleLanguage: null,
      aiTools,
      posterUrl,
      videoUrl: videoStorageUrl,
      youtubeUrl,
      viewCount: 0,
      submittedBy,
      submissionStatus: "en cours",
    });

    if (movieId > 0 && castEntries.length > 0) {
      try {
        await createMovieCastEntries(movieId, castEntries);
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
}

export async function getYoutubeUploadStatus(req, res) {
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
}

export async function getUploadCountries(req, res) {
  try {
    const rows = await listCountriesForUpload();
    const countries = mapCountriesForUpload(rows);
    return res.json({ ok: true, countries });
  } catch (error) {
    console.error("[UPLOAD] countries error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les pays.",
      details: error.message,
    });
  }
}
