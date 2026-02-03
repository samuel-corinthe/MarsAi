import express from 'express';
import multer from 'multer';
import oauth2Client from '../utils/YT-client.js';
import { google } from 'googleapis';
import fs from 'fs';
import { analyzeVideo } from '../utils/VideoAnalyser.js';
import { validateVideoData, VIDEO_CONSTRAINTS } from '../utils/VideoValidator.js';
import validator from 'validator';

const router = express.Router();

const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 300 * 1024 * 1024 
    },
    fileFilter: (req, file, cb) => {
        console.log(' [MULTER] Filtrage fichier:', file.mimetype);
        const allowedMime = ['video/mp4'];
        if (!allowedMime.includes(file.mimetype)) {
            return cb(new Error(`Type non autorisé : ${file.mimetype}`));
        }
        cb(null, true);
    }
});

const validateSubmission = (req, res, next) => {
    console.log(' [MW] validateSubmission - Body:', req.body);
    let email = req.body?.email;

    if (!email) {
        return res.status(400).json({ error: 'Email requis' });
    }

    email = email.toLowerCase().trim();
    req.body.email = email;

    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Format email invalide' });
    }

    next();
};

router.post('/youtube',
    upload.single('video'),
    validateSubmission,
    async (req, res) => {
        console.log('--- Nouvelle Requête /youtube ---');
        console.log('Body:', req.body);
        console.log('File:', req.file ? req.file.path : 'Aucun fichier');

        const { title, description } = req.body;
        const videoFile = req.file;

        if (!videoFile) {
            return res.status(400).json({ error: 'Aucun fichier vidéo reçu.' });
        }

        try {
            console.log(' Analyse de la vidéo...');
            const metadata = await analyzeVideo(videoFile.path);

            console.log('Validation des contraintes...');
            const validation = validateVideoData(metadata);

            if (!validation.isValid) {
                console.log(' Vidéo non conforme:', validation.errors);
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);

                const refusalReasons = validation.errors.map(e => e.message).join(' ; ');

                return res.status(400).json({
                    error: `Vidéo refusée : ${refusalReasons}`,
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings,
                    metadata: validation.metadata,
                });
            }

            console.log(' Upload vers YouTube...');
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

            console.log(' Upload réussi ! ID:', response.data.id);
            return res.status(200).json({
                message: 'Upload réussi !',
                videoId: response.data.id,
                videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
            });

        } catch (error) {
            console.error(' [CRASH /youtube]:', error);
            if (!res.headersSent) {
                return res.status(500).json({ error: `Erreur interne: ${error.message}` });
            }
        } finally {
            if (req.file && fs.existsSync(req.file.path)) {
                console.log(' Nettoyage:', req.file.path);
                fs.unlinkSync(req.file.path);
            }
        }
    }
);

export default router;