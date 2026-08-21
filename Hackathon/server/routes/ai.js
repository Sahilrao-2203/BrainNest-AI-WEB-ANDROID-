import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

const ALL_CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

// POST /api/ai/chat - Server-side Gemini proxy to keep GEMINI_API_KEY secure
router.post('/ai/chat', optionalAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Configure socket timeout for long-running AI requests (3 minutes)
  req.socket.setTimeout(180 * 1000);

  console.log('[Server AI Route] AI request started');

  if (!apiKey) {
    console.error('Server Gemini API key is not configured.');
    console.log('[Server AI Route] AI request completed with failure (missing API key)');
    return res.status(500).json({
      success: false,
      error: 'Server Gemini API key is not configured.',
    });
  }

  const { contents, systemInstruction } = req.body;

  if (!contents || !Array.isArray(contents)) {
    console.warn('Invalid request body: contents array is missing or invalid.');
    console.log('[Server AI Route] AI request completed with failure (invalid body)');
    return res.status(400).json({
      success: false,
      error: 'Invalid request body. "contents" array is required.',
    });
  }

  const now = new Date();
  const currentDateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const currentTimeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);

  const serverDateContext = `CURRENT RUNTIME DATE & TIME CONTEXT (Asia/Kolkata - India Standard Time):
- Today's Date: ${currentDateStr}
- Current Time: ${currentTimeStr}
- Timezone: Asia/Kolkata (IST)`;

  const finalSystemInstruction = systemInstruction && systemInstruction.includes('Asia/Kolkata')
    ? systemInstruction
    : `${serverDateContext}\n\n${systemInstruction || ''}`;

  const startTime = Date.now();
  console.log('[Server AI Route] Gemini started');

  const aiClient = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const modelName of ALL_CANDIDATE_MODELS) {
    try {
      console.log(`[Server AI Proxy] Trying model: ${modelName}`);

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: finalSystemInstruction,
        },
      });

      if (response && response.text) {
        const duration = ((Date.now() - startTime) / 1000.0).toFixed(2);
        console.log(`[Server AI Route] Gemini completed in ${duration}s`);
        console.log('[Server AI Route] AI request completed successfully');
        return res.json({
          success: true,
          model: modelName,
          text: response.text,
        });
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Server AI Proxy] Model ${modelName} failed:`, err.message || err);
    }
  }

  const duration = ((Date.now() - startTime) / 1000.0).toFixed(2);
  console.log(`[Server AI Route] Gemini failed after ${duration}s: ${lastError ? lastError.message || lastError : 'Unknown error'}`);
  console.log('[Server AI Route] AI request completed with failure');

  res.status(503).json({
    success: false,
    error: 'AI service temporarily unavailable. Please try again in a moment.',
  });
});

export default router;
