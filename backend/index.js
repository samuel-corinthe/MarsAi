import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import uploadRoutes from './routes/upload.js';
import altchaRoutes from './routes/altcha.js';


console.log('[DEBUG] altchaRoutes:', typeof altchaRoutes, altchaRoutes);

const app = express();
const PORT = process.env.PORT || 3000;


app.set('trust proxy', 1);


app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


console.log('[DEBUG] Enregistrement des routes...');
app.use('/api/altcha', altchaRoutes);
console.log('[DEBUG] Route /api/altcha enregistrée');
app.use('/api/upload', uploadRoutes);
console.log('[DEBUG] Route /api/upload enregistrée');

app.get('/', (req, res) => {
    console.log('[DEBUG] Route racine appelée');
    res.send('Serveur MarsAI opérationnel ');
});


app.use((err, req, res, next) => {
    console.error('!!! ERREUR SERVEUR !!!', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Le fichier est trop volumineux : max 300Mo' });
        }
        return res.status(400).json({ error: `Erreur d'upload : ${err.message}` });
    }

    if (err.message && err.message.startsWith('Type non autorisé')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
});

app.listen(PORT, () => {
    console.log(` Serveur backend lancé sur : http://localhost:${PORT}`);
});
