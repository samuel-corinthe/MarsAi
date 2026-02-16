

export const FORM_CONSTRAINTS = {
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ERROR_MSG: "Veuillez entrer un email valide (ex: nom@domaine.fr)"
  },

  FIRST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG: "Le prénom doit contenir entre 1 et 50 caractères (lettres, tirets, apostrophes uniquement)"
  },

  LAST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG: "Le nom doit contenir entre 1 et 50 caractères (lettres, tirets, apostrophes uniquement)"
  },

  AGE: {
    MIN_VALUE: 18,
    PATTERN: /^\d+$/,
    ERROR_MSG: "Vous devez avoir au moins 18 ans pour participer au concours"
  },

  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{Pd}\p{Po}\p{Zs}]+$/u,
    ERROR_MSG: "Le titre doit contenir entre 2 et 100 caractères (lettres, chiffres et ponctuation basique)"
  },

  DESCRIPTION: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 250,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u,
    ERROR_MSG: "La description ne doit pas dépasser 250 caractères"
  },

  COUNTRY_ALPHA2: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/,
    ERROR_MSG: "Code pays invalide (2 lettres majuscules, ex: FR)"
  },

  LANGUAGE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 25,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG: "La langue doit contenir entre 2 et 50 caractères"
  },

  AI_TOOLS: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
    ERROR_MSG: "Les outils IA sont requis (max 5, séparés par des virgules)"
  },

  BIO: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u,
    ERROR_MSG: "La bio ne doit pas dépasser 500 caractères"
  }
};


export const sanitizeInput = (value) => {
  if (!value) return '';

  return value
    .trim()
    .replace(/\s+/g, ' ')        
    .replace(/<[^>]*>/g, '')     
    .replace(/[<>]/g, '');       
};


export const containsEmoji = (str) => {
  const emojiPattern = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiPattern.test(str);
};


export const validateField = (fieldName, value) => {
  const cleaned = sanitizeInput(value);
  const constraint = FORM_CONSTRAINTS[fieldName];

  if (!constraint) {
    return { isValid: true, error: '', cleaned };
  }


  if (!cleaned && constraint.MIN_LENGTH > 0) {
    return {
      isValid: false,
      error: `Ce champ est requis`,
      cleaned
    };
  }

  
  if (fieldName === 'AGE') {
    if (!cleaned) {
      return {
        isValid: false,
        error: "L'âge est requis",
        cleaned
      };
    }

    if (!constraint.PATTERN.test(cleaned)) {
      return {
        isValid: false,
        error: "L'âge doit être un nombre valide",
        cleaned
      };
    }

    const ageValue = parseInt(cleaned, 10);
    if (ageValue < constraint.MIN_VALUE) {
      return {
        isValid: false,
        error: constraint.ERROR_MSG,
        cleaned
      };
    }


    return { isValid: true, error: '', cleaned };
  }


  if (constraint.MIN_LENGTH && cleaned.length < constraint.MIN_LENGTH) {
    return {
      isValid: false,
      error: constraint.ERROR_MSG,
      cleaned
    };
  }


  if (constraint.MAX_LENGTH && cleaned.length > constraint.MAX_LENGTH) {
    return {
      isValid: false,
      error: constraint.ERROR_MSG,
      cleaned
    };
  }


  if ((fieldName === 'FIRST_NAME' || fieldName === 'LAST_NAME') && containsEmoji(cleaned)) {
    return {
      isValid: false,
      error: "Les emojis ne sont pas autorisés dans ce champ",
      cleaned
    };
  }


  if (constraint.PATTERN && cleaned && !constraint.PATTERN.test(cleaned)) {
    return {
      isValid: false,
      error: constraint.ERROR_MSG,
      cleaned
    };
  }

  return { isValid: true, error: '', cleaned };
};


