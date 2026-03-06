export const FORM_CONSTRAINTS = {
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    ERROR_MSG: "Veuillez entrer un email valide (ex: nom@domaine.fr)",
  },

  FIRST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG:
      "Le prenom doit contenir entre 1 et 50 caracteres (lettres, tirets, apostrophes uniquement)",
  },

  LAST_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG:
      "Le nom doit contenir entre 1 et 50 caracteres (lettres, tirets, apostrophes uniquement)",
  },

  AGE: {
    MIN_VALUE: 18,
    PATTERN: /^\d+$/,
    ERROR_MSG: "Vous devez avoir au moins 18 ans pour participer au concours",
  },

  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{Pd}\p{Po}\p{Zs}]+$/u,
    ERROR_MSG:
      "Le titre doit contenir entre 2 et 100 caracteres (lettres, chiffres et ponctuation basique)",
  },

  DESCRIPTION: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 250,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u,
    ERROR_MSG: "La description ne doit pas depasser 250 caracteres",
  },

  COUNTRY_ALPHA2: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 2,
    PATTERN: /^[A-Z]{2}$/,
    ERROR_MSG: "Code pays invalide (2 lettres majuscules, ex: FR)",
  },

  LANGUAGE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 25,
    PATTERN: /^[\p{L}\p{M}\-' ]+$/u,
    ERROR_MSG: "La langue doit contenir entre 2 et 50 caracteres",
  },

  AI_TOOLS: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 255,
    ERROR_MSG: "Les outils IA sont requis (max 5, separes par des virgules)",
  },

  BIO: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
    PATTERN: /^[\p{L}\p{N}\p{M}\p{P}\p{Z}\n]*$/u,
    ERROR_MSG: "La bio ne doit pas depasser 500 caracteres",
  },
};

const FIELD_ERROR_KEYS = {
  EMAIL: "upload.validation.email_invalid",
  FIRST_NAME: "upload.validation.first_name_invalid",
  LAST_NAME: "upload.validation.last_name_invalid",
  AGE: "upload.validation.age_min",
  TITLE: "upload.validation.title_invalid",
  DESCRIPTION: "upload.validation.description_invalid",
  COUNTRY_ALPHA2: "upload.validation.country_invalid",
  LANGUAGE: "upload.validation.language_invalid",
  AI_TOOLS: "upload.validation.ai_tools_invalid",
  BIO: "upload.validation.bio_invalid",
};

const interpolate = (template = "", params = {}) =>
  String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return `{{${key}}}`;
  });

const translate = (t, key, defaultValue, params = {}) => {
  const fallback = interpolate(defaultValue, params);
  if (typeof t !== "function") return fallback;

  try {
    const translated = t(key, { defaultValue, ...params });
    if (!translated || translated === key) return fallback;
    return String(translated);
  } catch {
    return fallback;
  }
};

export const sanitizeInput = (value) => {
  if (!value) return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "");
};

export const containsEmoji = (str) => {
  const emojiPattern = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiPattern.test(str);
};

