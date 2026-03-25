import path from "node:path";
import fs from "node:fs";
import { google } from "googleapis";
import oauth2Client from "../utils/YT-client.js";
import { analyzeVideo } from "../utils/VideoAnalyser.js";
import { validateVideoData } from "../utils/VideoValidator.js";
import { cleanMetadata } from "../utils/MetadataCleaner.js";
import { sendUploadSuccessMail } from "../services/messagingService.js";
import {
  isObjectStorageConfigured,
  getObjectStorageMissingEnv,
  uploadFileToObjectStorage,
} from "../services/objectStorageService.js";
import { getDefaultMoviePosterUrl } from "../utils/defaultPoster.js";
import { listCountriesForUpload } from "../models/countryModel.js";
import {
  findCountryIdByAlpha2,
  createMovieRecord,
  createMovieCastEntries,
} from "../models/uploadSubmissionModel.js";
import { mapCountriesForUpload } from "../services/countryService.js";
import { fetchYoutubeStatus, mapYoutubeStatus } from "../services/youtubeStatusService.js";
import { enqueueUploadJob, getUploadJob, setUploadJobStage } from "../services/uploadJobService.js";

const DEFAULT_POSTER_SEED = "marsai";
const ANALYZE_VIDEO_TIMEOUT_MS = Number(process.env.ANALYZE_VIDEO_TIMEOUT_MS || 45_000);
const YOUTUBE_UPLOAD_TIMEOUT_MS = Number(process.env.YOUTUBE_UPLOAD_TIMEOUT_MS || 480_000);
const MAIL_SEND_TIMEOUT_MS = Number(process.env.MAIL_SEND_TIMEOUT_MS || 10_000);
const METADATA_CLEAN_TIMEOUT_MS = Number(process.env.METADATA_CLEAN_TIMEOUT_MS || 30_000);

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
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

function toSafeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeEmailAddress(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw || null;
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

function buildSocialLinksInput(fields = {}) {
  if (fields?.socialLinks) {
    return fields.socialLinks;
  }

  const website = String(fields?.socialWebsite || "").trim();
  const instagram = String(fields?.socialInstagram || "").trim();
  const facebook = String(fields?.socialFacebook || "").trim();
  const x = String(fields?.socialX || "").trim();

  if (!website && !instagram && !facebook && !x) {
    return null;
  }

  return { website, instagram, facebook, x };
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

function cloneUploadFile(file) {
  if (!file) return null;
  return {
    path: String(file.path || "").trim(),
    originalname: String(file.originalname || "").trim(),
    mimetype: String(file.mimetype || "").trim(),
    size: Number(file.size) || 0,
  };
}

async function processQueuedYoutubeUpload({ jobId, payload }) {
  const fields = payload?.fields || {};
  const videoFile = payload?.files?.video || null;
  const subtitleFile = payload?.files?.subtitle || null;
  const posterFile = payload?.files?.poster || null;

  const title = String(fields?.title || "").trim();
  const description = String(fields?.description || "").trim();
  const bio = fields?.bio ? String(fields.bio).trim() : "";
  const parsedSocialLinks = parseSocialLinks(buildSocialLinksInput(fields));
  const socialLinks = Object.keys(parsedSocialLinks).length > 0
    ? JSON.stringify(parsedSocialLinks)
    : null;
  const castEntries = parseCastEntries(fields?.cast ? String(fields.cast) : null);
  const youtubeDescription = buildYoutubeDescription({
    description,
    bio,
    socialLinks: parsedSocialLinks,
  });

  if (!videoFile?.path) {
    throw new Error("Aucun fichier video recu.");
  }

  try {
    setUploadJobStage(jobId, "metadata_cleanup", "Nettoyage des metadonnees video...");
    await withTimeout(
      cleanMetadata(videoFile.path),
      METADATA_CLEAN_TIMEOUT_MS,
      "Nettoyage metadata trop long. Veuillez reessayer.",
    );

    setUploadJobStage(jobId, "video_analysis", "Analyse video en cours...");
    const metadata = await withTimeout(
      analyzeVideo(videoFile.path),
      ANALYZE_VIDEO_TIMEOUT_MS,
      "Analyse video trop longue. Veuillez reessayer.",
    );
    const validation = validateVideoData(metadata);
    if (!validation.isValid) {
      const refusalReasons = validation.errors.map((entry) => entry.message).join(" ; ");
      throw new Error(`Video refusee : ${refusalReasons}`);
    }

    setUploadJobStage(jobId, "youtube_upload", "Envoi vers YouTube en cours...");
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const uploadResponse = await withTimeout(
      youtube.videos.insert({
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
      }),
      YOUTUBE_UPLOAD_TIMEOUT_MS,
      "Upload vers YouTube trop long. Verifiez la connexion et reessayez.",
    );

    const youtubeId = String(uploadResponse?.data?.id || "").trim();
    if (!youtubeId) {
      throw new Error("YouTube n'a pas retourne d'identifiant video.");
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    setUploadJobStage(jobId, "youtube_uploaded", "Video envoyee a YouTube, finalisation...", {
      youtubeVideoId: youtubeId,
      youtubeUrl,
    });

    const slug = toSlug(title);
    setUploadJobStage(jobId, "storage_upload", "Envoi des fichiers sur le stockage...");
    const videoName = `${slug}-${youtubeId}.mp4`;
    const storedVideo = await uploadFileToObjectStorage({
      localFilePath: videoFile.path,
      objectKey: `videos/${videoName}`,
      contentType: "video/mp4",
      cacheControl: "public, max-age=31536000, immutable",
    });
    const videoStorageUrl = storedVideo.url;

    let posterUrl = getDefaultMoviePosterUrl(`${slug}-${youtubeId}`);
    if (posterFile?.path) {
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

    setUploadJobStage(jobId, "database_save", "Enregistrement de la soumission...");
    const submittedBy = `${String(fields?.firstName || "").trim()} ${String(fields?.lastName || "").trim()}`
      .trim() || "Utilisateur";
    const submitterEmail = normalizeEmailAddress(fields?.email);
    const countryAlpha2 = String(fields?.countryAlpha2 || "").trim().toUpperCase();
    const language = String(fields?.language || "").trim();
    const aiTools = String(fields?.aiTools || "").trim();
    const dbBio = bio || null;
    const duration = Math.max(1, Math.round(Number(metadata?.duration || 0)));
    const releaseYear = new Date().getFullYear();
    const countryId = await findCountryIdByAlpha2(countryAlpha2);
    if (!countryId) {
      throw new Error("Code pays introuvable dans la base.");
    }

    const movieId = await createMovieRecord({
      title: title || "Sans titre",
      age: Number.parseInt(fields?.age, 10),
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
      submitterEmail,
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

    setUploadJobStage(jobId, "email_send", "Envoi de l'email de confirmation...");
    let confirmationEmailSent = false;
    let confirmationEmailError = "";
    try {
      await withTimeout(
        sendUploadSuccessMail({
          toEmail: submitterEmail || "",
          firstName: String(fields?.firstName || "").trim(),
          lastName: String(fields?.lastName || "").trim(),
          movieTitle: title || "Sans titre",
          videoUrl: youtubeUrl,
          lang: String(fields?.lang || "fr").trim(),
        }),
        MAIL_SEND_TIMEOUT_MS,
        "Envoi email de confirmation trop long",
      );
      confirmationEmailSent = true;
    } catch (mailError) {
      confirmationEmailError = String(mailError?.message || "Echec envoi confirmation email");
      console.error("[UPLOAD] confirmation email error:", confirmationEmailError);
    }

    return {
      stage: "completed",
      message: "Traitement termine.",
      youtubeVideoId: youtubeId,
      movieId,
      youtubeUrl,
      videoUrl: videoStorageUrl,
      confirmationEmailSent,
      confirmationEmailError,
    };
  } finally {
    cleanupFile(videoFile?.path);
    cleanupFile(subtitleFile?.path);
    cleanupFile(posterFile?.path);
  }
}

function buildQueuedStatusFallback(job) {
  const jobStatus = String(job?.status || "").trim().toLowerCase();
  const processingStatus = jobStatus === "queued"
    ? "queued"
    : (jobStatus === "failed" ? "failed" : "processing");

  return {
    id: job?.youtubeVideoId || job?.id || null,
    trackingId: job?.id || null,
    youtubeVideoId: job?.youtubeVideoId || null,
    uploadStatus: jobStatus === "failed" ? "failed" : "uploaded",
    privacyStatus: null,
    rejectionReason: job?.error || null,
    processingStatus,
    processingFailureReason: job?.error || null,
    stage: job?.stage || null,
    jobStatus: job?.status || null,
    message: job?.message || null,
    confirmationEmailSent: typeof job?.confirmationEmailSent === "boolean"
      ? job.confirmationEmailSent
      : null,
    confirmationEmailError: String(job?.confirmationEmailError || "").trim() || null,
  };
}

async function resolveQueuedYoutubeStatus(job) {
  if (!job) return null;

  if (job.youtubeVideoId) {
    try {
      const item = await fetchYoutubeStatus(job.youtubeVideoId);
      if (item) {
        return {
          ...mapYoutubeStatus(item),
          trackingId: job.id,
          youtubeVideoId: job.youtubeVideoId,
          stage: job.stage || null,
          jobStatus: job.status || null,
          message: job.message || null,
          confirmationEmailSent: typeof job?.confirmationEmailSent === "boolean"
            ? job.confirmationEmailSent
            : null,
          confirmationEmailError: String(job?.confirmationEmailError || "").trim() || null,
        };
      }
    } catch (error) {
      console.warn("[UPLOAD] status fallback (job->youtube) error:", error.message);
    }
  }

  return buildQueuedStatusFallback(job);
}

export async function submitYoutubeUpload(req, res) {
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
    const queuedJob = enqueueUploadJob(processQueuedYoutubeUpload, {
      fields: { ...(req.body || {}) },
      files: {
        video: cloneUploadFile(videoFile),
        subtitle: cloneUploadFile(subtitleFile),
        poster: cloneUploadFile(posterFile),
      },
    });

    return res.status(202).json({
      ok: true,
      queued: true,
      message: "Upload recu. Traitement en cours.",
      videoId: queuedJob.id,
      trackingId: queuedJob.id,
      statusEndpoint: `/api/upload/youtube/status/${queuedJob.id}`,
      confirmationEmailSent: false,
    });
  } catch (error) {
    cleanupFile(videoFile?.path);
    cleanupFile(subtitleFile?.path);
    cleanupFile(posterFile?.path);
    console.error("[UPLOAD] queue error:", error.message);
    return res.status(500).json({
      error: "Erreur interne du serveur",
      details: error.message,
    });
  }
}

export async function getYoutubeUploadStatus(req, res) {
  const requestedId = String(req.params.id || "").trim();
  if (!requestedId) {
    return res.status(400).json({ error: "Identifiant video invalide." });
  }

  const queuedJob = getUploadJob(requestedId);
  if (queuedJob) {
    const status = await resolveQueuedYoutubeStatus(queuedJob);
    return res.json({ ok: true, status });
  }

  try {
    const item = await fetchYoutubeStatus(requestedId);
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