export const validateForm = (formData) => {
  const errors = {};
  const cleanedData = {};


  if (!formData.email || !formData.email.trim()) {
    errors.email = "L'email est requis";
  } else {
    const emailValidation = validateField('EMAIL', formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    } else {
      cleanedData.email = emailValidation.cleaned.toLowerCase();
    }
  }


  if (!formData.firstName || !formData.firstName.trim()) {
    errors.firstName = "Le prénom est requis";
  } else {
    const validation = validateField('FIRST_NAME', formData.firstName);
    if (!validation.isValid) {
      errors.firstName = validation.error;
    } else {
      cleanedData.firstName = validation.cleaned;
    }
  }


  if (!formData.lastName || !formData.lastName.trim()) {
    errors.lastName = "Le nom est requis";
  } else {
    const validation = validateField('LAST_NAME', formData.lastName);
    if (!validation.isValid) {
      errors.lastName = validation.error;
    } else {
      cleanedData.lastName = validation.cleaned;
    }
  }

  
  if (!formData.age || !formData.age.trim()) {
    errors.age = "L'âge est requis";
  } else {
    const validation = validateField('AGE', formData.age);
    if (!validation.isValid) {
      errors.age = validation.error;
    } else {
      cleanedData.age = validation.cleaned;
    }
  }


  if (!formData.title || !formData.title.trim()) {
    errors.title = "Le titre est requis";
  } else {
    const validation = validateField('TITLE', formData.title);
    if (!validation.isValid) {
      errors.title = validation.error;
    } else {
      cleanedData.title = validation.cleaned;
    }
  }


  if (formData.description && formData.description.trim()) {
    const validation = validateField('DESCRIPTION', formData.description);
    if (!validation.isValid) {
      errors.description = validation.error;
    } else {
      cleanedData.description = validation.cleaned;
    }
  } else {
    cleanedData.description = '';
  }

  
  if (!formData.countryAlpha2 || !formData.countryAlpha2.trim()) {
    errors.countryAlpha2 = "Le code du pays est requis";
  } else {
    const cleaned = formData.countryAlpha2.trim().toUpperCase();
    const validation = validateField('COUNTRY_ALPHA2', cleaned);
    if (!validation.isValid) {
      errors.countryAlpha2 = validation.error;
    } else {
      cleanedData.countryAlpha2 = cleaned;
    }
  }

  
  if (!formData.language || !formData.language.trim()) {
    errors.language = "La langue est requise";
  } else {
    const validation = validateField('LANGUAGE', formData.language);
    if (!validation.isValid) {
      errors.language = validation.error;
    } else {
      cleanedData.language = validation.cleaned;
    }
  }

  
  if (!formData.aiTools || !formData.aiTools.trim()) {
    errors.aiTools = "Les outils IA sont requis";
  } else {
    const cleaned = sanitizeInput(formData.aiTools);
    const toolsArray = cleaned.split(',').map(t => t.trim()).filter(Boolean);
    if (toolsArray.length === 0) {
      errors.aiTools = "Au moins un outil IA est requis";
    } else if (toolsArray.length > 5) {
      errors.aiTools = "Il ne peut y avoir plus de 5 outils IA au maximum";
    } else if (cleaned.length > FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH) {
      errors.aiTools = FORM_CONSTRAINTS.AI_TOOLS.ERROR_MSG;
    } else {
      cleanedData.aiTools = toolsArray.join(', ');
    }
  }

  
  if (formData.bio && formData.bio.trim()) {
    const validation = validateField('BIO', formData.bio);
    if (!validation.isValid) {
      errors.bio = validation.error;
    } else {
      cleanedData.bio = validation.cleaned;
    }
  } else {
    cleanedData.bio = '';
  }

  
  const urlPattern = /^https?:\/\/.+/;
  for (const key of ['socialWebsite', 'socialInstagram', 'socialX']) {
    if (formData[key] && formData[key].trim()) {
      if (!urlPattern.test(formData[key].trim())) {
        errors[key] = "L\'URL est invalide (elle doit commencer par https://)";
      } else {
        cleanedData[key] = formData[key].trim();
      }
    } else {
      cleanedData[key] = '';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    cleanedData
  };
};


export const countGraphemes = (str) => {
  if (!str) return 0;

 
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
    return [...segmenter.segment(str)].length;
  }

  
  return [...str].length;
};


export const exceedsMaxLength = (fieldName, value) => {
  const constraint = FORM_CONSTRAINTS[fieldName];
  if (!constraint || !constraint.MAX_LENGTH) return false;

  return value.length > constraint.MAX_LENGTH;
};
