import express from 'express';
import rateLimit from 'express-rate-limit';
import { getAltchaChallenge } from '../controllers/altchaController.js';

const router = express.Router();

const ALTCHA_CHALLENGE_LIMIT_PER_HOUR = Number.parseInt(
  process.env.ALTCHA_CHALLENGE_LIMIT_PER_HOUR || '120',
  10,
);

export const challengeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number.isFinite(ALTCHA_CHALLENGE_LIMIT_PER_HOUR) && ALTCHA_CHALLENGE_LIMIT_PER_HOUR > 0
    ? ALTCHA_CHALLENGE_LIMIT_PER_HOUR
    : 120,
  message: { error: 'Vous avez depasse le maximum de requetes par heure. Reessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/challenge', challengeLimiter, getAltchaChallenge);

export default router;
