import express from "express";
import multer from "multer";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { validateFormData } from "../utils/FormValidator.js";
import { validateAltchaMiddleware } from "../utils/AltchaValidator.js";
import { validateEmail } from "../utils/EmailValidator.js";
import { validateFileMagicBytes } from "../utils/FileTypeValidator.js";
import { validateHoneypot } from "../utils/HoneypotValidator.js";
import { cleanMetadataMiddleware } from "../utils/MetadataCleaner.js";
import {
  getUploadCountries,
  getYoutubeUploadStatus,
  submitYoutubeUpload,
} from "../controllers/uploadController.js";

const router = express.Router();

const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024;

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

router.get("/youtube/status/:id", getYoutubeUploadStatus);
router.get("/countries", getUploadCountries);

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
  submitYoutubeUpload,
);

export default router;
