import express from "express";
import {
  wordpressLogin,
  updateMeProfile,
  getMe,
  logout,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/wordpress/login", wordpressLogin);
router.patch("/me/profile", requireAuth, updateMeProfile);
router.get("/me", getMe);
router.post("/logout", logout);

export default router;
