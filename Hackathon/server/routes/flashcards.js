import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const ALL_CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

// GET /api/flashcards - Get all decks for authenticated user
router.get('/flashcards', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      userId,
      decks: [],
    });
  }

  try {
    const db = getDb();
    const decksColl = db.collection('flashcardDecks');

    const decks = await decksColl
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      decks,
    });
  } catch (error) {
    console.error('Error in GET /api/flashcards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/flashcards - Create or update a flashcard deck
router.post('/flashcards', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const { id, title, subjectCode, subjectName, topicId, topicName, cards } = req.body;

  if (!id || !title || !cards || !Array.isArray(cards)) {
    return res.status(400).json({ success: false, error: 'Missing required deck fields (id, title, cards).' });
  }

  if (!isDbConnected()) {
    return res.json({
      success: false,
      source: 'fallback',
      message: 'MongoDB is disconnected.',
    });
  }

  try {
    const db = getDb();
    const decksColl = db.collection('flashcardDecks');

    const now = Date.now();
    const deckDoc = {
      id,
      userId,
      title,
      subjectCode: subjectCode || 'N/A',
      subjectName: subjectName || 'N/A',
      topicId: topicId || 'N/A',
      topicName: topicName || 'N/A',
      cards,
      lastStudiedAt: req.body.lastStudiedAt || now,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };

    const result = await decksColl.updateOne(
      { userId, id },
      { $set: deckDoc },
      { upsert: true }
    );

    res.json({
      success: true,
      source: 'mongodb',
      deck: deckDoc,
    });
  } catch (error) {
    console.error('Error in POST /api/flashcards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/flashcards/:deckId - Delete a flashcard deck
router.delete('/flashcards/:deckId', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId || req.body.userId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const deckId = req.params.deckId;

  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error: 'Database is not connected.',
    });
  }

  try {
    const db = getDb();
    const decksColl = db.collection('flashcardDecks');

    const result = await decksColl.deleteOne({ userId, id: deckId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Deck not found.' });
    }

    res.json({
      success: true,
      message: 'Flashcard deck deleted.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/flashcards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/flashcards/generate - AI generate cards for a subject/topic
router.post('/flashcards/generate', optionalAuth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  req.socket.setTimeout(180 * 1000);

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Server Gemini API key is not configured.',
    });
  }

  const { subjectName, topicName, subtopics } = req.body;

  if (!subjectName || !topicName) {
    return res.status(400).json({
      success: false,
      error: 'subjectName and topicName are required to generate flashcards.',
    });
  }

  const systemInstruction = `You are StudyFlow AI, an expert B.Tech CSE engineering tutor.
Create a set of 6 high-density active recall flashcards (Question & Answer pairs) based on:
Subject: "${subjectName}"
Topic: "${topicName}"
${subtopics ? `Additional Context/Subtopics: "${subtopics}"` : ''}

Guidelines:
1. Make questions precise, testing core understanding, formulas, structures, or definitions.
2. Answers must be direct, clear, and comprehensive (1-3 sentences).
3. Always include a brief "explanation" field (1 sentence) providing a tip, real-world context, or helper analogy.
4. Output STRICTLY as a raw JSON array of objects. Do not include any markdown format blocks (such as \`\`\`json).
Each object must have exactly these keys: "question", "answer", "explanation".`;

  const userPrompt = `Generate a JSON array of 6 flashcard objects for:
Subject: ${subjectName}
Topic: ${topicName}`;

  const aiClient = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const modelName of ALL_CANDIDATE_MODELS) {
    try {
      console.log(`[AI Flashcard Gen] Trying model: ${modelName}`);

      const response = await aiClient.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction,
        },
      });

      if (response && response.text) {
        let rawText = response.text.trim();
        // Strip markdown backticks if returned despite instructions
        if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        
        try {
          const cards = JSON.parse(rawText);
          if (Array.isArray(cards)) {
            return res.json({
              success: true,
              model: modelName,
              cards,
            });
          }
        } catch (parseErr) {
          console.warn('[AI Flashcard Gen] Failed to parse generated JSON text:', parseErr);
        }
      }
    } catch (err) {
      lastError = err;
      console.warn(`[AI Flashcard Gen] Model ${modelName} failed:`, err.message || err);
    }
  }

  res.status(503).json({
    success: false,
    error: 'AI service failed to generate flashcards. Please try again.',
  });
});

export default router;
