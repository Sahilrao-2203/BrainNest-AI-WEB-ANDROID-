import { Router } from 'express';
import { connectDB } from '../db.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const db = await connectDB();

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'StudyFlow API is running',
        database: 'disconnected',
      });
    }

    await db.command({ ping: 1 });

    return res.json({
      success: true,
      message: 'StudyFlow API is running',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check database ping failed:', error.message);

    return res.status(503).json({
      success: false,
      message: 'StudyFlow API is running',
      database: 'disconnected',
    });
  }
});

export default router;