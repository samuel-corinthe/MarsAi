import express from 'express';
import multer from 'multer';
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

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 300 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        console.log('[MULTER] Filtrage fichier:', file.mimetype);
        const allowedMime = ['video/mp4'];
        if (!allowedMime.includes(file.mimetype)) {
            return cb(new Error(`Type non autorisé : ${file.mimetype}`));
        }
        cb(null, true);
    }
});

router.post('/youtube',
    upload.single('video'),
    validateHoneypot,
    validateFileMagicBytes,
    validateAltchaMiddleware,
    validateFormData,
    validateEmail, 
    ipLimiter,
    emailLimiter,
    async (req, res) => {
        console.log('[UPLOAD] Nouvelle soumission reçue');

        const { title, description } = req.body;
        const videoFile = req.file;

        if (!videoFile) {
            return res.status(400).json({ error: 'Aucun fichier vidéo reçu.' });
        }

        try {
            console.log('[UPLOAD] Analyse de la vidéo...');
            const metadata = await analyzeVideo(videoFile.path);

            console.log('[UPLOAD] Validation des contraintes...');
            const validation = validateVideoData(metadata);

            if (!validation.isValid) {
                console.log('[UPLOAD] Vidéo non conforme:', validation.errors.map(e => e.field));
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);

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

            console.log('[UPLOAD] Upload réussi, ID:', response.data.id);
            return res.status(200).json({
                message: 'Upload réussi !',
                videoId: response.data.id,
                videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
            });

        } catch (error) {
            console.error('[UPLOAD] Erreur:', error.message);
            if (!res.headersSent) {
               return res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        } finally {
            if (req.file && fs.existsSync(req.file.path)) {
                console.log('[UPLOAD] Nettoyage fichier temporaire');
                fs.unlinkSync(req.file.path);
            }
        }
    }
);

export default router;