import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { generateChallenge } from '../utils/AltchaValidator.js';

const router = express.Router();

const ALTCHA_CHALLENGE_LIMIT_PER_HOUR = Number.parseInt(
  process.env.ALTCHA_CHALLENGE_LIMIT_PER_HOUR || '120',
  10,
);

const challengeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number.isFinite(ALTCHA_CHALLENGE_LIMIT_PER_HOUR) && ALTCHA_CHALLENGE_LIMIT_PER_HOUR > 0
    ? ALTCHA_CHALLENGE_LIMIT_PER_HOUR
    : 120,
  message: { error: 'Vous avez depasse le maximum de requetes par heure. Reessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function genenateRandomFieldName() {
  return `field_${crypto.randomBytes(6).toString('hex')}`;
}

router.get('/challenge', challengeLimiter, async (req, res) => {
  try {
    console.log('[ALTCHA] Nouveau challenge demande');

    const challenge = await generateChallenge();

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET manquant dans .env');
    }

    const honeypotFieldName = genenateRandomFieldName();
    const honeypotToken = jwt.sign(
      {
        fieldName: honeypotFieldName,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' },
    );

    res.status(200).json({
      ...challenge,
      honeypot: {
        token: honeypotToken,
        fieldName: honeypotFieldName,
      },
    });
  } catch (error) {
    console.error('[ALTCHA] Erreur:', error.message);
    res.status(500).json({
      error: 'Erreur lors de la generation du challenge CAPTCHA',
    });
  }
});

export default router;
