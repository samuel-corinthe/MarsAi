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
router.post('/youtube', upload.single('video'), async (req, res) => {
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
            
            if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
            
            return res.status(400).json({
                error: 'Vidéo non conforme',
                validationErrors: validation.errors,
                validationWarnings: validation.warnings,
                metadata: validation.metadata,
                requirements: {
                    duration: `${VIDEO_CONSTRAINTS.DURATION.MIN}-${VIDEO_CONSTRAINTS.DURATION.MAX}s`,
                    aspectRatio: '16:9',
                    maxFileSize: `${VIDEO_CONSTRAINTS.FILE.MAX_SIZE / (1024 * 1024)}MB`
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
export default router;