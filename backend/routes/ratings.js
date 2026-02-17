import express from "express";
import {
  getMyRating,
  patchMyRating,
  deleteMyRating,
} from "../controllers/ratingController.js";

const router = express.Router();

router.get("/:movieId/me", getMyRating);
router.patch("/:movieId/me", patchMyRating);
router.post("/:movieId/me/delete", deleteMyRating);

export default router;
