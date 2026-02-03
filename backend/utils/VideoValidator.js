import { analyzeVideo } from './VideoAnalyser.js';

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
        ALLOWED_FORMATS: ['mp4'],
        ALLOWED_CODECS: ['h264', 'vp9', 'av1']
    }
};
export function validateVideoData(data) {
    const errors = [];
    const warnings = [];

    if (!data) {
        return {
            isValid: false,
            errors: [{ field: 'all', message: 'Aucune donnée vidéo à valider' }],
            warnings: [],
            metadata: {}
        };
    }

    if (!data.duration || data.duration < VIDEO_CONSTRAINTS.DURATION.MIN) {
        errors.push({
            field: 'duration',
            message: `La vidéo est trop courte : ${(data.duration || 0).toFixed(1)}s (min ${VIDEO_CONSTRAINTS.DURATION.MIN}s)`,
            value: data.duration,
            required: VIDEO_CONSTRAINTS.DURATION.MIN
        });
    } else if (data.duration > VIDEO_CONSTRAINTS.DURATION.MAX) {
        errors.push({
            field: 'duration',
            message: `La vidéo est trop longue : ${(data.duration || 0).toFixed(1)}s (max ${VIDEO_CONSTRAINTS.DURATION.MAX}s)`,
            value: data.duration,
            required: VIDEO_CONSTRAINTS.DURATION.MAX
        });
    }

    const expectedRatio = VIDEO_CONSTRAINTS.ASPECT_RATIO.STANDARD;
    const tolerance = VIDEO_CONSTRAINTS.ASPECT_RATIO.TOLERANCE;
    if (!data.aspectRatio || Math.abs(data.aspectRatio - expectedRatio) > tolerance) {
        errors.push({
            field: 'aspectRatio',
            message: `Le ratio de la vidéo est incorrect : ${(data.aspectRatio || 0).toFixed(2)} (attendu 16:9)`,
            value: data.aspectRatio ? data.aspectRatio.toFixed(2) : '0',
            required: expectedRatio.toFixed(2),
            dimensions: `${data.width || 0}x${data.height || 0}`
        });
    }

    if (data.fileSize > VIDEO_CONSTRAINTS.FILE.MAX_SIZE) {
        errors.push({
            field: 'fileSize',
            message: `Le fichier est trop volumineux : ${(data.fileSize / (1024 * 1024)).toFixed(2)}MB (max ${VIDEO_CONSTRAINTS.FILE.MAX_SIZE / (1024 * 1024)}MB)`,
            value: data.fileSize,
            required: VIDEO_CONSTRAINTS.FILE.MAX_SIZE
        });
    }

    if (data.codec && !VIDEO_CONSTRAINTS.FILE.ALLOWED_CODECS.includes(data.codec)) {
        warnings.push({
            field: 'codec',
            message: `Codec ${data.codec} non optimal (recommandé : ${VIDEO_CONSTRAINTS.FILE.ALLOWED_CODECS.join(', ')})`,
            severity: 'warning',
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
            duration: `${(data.duration || 0).toFixed(1)}s`,
            dimensions: `${data.width || 0}x${data.height || 0}`,
            aspectRatio: (data.aspectRatio || 0).toFixed(2),
            codec: data.codec || 'inconnu',
            fileSize: `${((data.fileSize || 0) / (1024 * 1024)).toFixed(2)}MB`,
            hasAudio: data.hasAudio || false
        }
    };
}
