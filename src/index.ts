import 'dotenv/config';
import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { configureCloudinary } from './config/upload';
import { errorHandler } from './middleware/error';
import { startBehaviouralScoreWorker, setupDailyScoreRefreshSchedule } from './jobs/behavioural-score.job';
import routes from './routes';

const app: Express = express();
const RELEASE_MARKER = '2026-05-08-live-wallet-risk';
const configuredOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (env.CORS_ORIGIN === '*') return true;
  if (configuredOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/i.test(origin)) return true;
  return false;
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  }),
);

// Logging & body parsing
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure external services
configureCloudinary();

// Serve locally uploaded KYC files (fallback when Cloudinary is not configured)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'chainguard-api',
    release: RELEASE_MARKER,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`ChainGuard API running on port ${PORT} [${env.NODE_ENV}]`);

  // Start background worker
  if (env.REDIS_URL) {
    try {
      startBehaviouralScoreWorker();
      setupDailyScoreRefreshSchedule().catch(console.error);
      console.log('BullMQ worker started');
    } catch (err) {
      console.warn('Redis not available — background jobs disabled:', err);
    }
  }
});

export default app;
