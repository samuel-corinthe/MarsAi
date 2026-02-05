import jwt from 'jsonwebtoken';

export const validateHoneypot = (req, res, next) => {
  try {
    
    const honeypotToken = req.body?.honeypotToken;
    
    if (!honeypotToken) {
      console.warn('[HONEYPOT] Token manquant');
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Honeypot token required' 
      });
    }

    const decoded = jwt.verify(
      honeypotToken, 
      process.env.JWT_SECRET || 'votre-secret-jwt'
    );
    
    const { fieldName } = decoded;
    
    if (!fieldName) {
      console.warn('[HONEYPOT] Token invalide - fieldName manquant');
      return res.status(400).json({ 
        error: 'Invalid token' 
      });
    }

  
    const honeypotValue = req.body?.[fieldName];
    
    if (honeypotValue && honeypotValue.trim() !== '') {
      console.warn('[HONEYPOT] Bot détecté ! Champ piège rempli:', fieldName);
      console.warn('[HONEYPOT] Valeur:', honeypotValue);
      console.warn('[HONEYPOT] IP:', req.ip);
      console.warn('[HONEYPOT] User-Agent:', req.headers['user-agent']);
      
     
      return res.status(200).json({
        success: true,
        message: 'Le formulaire est bien soumis'
      });
    }
    
    console.log(`[HONEYPOT] ✓ Champ "${fieldName}" vide (humain)`);
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('[HONEYPOT] Token expiré');
      return res.status(400).json({ 
        error: 'Token expired',
        message: 'Please refresh the page' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.warn('[HONEYPOT] Token invalide:', error.message);
      return res.status(400).json({ 
        error: 'Invalid token' 
      });
    }
    
    console.error('[HONEYPOT] Erreur:', error);
    return res.status(500).json({ 
      error: 'Internal error' 
    });
  }
};
