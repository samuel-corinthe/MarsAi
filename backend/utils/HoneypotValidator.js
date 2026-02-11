import jwt from 'jsonwebtoken';

export const validateHoneypot = (req, res, next) => {
  try {
    
    const honeypotToken = req.body?.honeypotToken;
    
    if (!honeypotToken) {
      console.warn('[HONEYPOT] Token manquant');
      return res.status(400).json({ 
        error: 'la requête est invalide',
        message: 'Un token est nécessaire' 
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET manquant dans .env');
    }

    const decoded = jwt.verify(
      honeypotToken,
      process.env.JWT_SECRET
    );
    
    const { fieldName } = decoded;
    
    if (!fieldName) {
      console.warn('[HONEYPOT] Token invalide - fieldName manquant');
      return res.status(400).json({ 
        error: 'Token non valide' 
      });
    }

  
    const honeypotValue = req.body?.[fieldName];
    
    if (honeypotValue && honeypotValue.trim() !== '') {
      console.warn('[HONEYPOT] Bot détecté');
      
     
      return res.status(200).json({
        success: true,
        message: 'Le formulaire est bien soumis'
      });
    }
    
    console.log('[HONEYPOT] Validation OK');
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('[HONEYPOT] Token expiré');
      return res.status(400).json({ 
        error: 'Le token est expriré',
        message: 'Rafraichichez la page et rééssayez' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.warn('[HONEYPOT] Token invalide');
      return res.status(400).json({ 
        error: 'Le token n\' est pas valide' 
      });
    }
    
    console.error('[HONEYPOT] Erreur:', error.message);
    return res.status(500).json({ 
      error: 'Une erreur serveur est survenue' 
    });
  }
};
