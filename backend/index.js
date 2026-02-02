import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3000;


// Configuration de CORS pour autoriser le frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5175']
}));


app.use(express.json());


app.use('/api/upload', uploadRoutes);


app.use('/', (req, res) => {
    res.send('Serveur MarsAI opérationnel 🚀');
});

app.listen(PORT, () => {
    console.log(` Serveur backend lancé sur : http://localhost:${PORT}`);
});
