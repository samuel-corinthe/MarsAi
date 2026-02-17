import multer from "multer";
import rateLimit from "express-rate-limit";
import { UPLOAD_CONSTRAINTS } from "../models/uploadModel.js";

const activeUploads = new Set();

export const ipLimiter = rateLimit({
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

export const emailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  validate: false,
  keyGenerator: (req) => req.body?.email || req.ip || "unknown",
  message: { error: "Cet email a deja soumis 3 videos aujourd'hui." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function concurrentLimiter(req, res, next) {
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
    fileSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    console.log("[MULTER] Filtrage fichier:", file.mimetype);
    if (!UPLOAD_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Type non autorise : ${file.mimetype}`));
    }
    return cb(null, true);
  },
});

export const uploadSingleVideo = upload.single("video");
