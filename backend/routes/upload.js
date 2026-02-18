import express from 'express';
import multer from 'multer';
import path from 'path';
import oauth2Client from '../utils/YT-client.js';
import { google } from 'googleapis';
import fs from 'fs';
import { analyzeVideo } from '../utils/VideoAnalyser.js';
import { validateVideoData, VIDEO_CONSTRAINTS } from '../utils/VideoValidator.js';
import { validateFormData } from '../utils/FormValidator.js';
import { validateAltchaMiddleware } from '../utils/AltchaValidator.js';
import { validateEmail } from '../utils/EmailValidator.js';
import { validateFileMagicBytes } from '../utils/FileTypeValidator.js';
import { validateHoneypot } from '../utils/HoneypotValidator.js';
import { cleanMetadataMiddleware } from '../utils/MetadataCleaner.js';
import connection from '../utils/db.js';



import rateLimit from 'express-rate-limit';

const router = express.Router();

const ipLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 10,
    validate: false,
    handler: (req, res, next, options) => {
        console.warn('[LIMITER] Limite IP atteinte');
        res.status(options.statusCode).json(options.message);
    },
    message: { error: 'Trop de soumissions depuis cette connexion. Réessayez demain.' },
    standardHeaders: true,
    legacyHeaders: false,
});


const emailLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    validate: false,
    keyGenerator: (req) => {
        return req.body?.email || req.ip || 'unknown';
    },
    message: { error: 'Cet email a déjà soumis 3 vidéos aujourd\'hui.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const activeUploads = new Set();

const concurrentLimiter = (req, res, next) => {
    const ip = req.ip;

    if (activeUploads.has(ip)) {
        console.warn('[CONCURRENT] Upload déjà en cours pour', ip);
        return res.status(429).json({ error: 'Un upload est  en cours. Veuillez patienter.' });
    }

    activeUploads.add(ip);
    res.on('close', () => activeUploads.delete(ip));
    next();
};

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 300 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        console.log('[MULTER] Filtrage fichier:', file.fieldname, file.mimetype);
        if (file.fieldname === 'video') {
            if (file.mimetype !== 'video/mp4') {
                return cb(new Error(`Ce type de vidéo n\'est pas autorisé : ${file.mimetype}`));
            }
        } else if (file.fieldname === 'poster') {
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedImageTypes.includes(file.mimetype)) {
                return cb(new Error(`Type d'image non autorisé : ${file.mimetype}`));
            }
        } else if (file.fieldname === 'subtitle') {
            const ext = path.extname(file.originalname).toLowerCase();
            if (ext !== '.srt') {
                return cb(new Error('Seul le format .srt est accepté pour les sous-titres'));
            }
            if (file.mimetype !== 'text/plain' && file.mimetype !== 'application/x-subrip') {
                return cb(new Error(`Type sous-titre non autorisé : ${file.mimetype}`));
            }
        } else {
            return cb(new Error(` le champ fichier est  inconnu : ${file.fieldname}`));
        }
        cb(null, true);
    }
});

const validateSrtContent = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.length > 1024 * 1024) {
        return { valid: false, error: 'Le Fichier SRT  est trop volumineux (max 1 Mo)' };
    }
    
    const srtPattern = /\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
    if (!srtPattern.test(content)) {
        return { valid: false, error: 'Le fichier ne semble pas être un SRT valide' };
    }
    
    const dangerousPatterns = /<script/i;
    if (dangerousPatterns.test(content)) {
        return { valid: false, error: ' Le contenu du fichier SRT n\'est pas autorisé' };
    }
    return { valid: true };
};

