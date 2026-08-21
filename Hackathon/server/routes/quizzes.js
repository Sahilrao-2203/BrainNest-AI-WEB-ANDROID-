import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// POST save quiz attempt
router.post('/quiz-attempts', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const {
    subjectCode = 'ES-CS201',
    topicId = 'cs-u1-1',
    topic = 'General Programming',
    questions = [],
    answers = [],
    score = 0,
    correctAnswers = 0,
    incorrectAnswers = 0,
    totalQuestions = 10,
    percentage = 0,
    startedAt = Date.now(),
    completedAt = Date.now(),
  } = req.body;

  if (!isDbConnected()) {
    return res.json({
      success: false,
      source: 'fallback',
      message: 'MongoDB is disconnected.',
    });
  }

  try {
    const db = getDb();
    const quizColl = db.collection('quizAttempts');

    const now = Date.now();
    const attemptDoc = {
      userId,
      subjectCode,
      topicId,
      topic,
      questions,
      answers,
      score,
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      percentage,
      startedAt,
      completedAt,
      createdAt: now,
    };

    const result = await quizColl.insertOne(attemptDoc);

    res.json({
      success: true,
      source: 'mongodb',
      attemptId: result.insertedId,
      attempt: attemptDoc,
    });
  } catch (error) {
    console.error('Error in POST /api/quiz-attempts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET quiz attempt history for userId
router.get('/quiz-attempts', optionalAuth, async (req, res) => {
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
      attempts: [],
    });
  }

  try {
    const db = getDb();
    const quizColl = db.collection('quizAttempts');

    const attempts = await quizColl
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      attempts,
    });
  } catch (error) {
    console.error('Error in GET /api/quiz-attempts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET aggregated quiz statistics per topic for userId
router.get('/quiz-stats', optionalAuth, async (req, res) => {
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
      topicScores: {},
    });
  }

  try {
    const db = getDb();
    const quizColl = db.collection('quizAttempts');

    const attempts = await quizColl.find({ userId }).toArray();
    const topicScores = {};

    attempts.forEach((att) => {
      if (att.topicId) {
        // Keep the latest quiz percentage for each topicId
        topicScores[att.topicId] = att.percentage;
      }
    });

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      topicScores,
    });
  } catch (error) {
    console.error('Error in GET /api/quiz-stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
