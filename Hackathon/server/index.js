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
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? [process.env.FRONTEND_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(
  cors({
    origin: allowedOrigins,
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

    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