export const validateField = (fieldName, value, t) => {
  const cleaned = sanitizeInput(value);
  const constraint = FORM_CONSTRAINTS[fieldName];

  if (!constraint) {
    return { isValid: true, error: "", cleaned };
  }

  if (!cleaned && constraint.MIN_LENGTH > 0) {
    return {
      isValid: false,
      error: translate(t, "upload.validation.required", "Ce champ est requis"),
      cleaned,
    };
  }

  if (fieldName === "AGE") {
    if (!cleaned) {
      return {
        isValid: false,
        error: translate(t, "upload.validation.age_required", "L'age est requis"),
        cleaned,
      };
    }

    if (!constraint.PATTERN.test(cleaned)) {
      return {
        isValid: false,
        error: translate(
          t,
          "upload.validation.age_number",
          "L'age doit etre un nombre valide",
        ),
        cleaned,
      };
    }

    const ageValue = parseInt(cleaned, 10);
    if (ageValue < constraint.MIN_VALUE) {
      return {
        isValid: false,
        error: translate(t, FIELD_ERROR_KEYS.AGE, constraint.ERROR_MSG),
        cleaned,
      };
    }

    return { isValid: true, error: "", cleaned };
  }

  if (constraint.MIN_LENGTH && cleaned.length < constraint.MIN_LENGTH) {
    return {
      isValid: false,
      error: translate(t, FIELD_ERROR_KEYS[fieldName], constraint.ERROR_MSG),
      cleaned,
    };
  }

  if (constraint.MAX_LENGTH && cleaned.length > constraint.MAX_LENGTH) {
    return {
      isValid: false,
      error: translate(t, FIELD_ERROR_KEYS[fieldName], constraint.ERROR_MSG),
      cleaned,
    };
  }

  if (
    (fieldName === "FIRST_NAME" || fieldName === "LAST_NAME") &&
    containsEmoji(cleaned)
  ) {
    return {
      isValid: false,
      error: translate(
        t,
        "upload.validation.no_emoji",
        "Les emojis ne sont pas autorises dans ce champ",
      ),
      cleaned,
    };
  }

  if (constraint.PATTERN && cleaned && !constraint.PATTERN.test(cleaned)) {
    return {
      isValid: false,
      error: translate(t, FIELD_ERROR_KEYS[fieldName], constraint.ERROR_MSG),
      cleaned,
    };
  }

  return { isValid: true, error: "", cleaned };
};

