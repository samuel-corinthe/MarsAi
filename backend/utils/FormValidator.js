

import validator from 'validator';

export const FORM_CONSTRAINTS = {
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  FIRST_NAME: {
    MIN_LENGTH: 1,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u
  },

  LAST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u
  },

  AGE: {
    MIN_VALUE: 18,
    PATTERN: /^\d+$/
  },

  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{Pd}\p{Po}\p{Zs}]+$/u
  },

  DESCRIPTION: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u
  },
  COUNTRY_ALPHA2: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/
},

LANGUAGE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 25,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u
},

AI_TOOLS: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255
},

BIO: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u
}
};



export const sanitizeString = (str) => {
  if (!str) return '';

  
  let cleaned = str
    .trim()
    .replace(/\s+/g, ' ')        
    .replace(/<[^>]*>/g, '')     
    .replace(/[<>]/g, '');       

  
  cleaned = validator.escape(cleaned);

  return cleaned;
};


export const containsEmoji = (str) => {
  const emojiPattern = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiPattern.test(str);
};


export const validateField = (fieldName, value) => {
  const constraint = FORM_CONSTRAINTS[fieldName];
  if (!constraint) {
    return { valid: true, cleaned: sanitizeString(value) };
  }

  const cleaned = sanitizeString(value);

  
  if (constraint.MIN_LENGTH && cleaned.length < constraint.MIN_LENGTH) {
    return {
      valid: false,
      error: `${fieldName} trop court (min ${constraint.MIN_LENGTH} caractère(s))`,
      cleaned
    };
  }

  
  if (constraint.MAX_LENGTH && cleaned.length > constraint.MAX_LENGTH) {
    return {
      valid: false,
      error: `${fieldName} trop long (max ${constraint.MAX_LENGTH} caractères)`,
      cleaned
    };
  }

  
  if ((fieldName === 'FIRST_NAME' || fieldName === 'LAST_NAME') && containsEmoji(cleaned)) {
    return {
      valid: false,
      error: `${fieldName} ne peut pas contenir d'emojis`,
      cleaned
    };
  }

  
  if (constraint.PATTERN && cleaned && !constraint.PATTERN.test(cleaned)) {
    return {
      valid: false,
      error: `${fieldName} contient des caractères invalides`,
      cleaned
    };
  }

  return { valid: true, error: '', cleaned };
};


