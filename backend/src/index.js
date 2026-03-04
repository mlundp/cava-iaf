import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dineroRoutes from './routes/dinero.js';
import cvrRoutes from './routes/cvr.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'https://cava-iaf.vercel.app',
    'http://localhost:5173',
  ],
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/dinero', dineroRoutes);
app.use('/api/cvr', cvrRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
