import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

export function getTodayLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET today's mood record for userId (supports /mood and /moods)
router.get(['/mood', '/moods'], optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const targetDate = req.query.date || getTodayLocalDateString();

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      userId,
      date: targetDate,
      moodRecord: null,
    });
  }

  try {
    const db = getDb();
    const moodsColl = db.collection('moods');

    const record = await moodsColl.findOne({ userId, date: targetDate }, { projection: { _id: 0 } });

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      date: targetDate,
      moodRecord: record || null,
    });
  } catch (error) {
    console.error('Error in GET /api/mood:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST save / upsert today's mood record for userId (supports /mood and /moods)
router.post(['/mood', '/moods'], optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const {
    mood,
    selectedSubjectCode,
    date = getTodayLocalDateString(),
    dailyTasks,
  } = req.body;

  if (!mood && !dailyTasks) {
    return res.status(400).json({ success: false, error: 'mood or dailyTasks is required' });
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
    const moodsColl = db.collection('moods');

    const now = Date.now();
    const updateDoc = {
      updatedAt: now,
    };

    if (mood) updateDoc.mood = mood;
    if (selectedSubjectCode) updateDoc.selectedSubjectCode = selectedSubjectCode;
    if (dailyTasks) updateDoc.dailyTasks = dailyTasks;

    await moodsColl.updateOne(
      { userId, date },
      {
        $set: updateDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const record = await moodsColl.findOne({ userId, date }, { projection: { _id: 0 } });

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      date,
      moodRecord: record,
    });
  } catch (error) {
    console.error('Error in POST /api/mood:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
