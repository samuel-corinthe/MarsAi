export const VIDEO_CONSTRAINTS = {
  DURATION: {
    MIN: 45,
    MAX: 100,
  },
  ASPECT_RATIO: {
    STANDARD: 16 / 9,
    TOLERANCE: 0.1,
  },
  FILE: {
    MAX_SIZE: 300 * 1024 * 1024,
    ALLOWED_FORMATS: ["video/mp4"],
  },
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

export const getVideoMetadata = (file, t) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
        fileSize: file.size,
        type: file.type,
      });
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(
        translate(
          t,
          "upload.validation.video_unreadable",
          "Impossible de lire le fichier video. Le format de la video doit etre valide (mp4).",
        ),
      );
    };

    video.src = URL.createObjectURL(file);
  });
};

export const validateVideoFrontend = (data, t) => {
  const errors = [];

  if (data.fileSize > VIDEO_CONSTRAINTS.FILE.MAX_SIZE) {
    errors.push(
      translate(
        t,
        "upload.validation.video_file_too_large",
        "Le fichier est trop volumineux ({{current}} MB). Maximum : {{max}} MB.",
        {
          current: (data.fileSize / (1024 * 1024)).toFixed(2),
          max: 300,
        },
      ),
    );
  }

  if (!VIDEO_CONSTRAINTS.FILE.ALLOWED_FORMATS.includes(data.type)) {
    errors.push(
      translate(
        t,
        "upload.validation.video_mp4_only",
        "Seul le format MP4 est autorise.",
      ),
    );
  }

  if (
    data.duration < VIDEO_CONSTRAINTS.DURATION.MIN ||
    data.duration > VIDEO_CONSTRAINTS.DURATION.MAX
  ) {
    errors.push(
      translate(
        t,
        "upload.validation.video_duration_range",
        "La duree ({{duration}}s) doit etre entre {{min}}s et {{max}}s.",
        {
          duration: Math.round(data.duration),
          min: VIDEO_CONSTRAINTS.DURATION.MIN,
          max: VIDEO_CONSTRAINTS.DURATION.MAX,
        },
      ),
    );
  }

  const expectedRatio = VIDEO_CONSTRAINTS.ASPECT_RATIO.STANDARD;
  const tolerance = VIDEO_CONSTRAINTS.ASPECT_RATIO.TOLERANCE;
  if (Math.abs(data.aspectRatio - expectedRatio) > tolerance) {
    errors.push(
      translate(
        t,
        "upload.validation.video_ratio_16_9",
        "Le format de la video doit etre 16:9.",
      ),
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
