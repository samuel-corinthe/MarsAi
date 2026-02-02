import express from 'express';
import multer from 'multer';
import oauth2Client from '../utils/YT-client.js';
import { google } from 'googleapis';
import fs from 'fs';
import { analyzeVideo } from '../utils/VideoAnalyser.js';
import { validateVideoData, VIDEO_CONSTRAINTS } from '../utils/VideoValidator.js';
const router = express.Router();
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: VIDEO_CONSTRAINTS.FILE.MAX_SIZE
    },
    fileFilter: (req, file, cb) => {
        const allowedMime = ['video/mp4'];

        if (!allowedMime.includes(file.mimetype)) {
            return cb(new Error(`Type non autorisé : ${file.mimetype}`));
        }
        cb(null, true);
    }
});
router.post('/youtube', (req, res) => {
    console.log(' Requête reçue sur /youtube');
    upload.single('video')(req, res, async (err) => {
        if (err) {
            console.error(' Erreur Multer:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Le fichier est trop volumineux : max 300Mo' });
                }
                return res.status(400).json({ error: `Erreur d'upload : ${err.message}` });
            }
            return res.status(400).json({ error: err.message });
        }

        const { title, description } = req.body;
        const videoFile = req.file;
        console.log(` Données reçues - Titre: ${title}`);

        if (!videoFile) {
            return res.status(400).json({ error: 'Aucun fichier vidéo reçu.' });
        }

        try {
            console.log(' Analyse de la vidéo...');
            const metadata = await analyzeVideo(videoFile.path);

            console.log('Validation des contraintes...');
            const validation = validateVideoData(metadata);

            if (!validation.isValid) {
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);


                const refusalReasons = validation.errors.map(e => e.message).join(' ; ');

                return res.status(400).json({
                    error: `Vidéo refusée : ${refusalReasons}`,
                    validationErrors: validation.errors,
                    validationWarnings: validation.warnings,
                    metadata: validation.metadata,
                    requirements: {
                        duration: `${VIDEO_CONSTRAINTS.DURATION.MIN}-${VIDEO_CONSTRAINTS.DURATION.MAX}s`,
                        aspectRatio: '16:9',
                        maxFileSize: '300MB'
                    }
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

            return res.status(200).json({
                message: 'Upload réussi !',
                videoId: response.data.id,
                videoUrl: `https://youtube.com/watch?v=${response.data.id}`,
                metadata: validation.metadata
            });

        } catch (error) {
            console.error(' Erreur:', error.message);
            return res.status(500).json({ error: 'Erreur lors du traitement' });
        } finally {
            if (videoFile && fs.existsSync(videoFile.path)) {
                fs.unlinkSync(videoFile.path);
            }
        }
    });
});
export default router;