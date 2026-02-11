

import { createChallenge, verifySolution } from 'altcha-lib';
import crypto from 'crypto';


const ALTCHA_SECRET = process.env.ALTCHA_SECRET || crypto.randomBytes(32).toString('hex');


const CHALLENGE_OPTIONS = {
  algorithm: 'SHA-256',
  maxNumber: 1_000_000, 
  saltLength: 16,    
  hmacKey: ALTCHA_SECRET 
};


export const generateChallenge = async () => {
  try {
    const challenge = await createChallenge(CHALLENGE_OPTIONS);

    console.log('[ALTCHA] Challenge généré');

    return {
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      salt: challenge.salt,
      signature: challenge.signature
    };
  } catch (error) {
    console.error('[ALTCHA] Erreur génération challenge:', error.message);
    throw new Error('Impossible de générer le challenge CAPTCHA');
  }
};


export const verifyAltchaSolution = async (payload) => {
  if (!payload) {
    console.log('[ALTCHA] Payload manquant');
    return false;
  }

  try {
   
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    );

    console.log('[ALTCHA] Vérification solution...');

   
    
    const isValid = await verifySolution(decodedPayload, ALTCHA_SECRET);

    if (isValid) {
      console.log('[ALTCHA] Solution valide');
    } else {
      console.log('[ALTCHA] Solution invalide');
    }

    return isValid;
  } catch (error) {
    console.error('[ALTCHA] Erreur validation:', error.message);
    return false;
  }
};


export const validateAltchaMiddleware = async (req, res, next) => {
  console.log('[ALTCHA] Vérification CAPTCHA...');

  
  const altchaPayload = req.body?.altcha;

  if (!altchaPayload) {
    console.log('[ALTCHA] Payload CAPTCHA manquant');
    return res.status(400).json({
      error: 'Validation CAPTCHA requise. Veuillez rafraîchir la page.'
    });
  }

  
  const isValid = await verifyAltchaSolution(altchaPayload);

  if (!isValid) {
    console.log('[ALTCHA] CAPTCHA invalide');
    return res.status(400).json({
      error: 'Validation CAPTCHA échouée. Veuillez réessayer.'
    });
  }

  console.log('[ALTCHA] CAPTCHA validé');
  next();
};
