

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateChallenge } from '../utils/AltchaValidator.js';

const router = express.Router();

function genenateRandomFieldName(){
  return `field_${crypto.randomBytes(6).toString('hex')}`;
}

router.get('/challenge', async (req, res) => {
  try {
    console.log(' [ALTCHA ROUTE] Demande de nouveau challenge');

    const challenge = await generateChallenge();

    
    const honeypotFieldName = genenateRandomFieldName();
    const honeypotToken = jwt.sign(
      { 
        fieldName: honeypotFieldName,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || 'votre-secret-jwt',
      { expiresIn: '30m' }
    );

    
    res.status(200).json({
      ...challenge,
      honeypot: {
        token: honeypotToken,
        fieldName: honeypotFieldName
      }
    });
  } catch (error) {
    console.error(' [ALTCHA ROUTE ERROR]:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du challenge CAPTCHA'
    });
  }
});


export default router;
