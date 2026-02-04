

import express from 'express';
import { generateChallenge } from '../utils/AltchaValidator.js';

const router = express.Router();


router.get('/challenge', async (req, res) => {
  try {
    console.log(' [ALTCHA ROUTE] Demande de nouveau challenge');

    const challenge = await generateChallenge();

    res.status(200).json(challenge);
  } catch (error) {
    console.error(' [ALTCHA ROUTE ERROR]:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du challenge CAPTCHA'
    });
  }
});

export default router;
