const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movie");
// --- ROUTES PUBLIQUES ---
router.get("/", movieController.getAllMovies);
router.get("/:id", movieController.getMovieById);
// --- ROUTES ADMIN (Notation) ---
router.post("/:id/rate", movieController.rateMovie);
router.delete("/:id/rate", movieController.deleteMovieRating);
module.exports = router;