export const validateFormData = (req, res, next) => {
  console.log(' [VALIDATION] Validation du formulaire...');

  
  const email = req.body?.email?.toLowerCase().trim();
  if (!email) {
    console.log(' [VALIDATION] Email manquant');
    return res.status(400).json({ error: 'Email requis' });
  }

  if (!validator.isEmail(email)) {
    console.log(' [VALIDATION] Format email invalide:', email);
    return res.status(400).json({ error: 'Format email invalide' });
  }

  if (email.length > FORM_CONSTRAINTS.EMAIL.MAX_LENGTH) {
    console.log(` [VALIDATION] Email trop long: ${email.length} caractères`);
    return res.status(400).json({
      error: `l'Email est  trop long (max ${FORM_CONSTRAINTS.EMAIL.MAX_LENGTH} caractères)`
    });
  }

  req.body.email = email;

  
  if (!req.body?.firstName) {
    console.log(' [VALIDATION] Prénom manquant');
    return res.status(400).json({ error: 'Prénom requis' });
  }

  const firstNameValidation = validateField('FIRST_NAME', req.body.firstName);
  if (!firstNameValidation.valid) {
    console.log(' [VALIDATION] Prénom invalide:', firstNameValidation.error);
    return res.status(400).json({ error: firstNameValidation.error });
  }
  req.body.firstName = firstNameValidation.cleaned;

  
  if (!req.body?.lastName) {
    console.log(' [VALIDATION] Nom manquant');
    return res.status(400).json({ error: 'Nom requis' });
  }

  const lastNameValidation = validateField('LAST_NAME', req.body.lastName);
  if (!lastNameValidation.valid) {
    console.log(' [VALIDATION] Nom invalide:', lastNameValidation.error);
    return res.status(400).json({ error: lastNameValidation.error });
  }
  req.body.lastName = lastNameValidation.cleaned;

 
  if (!req.body?.age) {
    console.log(' [VALIDATION] Âge manquant');
    return res.status(400).json({ error: 'Âge requis' });
  }

  const ageValue = req.body.age.trim();
  if (!FORM_CONSTRAINTS.AGE.PATTERN.test(ageValue)) {
    console.log(' [VALIDATION] Format âge invalide:', ageValue);
    return res.status(400).json({ error: 'L\'âge doit être un nombre valide' });
  }

  const age = parseInt(ageValue, 10);
  if (age < FORM_CONSTRAINTS.AGE.MIN_VALUE) {
    console.log(` [VALIDATION] Âge trop jeune: ${age} ans`);
    return res.status(400).json({
      error: `Vous devez avoir au moins ${FORM_CONSTRAINTS.AGE.MIN_VALUE} ans pour participer`
    });
  }

  req.body.age = ageValue;


  if (!req.body?.title) {
    console.log(' [VALIDATION] Titre manquant');
    return res.status(400).json({ error: 'Titre requis' });
  }

  const titleValidation = validateField('TITLE', req.body.title);
  if (!titleValidation.valid) {
    console.log(' [VALIDATION] Titre invalide:', titleValidation.error);
    return res.status(400).json({ error: titleValidation.error });
  }
  req.body.title = titleValidation.cleaned;

  
  if (req.body?.description) {
    const descValidation = validateField('DESCRIPTION', req.body.description);
    if (!descValidation.valid) {
      console.log(' [VALIDATION] Description invalide:', descValidation.error);
      return res.status(400).json({ error: descValidation.error });
    }
    req.body.description = descValidation.cleaned;
  } else {
    req.body.description = '';
  }

 
  if (!req.body?.countryAlpha2) {
    console.log(' [VALIDATION] le  code pays  est manquant');
    return res.status(400).json({ error: ' Le code pay est  requis' });
  }
  const alpha2 = req.body.countryAlpha2.trim().toUpperCase();
  if (!FORM_CONSTRAINTS.COUNTRY_ALPHA2.PATTERN.test(alpha2)) {
    console.log(' [VALIDATION] Le code pays  est invalide:', alpha2);
    return res.status(400).json({ error: 'Code pays invalide (2 lettres, ex: FR)' });
  }
  req.body.countryAlpha2 = alpha2;

  
  if (!req.body?.language) {
    console.log(' [VALIDATION]  La langue est  manquante');
    return res.status(400).json({ error: ' La langue du film  est requise' });
  }
  const langValidation = validateField('LANGUAGE', req.body.language);
  if (!langValidation.valid) {
    console.log(' [VALIDATION] Langue invalide:', langValidation.error);
    return res.status(400).json({ error: langValidation.error });
  }
  req.body.language = langValidation.cleaned;

 
  if (!req.body?.aiTools) {
    console.log(' [VALIDATION] Outils IA manquants');
    return res.status(400).json({ error: 'Les outils IA sont requis' });
  }
  const aiToolsCleaned = sanitizeString(req.body.aiTools);
  if (aiToolsCleaned.length > FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH) {
    return res.status(400).json({ error: 'Le nom des outils IA est trop long (max 255 caractères)' });
  }
  const toolsArray = aiToolsCleaned.split(',').map(t => t.trim()).filter(Boolean);
  if (toolsArray.length === 0) {
    return res.status(400).json({ error: 'Au moins un outil IA  est requis' });
  }
  if (toolsArray.length > 5) {
    console.log(' [VALIDATION] Trop d\'outils IA:', toolsArray.length);
    return res.status(400).json({ error: '5 outils IA maximum' });
  }
  req.body.aiTools = toolsArray.join(', ');

 
  if (req.body?.bio) {
    const bioValidation = validateField('BIO', req.body.bio);
    if (!bioValidation.valid) {
      console.log(' [VALIDATION] Bio invalide:', bioValidation.error);
      return res.status(400).json({ error: bioValidation.error });
    }
    req.body.bio = bioValidation.cleaned;
  } else {
    req.body.bio = null;
  }

 
  const socialLinks = {};
  for (const key of ['socialWebsite', 'socialInstagram', 'socialFacebook', 'socialX']) {
    if (req.body?.[key] && req.body[key].trim()) {
      const url = req.body[key].trim();
      if (!validator.isURL(url, { require_protocol: true })) {
        console.log(` [VALIDATION] ${key} URL invalide:`, url);
        return res.status(400).json({ error: `${key} doit être une URL valide (avec https://)` });
      }
      const field = key.replace('social', '').toLowerCase();
      socialLinks[field] = url;
    }
  }
  req.body.socialLinks = Object.keys(socialLinks).length > 0 ? JSON.stringify(socialLinks) : null;

  let parsedCast = [];
  if (req.body?.cast) {
    try {
      parsedCast = typeof req.body.cast === 'string' ? JSON.parse(req.body.cast) : req.body.cast;
    } catch {
      return res.status(400).json({ error: 'Le format du casting est invalide' });
    }
  }

  if (parsedCast && !Array.isArray(parsedCast)) {
    return res.status(400).json({ error: 'Le casting doit etre un tableau' });
  }

  const castEntries = Array.isArray(parsedCast) ? parsedCast : [];
  if (castEntries.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 membres de casting.' });
  }

  const normalizedCastEntries = [];
  for (const rawMember of castEntries) {
    const name = sanitizeString(rawMember?.name || '');
    const role = sanitizeString(rawMember?.role || '');
    const avatarUrl = String(rawMember?.avatarUrl || rawMember?.img || '').trim();

    if (!name && !role && !avatarUrl) {
      continue;
    }

    if (!name || !role) {
      return res.status(400).json({ error: 'Chaque membre du casting doit avoir un nom et un role.' });
    }

    if (name.length > 120 || role.length > 120) {
      return res.status(400).json({ error: 'Nom/role de casting trop long (max 120 caracteres).' });
    }

    if (avatarUrl && !validator.isURL(avatarUrl, { require_protocol: true })) {
      return res.status(400).json({ error: 'URL avatar invalide dans le casting (https:// obligatoire).' });
    }

    normalizedCastEntries.push({
      name,
      role,
      avatarUrl,
    });
  }

  req.body.cast = normalizedCastEntries.length > 0 ? JSON.stringify(normalizedCastEntries) : null;

  console.log(' [VALIDATION] Formulaire validé avec succès');
  next();
};

