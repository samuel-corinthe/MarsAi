import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/upload', uploadRoutes);

app.use('/', (req, res) => {
    res.send('Serveur MarsAI opérationnel ');
});


app.use((err, req, res, next) => {
    console.error('!!! ERREUR SERVEUR !!!', err.stack);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
    console.log(` Serveur backend lancé sur : http://localhost:${PORT}`);
});
