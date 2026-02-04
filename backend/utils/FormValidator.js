

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

  TITLE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{Pd}\p{Po}\p{Zs}]+$/u
  },

  DESCRIPTION: {
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
      error: `Email trop long (max ${FORM_CONSTRAINTS.EMAIL.MAX_LENGTH} caractères)`
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

  console.log(' [VALIDATION] Formulaire validé avec succès');
  next();
};
