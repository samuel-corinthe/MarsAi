import express from "express";
import {
  getMyRating,
  patchMyRating,
  deleteMyRating,
} from "../controllers/ratingController.js";

const router = express.Router();

router.get("/:movieId/me", getMyRating);
router.patch("/:movieId/me", patchMyRating);
router.delete("/:movieId/me", deleteMyRating);

export default router;
