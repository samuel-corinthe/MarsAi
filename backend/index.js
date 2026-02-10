import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import uploadRoutes from './routes/upload.js';
import altchaRoutes from './routes/altcha.js';



const app = express();
const PORT = process.env.PORT || 3000;


app.set('trust proxy', 1);


// En production remplacer l'origin par l'URL du site 
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


const verifyOrigin = (req, res, next) => {
    const origin = req.get('Origin') || req.get('Referer') || '';
    const allowedOrigins = ['http://localhost:5173']; // En production remplacer par l'URL du site

    const isAllowed = allowedOrigins.some(o => origin.startsWith(o));

    if (!isAllowed) {
        return res.status(403).json({ error: 'Origine non autorisée' });
    }
    next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/altcha', altchaRoutes);
app.use('/api/upload', verifyOrigin, uploadRoutes);

app.get('/', (req, res) => {
    res.send('Serveur MarsAI opérationnel');
});


app.use((err, req, res, next) => {
    console.error('[SERVEUR] Erreur:', err.message);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Le fichier est trop volumineux : max 300Mo' });
        }
        return res.status(400).json({ error: `Erreur d'upload : ${err.message}` });
    }

    if (err.message && err.message.startsWith('Type non autorisé')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
    console.log(` Serveur backend lancé sur : http://localhost:${PORT}`);
});
