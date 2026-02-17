import express from "express";
import { sendEmail, subscribeNewsletter } from "../controllers/publicController.js";

const router = express.Router();

router.post("/send-email", sendEmail);
router.post("/subscribe-newsletter", subscribeNewsletter);

export default router;
