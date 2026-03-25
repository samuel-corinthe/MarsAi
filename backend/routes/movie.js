import express from "express";
import {
  downloadMovieById,
  getAllMovies,
  getMovieById,
  getMoviePhase3Categories,
  patchMoviePhase3Categories,
  patchMovieYoutubeUrl,
} from "../controllers/movie.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getAllMovies);
router.get("/:id/download", downloadMovieById);
router.get(
  "/:id/phase3-categories",
  requireAuth,
  requireRole(["admin", "superadmin"]),
  getMoviePhase3Categories,
);
router.patch(
  "/:id/phase3-categories",
  requireAuth,
  requireRole(["admin", "superadmin"]),
  patchMoviePhase3Categories,
);
router.patch("/:id/youtube-url", requireAuth, requireRole(["admin", "superadmin"]), patchMovieYoutubeUrl);
router.get("/:id", getMovieById);

export default router;
