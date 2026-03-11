import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env first so db.js can read it
dotenv.config();

// DB: wait-for-ready helper
import { waitForDB } from './db/db.js';

// Routes
import userRoutes from './routes/user.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import channelsRoutes from './routes/channels.routes.js';
import videoRoutes from './routes/video.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check (used by Docker / load-balancers) ───────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Root ─────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.send('YouTube Backend – running'));

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/user', userRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/videos', videoRoutes);

// ─── Global error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ─── Start ────────────────────────────────────────────────────────────────
async function start() {
  // Block until Postgres is ready (retries with back-off)
  await waitForDB(10, 2000);

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

start();
