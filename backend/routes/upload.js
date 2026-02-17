import express from "express";
import { uploadYoutubeVideo } from "../controllers/uploadController.js";
import {
  ipLimiter,
  emailLimiter,
  concurrentLimiter,
  uploadSingleVideo,
} from "../middlewares/uploadMiddleware.js";
import { validateAltchaMiddleware } from "../utils/AltchaValidator.js";
import { validateFormData } from "../utils/FormValidator.js";
import { validateEmail } from "../utils/EmailValidator.js";
import { validateFileMagicBytes } from "../utils/FileTypeValidator.js";
import { validateHoneypot } from "../utils/HoneypotValidator.js";
import { cleanMetadataMiddleware } from "../utils/MetadataCleaner.js";

const router = express.Router();

router.post(
  "/youtube",
  ipLimiter,
  concurrentLimiter,
  uploadSingleVideo,
  validateHoneypot,
  validateFileMagicBytes,
  validateAltchaMiddleware,
  validateFormData,
  validateEmail,
  emailLimiter,
  cleanMetadataMiddleware,
  uploadYoutubeVideo,
);

export default router;