export const validateForm = (formData, t) => {
  const errors = {};
  const cleanedData = {};

  if (!formData.email || !formData.email.trim()) {
    errors.email = translate(t, "upload.validation.email_required", "L'email est requis");
  } else {
    const emailValidation = validateField("EMAIL", formData.email, t);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    } else {
      cleanedData.email = emailValidation.cleaned.toLowerCase();
    }
  }

  if (!formData.firstName || !formData.firstName.trim()) {
    errors.firstName = translate(
      t,
      "upload.validation.first_name_required",
      "Le prenom est requis",
    );
  } else {
    const validation = validateField("FIRST_NAME", formData.firstName, t);
    if (!validation.isValid) {
      errors.firstName = validation.error;
    } else {
      cleanedData.firstName = validation.cleaned;
    }
  }

  if (!formData.lastName || !formData.lastName.trim()) {
    errors.lastName = translate(t, "upload.validation.last_name_required", "Le nom est requis");
  } else {
    const validation = validateField("LAST_NAME", formData.lastName, t);
    if (!validation.isValid) {
      errors.lastName = validation.error;
    } else {
      cleanedData.lastName = validation.cleaned;
    }
  }

  if (!formData.age || !formData.age.trim()) {
    errors.age = translate(t, "upload.validation.age_required", "L'age est requis");
  } else {
    const validation = validateField("AGE", formData.age, t);
    if (!validation.isValid) {
      errors.age = validation.error;
    } else {
      cleanedData.age = validation.cleaned;
    }
  }

  if (!formData.title || !formData.title.trim()) {
    errors.title = translate(t, "upload.validation.title_required", "Le titre est requis");
  } else {
    const validation = validateField("TITLE", formData.title, t);
    if (!validation.isValid) {
      errors.title = validation.error;
    } else {
      cleanedData.title = validation.cleaned;
    }
  }

  if (formData.description && formData.description.trim()) {
    const validation = validateField("DESCRIPTION", formData.description, t);
    if (!validation.isValid) {
      errors.description = validation.error;
    } else {
      cleanedData.description = validation.cleaned;
    }
  } else {
    cleanedData.description = "";
  }

  if (!formData.countryAlpha2 || !formData.countryAlpha2.trim()) {
    errors.countryAlpha2 = translate(
      t,
      "upload.validation.country_required",
      "Le code du pays est requis",
    );
  } else {
    const cleaned = formData.countryAlpha2.trim().toUpperCase();
    const validation = validateField("COUNTRY_ALPHA2", cleaned, t);
    if (!validation.isValid) {
      errors.countryAlpha2 = validation.error;
    } else {
      cleanedData.countryAlpha2 = cleaned;
    }
  }

  if (!formData.language || !formData.language.trim()) {
    errors.language = translate(
      t,
      "upload.validation.language_required",
      "La langue est requise",
    );
  } else {
    const validation = validateField("LANGUAGE", formData.language, t);
    if (!validation.isValid) {
      errors.language = validation.error;
    } else {
      cleanedData.language = validation.cleaned;
    }
  }

  if (!formData.aiTools || !formData.aiTools.trim()) {
    errors.aiTools = translate(
      t,
      "upload.validation.ai_tools_required",
      "Les outils IA sont requis",
    );
  } else {
    const cleaned = sanitizeInput(formData.aiTools);
    const toolsArray = cleaned
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (toolsArray.length === 0) {
      errors.aiTools = translate(
        t,
        "upload.validation.ai_tools_one_required",
        "Au moins un outil IA est requis",
      );
    } else if (toolsArray.length > 5) {
      errors.aiTools = translate(
        t,
        "upload.validation.ai_tools_max",
        "Il ne peut y avoir plus de 5 outils IA au maximum",
      );
    } else if (cleaned.length > FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH) {
      errors.aiTools = translate(
        t,
        FIELD_ERROR_KEYS.AI_TOOLS,
        FORM_CONSTRAINTS.AI_TOOLS.ERROR_MSG,
      );
    } else {
      cleanedData.aiTools = toolsArray.join(", ");
    }
  }

  if (formData.bio && formData.bio.trim()) {
    const validation = validateField("BIO", formData.bio, t);
    if (!validation.isValid) {
      errors.bio = validation.error;
    } else {
      cleanedData.bio = validation.cleaned;
    }
  } else {
    cleanedData.bio = "";
  }

  const urlPattern = /^https?:\/\/.+/;
  for (const key of ["socialWebsite", "socialInstagram", "socialFacebook", "socialX"]) {
    if (formData[key] && formData[key].trim()) {
      if (!urlPattern.test(formData[key].trim())) {
        errors[key] = translate(
          t,
          "upload.validation.url_invalid",
          "L'URL est invalide (elle doit commencer par https://)",
        );
      } else {
        cleanedData[key] = formData[key].trim();
      }
    } else {
      cleanedData[key] = "";
    }
  }

  const castMembers = Array.isArray(formData.castMembers) ? formData.castMembers : [];
  if (castMembers.length > 10) {
    errors.castMembers = translate(
      t,
      "upload.validation.cast_max",
      "Maximum 10 membres de casting.",
    );
  } else {
    const cleanedCastMembers = [];
    for (const member of castMembers) {
      const name = sanitizeInput(member?.name || "");
      const role = sanitizeInput(member?.role || "");
      const avatarUrl = sanitizeInput(member?.avatarUrl || "");

      if (!name && !role && !avatarUrl) {
        continue;
      }

      if (!name || !role) {
        errors.castMembers = translate(
          t,
          "upload.validation.cast_member_required",
          "Chaque membre du casting doit avoir un nom et un role.",
        );
        break;
      }

      if (name.length > 120 || role.length > 120) {
        errors.castMembers = translate(
          t,
          "upload.validation.cast_too_long",
          "Nom/role de casting trop long (max 120 caracteres).",
        );
        break;
      }

      if (avatarUrl && !urlPattern.test(avatarUrl)) {
        errors.castMembers = translate(
          t,
          "upload.validation.cast_avatar_invalid",
          "URL avatar invalide dans le casting (https:// obligatoire).",
        );
        break;
      }

      cleanedCastMembers.push({
        name,
        role,
        avatarUrl,
      });
    }

    cleanedData.castMembers = cleanedCastMembers;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    cleanedData,
  };
};

export const countGraphemes = (str) => {
  if (!str) return 0;

  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("fr", { granularity: "grapheme" });
    return [...segmenter.segment(str)].length;
  }

  return [...str].length;
};

export const exceedsMaxLength = (fieldName, value) => {
  const constraint = FORM_CONSTRAINTS[fieldName];
  if (!constraint || !constraint.MAX_LENGTH) return false;

  return value.length > constraint.MAX_LENGTH;
};
