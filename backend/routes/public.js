import express from "express";
import { sendEmail, subscribeNewsletter } from "../controllers/publicController.js";

const router = express.Router();

router.post("/send-email", sendEmail);
router.post("/subscribe-newsletter", subscribeNewsletter);
router.post("/newsletter/subscribe", subscribeNewsletter);

export default router;
