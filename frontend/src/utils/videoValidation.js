export const VIDEO_CONSTRAINTS = {
    DURATION: {
        MIN: 45,
        MAX: 100
    },
    ASPECT_RATIO: {
        STANDARD: 16 / 9,
        TOLERANCE: 0.1
    },
    FILE: {
        MAX_SIZE: 300 * 1024 * 1024,
        ALLOWED_FORMATS: ['video/mp4']
    }
};

export const getVideoMetadata = (file) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: video.videoWidth / video.videoHeight,
                fileSize: file.size,
                type: file.type
            });
        };

        video.onerror = () => {
            window.URL.revokeObjectURL(video.src);
            reject("Impossible de lire le fichier vidéo. Assurez-vous qu'il s'agit d'un format valide.");
        };

        video.src = URL.createObjectURL(file);
    });
};

export const validateVideoFrontend = (data) => {
    const errors = [];

    if (data.fileSize > VIDEO_CONSTRAINTS.FILE.MAX_SIZE) {
        errors.push(`Le fichier est trop volumineux (${(data.fileSize / (1024 * 1024)).toFixed(2)} MB). Maximum : 300 MB.`);
    }

    if (!VIDEO_CONSTRAINTS.FILE.ALLOWED_FORMATS.includes(data.type)) {
        errors.push("Seul le format MP4 est autorisé.");
    }

    if (data.duration < VIDEO_CONSTRAINTS.DURATION.MIN || data.duration > VIDEO_CONSTRAINTS.DURATION.MAX) {
        errors.push(`La durée (${Math.round(data.duration)}s) doit être entre ${VIDEO_CONSTRAINTS.DURATION.MIN}s et ${VIDEO_CONSTRAINTS.DURATION.MAX}s.`);
    }

    const expectedRatio = VIDEO_CONSTRAINTS.ASPECT_RATIO.STANDARD;
    const tolerance = VIDEO_CONSTRAINTS.ASPECT_RATIO.TOLERANCE;
    if (Math.abs(data.aspectRatio - expectedRatio) > tolerance) {
        errors.push("Le format de la vidéo doit être 16:9 .");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};







