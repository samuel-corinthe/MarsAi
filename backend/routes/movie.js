import express from "express";
import { downloadMovieById, getAllMovies, getMovieById } from "../controllers/movie.js";

const router = express.Router();

router.get("/", getAllMovies);
router.get("/:id/download", downloadMovieById);
router.get("/:id", getMovieById);

export default router;
