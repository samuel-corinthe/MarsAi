

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
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{Pd}\p{Po}\p{Zs}]+$/u,
    ERROR_MSG: "Le titre doit contenir entre 2 et 100 caractères (lettres, chiffres et ponctuation basique)"
  },

  DESCRIPTION: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 250,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u,
    ERROR_MSG: "La description ne doit pas dépasser 250 caractères"
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

    if (ageValue > constraint.MAX_VALUE) {
      return {
        isValid: false,
        error: "Veuillez entrer un âge valide",
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
