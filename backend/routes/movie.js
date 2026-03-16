import express from "express";
import {
  downloadMovieById,
  getAllMovies,
  getMovieById,
  patchMovieYoutubeUrl,
} from "../controllers/movie.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getAllMovies);
router.get("/:id/download", downloadMovieById);
router.patch("/:id/youtube-url", requireAuth, requireRole(["admin", "superadmin"]), patchMovieYoutubeUrl);
router.get("/:id", getMovieById);

export default router;
