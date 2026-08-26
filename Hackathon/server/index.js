import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import curriculumRouter from './routes/curriculum.js';
import progressRouter from './routes/progress.js';
import sessionsRouter from './routes/sessions.js';
import moodsRouter from './routes/moods.js';
import focusAreasRouter from './routes/focusAreas.js';
import quizzesRouter from './routes/quizzes.js';
import chatRouter from './routes/chat.js';
import aiRouter from './routes/ai.js';
import notesRouter from './routes/notes.js';
import flashcardsRouter from './routes/flashcards.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for local development asset loading
    crossOriginEmbedderPolicy: false,
  })
);

// Cookie Parser for HTTP-only Auth Cookies
app.use(cookieParser());

// Rate Limiting for Auth Endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 auth requests per window for dev/QA
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Dynamic CORS configuration supporting environment variable FRONTEND_ORIGIN
// Flutter web runs on random localhost ports (e.g. 58272, 60939), so we allow
// all localhost/127.0.0.1 origins in development. In production set FRONTEND_ORIGIN.
const allowedOriginFn = (origin, callback) => {
  if (!origin) {
    // Allow non-browser requests (native Android app, curl, Postman)
    return callback(null, true);
  }
  const isLocalhost =
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://10.0.2.2:');    // Android emulator
  const isEnvOrigin = process.env.FRONTEND_ORIGIN && origin === process.env.FRONTEND_ORIGIN;
  if (isLocalhost || isEnvOrigin) {
    return callback(null, true);
  }
  return callback(new Error(`CORS: origin ${origin} not allowed`));
};

app.use(
  cors({
    origin: allowedOriginFn,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', curriculumRouter);
app.use('/api', progressRouter);
app.use('/api', sessionsRouter);
app.use('/api', moodsRouter);
app.use('/api', focusAreasRouter);
app.use('/api', quizzesRouter);
app.use('/api', chatRouter);
app.use('/api', aiRouter);
app.use('/api', notesRouter);
app.use('/api', flashcardsRouter);

// Start Server & Connect Database
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running on port ${PORT} (all interfaces — LAN accessible in dev)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
