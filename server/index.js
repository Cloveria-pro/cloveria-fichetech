import './env.js';

import express from 'express';
import cors from 'cors';
import recettesRouter from './routes/recettes.js';
import ingredientsRouter from './routes/ingredients.js';
import cartesRouter from './routes/cartes.js';
import parametresRouter from './routes/parametres.js';
import iaRouter from './routes/ia.js';
import authRouter from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Protected routes
app.use('/api', authMiddleware);
app.use('/api/recettes', recettesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/cartes', cartesRouter);
app.use('/api/parametres', parametresRouter);
app.use('/api/ia', iaRouter);

app.listen(PORT, () => {
  console.log(`Serveur demarre sur le port ${PORT}`);
});