router.post('/youtube',
    ipLimiter,
    concurrentLimiter,
    upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'subtitle', maxCount: 1 },
        { name: 'poster', maxCount: 1 }
    ]),
    validateHoneypot,
    validateFileMagicBytes,
    validateAltchaMiddleware,
    validateFormData,
    validateEmail,
    emailLimiter,
    cleanMetadataMiddleware,
    async (req, res) => {
        console.log('[UPLOAD] Nouvelle soumission reçue');

        const { title, description } = req.body;
        const videoFile = req.files?.video?.[0];
        const subtitleFile = req.files?.subtitle?.[0];
        const posterFile = req.files?.poster?.[0];

        if (!videoFile) {
            return res.status(400).json({ error: 'Aucun fichier vidéo reçu.' });
        }

        
        if (subtitleFile) {
            const srtValidation = validateSrtContent(subtitleFile.path);
            if (!srtValidation.valid) {
                console.log('[UPLOAD] SRT invalide:', srtValidation.error);
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                if (fs.existsSync(subtitleFile.path)) fs.unlinkSync(subtitleFile.path);
                return res.status(400).json({ error: srtValidation.error });
            }
        }

        try {
            console.log('[UPLOAD] Analyse de la vidéo...');
            const metadata = await analyzeVideo(videoFile.path);

            console.log('[UPLOAD] Validation des contraintes...');
            const validation = validateVideoData(metadata);

            if (!validation.isValid) {
                console.log('[UPLOAD] Vidéo non conforme:', validation.errors.map(e => e.field));
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                if (subtitleFile && fs.existsSync(subtitleFile.path)) fs.unlinkSync(subtitleFile.path);

                const refusalReasons = validation.errors.map(e => e.message).join(' ; ');

                return res.status(400).json({
                    error: `Vidéo refusée : ${refusalReasons}`,
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings,
                    metadata: validation.metadata,
                });
            }

            console.log('[UPLOAD] Upload vers YouTube...');
            const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

            const response = await youtube.videos.insert({
                part: 'snippet,status',
                requestBody: {
                    snippet: {
                        title: title || 'Upload MarsAI',
                        description: description || 'Vidéo uploadée via MarsAI',
                    },
                    status: {
                        privacyStatus: 'private',
                    },
                },
                media: {
                    body: fs.createReadStream(videoFile.path),
                },
            });

            console.log('[UPLOAD] Upload YouTube réussi, ID:', response.data.id);

            
            const youtubeUrl = `https://www.youtube.com/watch?v=${response.data.id}`;
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            let posterUrl;
            if (posterFile) {
                const ext = path.extname(posterFile.originalname).toLowerCase() || '.jpg';
                const posterFileName = `${slug}-${response.data.id}${ext}`;
                const postersDir = 'uploads/posters';
                if (!fs.existsSync(postersDir)) {
                    fs.mkdirSync(postersDir, { recursive: true });
                }
                const posterDest = path.join(postersDir, posterFileName);
                fs.renameSync(posterFile.path, posterDest);
                const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
                posterUrl = `${backendBase}/uploads/posters/${posterFileName}`;
                console.log('[UPLOAD] Poster stocké:', posterDest);
            } else {
                posterUrl = `https://picsum.photos/seed/${slug}-${response.data.id}/600/900`;
            }
            const submittedBy = `${req.body.firstName} ${req.body.lastName}`;
            const duration = Math.round(metadata.duration);

          
            const [countryRows] = await connection.promise().query(
                'SELECT id FROM countries WHERE alpha2 = ?',
                [req.body.countryAlpha2]
            );

            if (countryRows.length === 0) {
                console.log('[UPLOAD] le code pays  est introuvable:', req.body.countryAlpha2);
                return res.status(400).json({ error: ' le code pays est  introuvable dans la base de données' });
            }

            const countryId = countryRows[0].id;

            const [insertResult] = await connection.promise().query(
                `INSERT INTO movies
                (title, age, bio, social_links, synopsis, duration, release_year, country_id, language, subtitle_language, ai_tools, poster_url, video_url, youtube_url, view_count, submitted_by, submission_status)
                VALUES (?, ?, ?, ?, ?, ?, 2026, ?, ?, NULL, ?, ?, ?, ?, 0, ?, 'en cours')`,
                [
                    title,
                    parseInt(req.body.age, 10),
                    req.body.bio,
                    req.body.socialLinks,
                    description || '',
                    duration,
                    countryId,
                    req.body.language,
                    req.body.aiTools,
                    posterUrl,
                    youtubeUrl,
                    youtubeUrl,
                    submittedBy
                ]
            );

            const movieId = insertResult.insertId;
            console.log('[UPLOAD] Film inséré dans MariaDB, ID:', movieId);

            
            if (subtitleFile) {
                const subtitlesDir = 'uploads/subtitles';
                if (!fs.existsSync(subtitlesDir)) {
                    fs.mkdirSync(subtitlesDir, { recursive: true });
                }
                const srtDest = path.join(subtitlesDir, `${movieId}.srt`);
                fs.renameSync(subtitleFile.path, srtDest);
                console.log('[UPLOAD] SRT stocké:', srtDest);
            }

            return res.status(200).json({
                message: 'Upload réussi !',
                videoId: response.data.id,
                movieId: movieId,
                videoUrl: youtubeUrl,
            });

        } catch (error) {
            console.error('[UPLOAD] Erreur:', error.message);
            if (!res.headersSent) {
               return res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        } finally {
            if (videoFile && fs.existsSync(videoFile.path)) {
                console.log('[UPLOAD] Nettoyage fichier vidéo temporaire');
                fs.unlinkSync(videoFile.path);
            }
            if (subtitleFile && fs.existsSync(subtitleFile.path)) {
                console.log('[UPLOAD] Nettoyage fichier SRT temporaire');
                fs.unlinkSync(subtitleFile.path);
            }
            if (posterFile && fs.existsSync(posterFile.path)) {
                console.log('[UPLOAD] Nettoyage fichier poster temporaire');
                fs.unlinkSync(posterFile.path);
            }
        }
    }
);

export default router;

