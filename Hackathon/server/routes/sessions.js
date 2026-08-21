import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

const MIN_STUDY_TIME_FOR_STREAK = 10 * 60 * 1000; // 10 minutes

export function getTodayLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfWeekDate(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// POST record study session time
router.post('/study-sessions/record', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const {
    topicId,
    subjectCode = 'ES-CS201',
    durationMs = 0,
    startedAt = Date.now(),
    endedAt = Date.now(),
    date = getTodayLocalDateString(),
  } = req.body;

  if (durationMs <= 0) {
    return res.json({ success: true, message: 'No duration to record' });
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
    const sessionsColl = db.collection('studySessions');

    const durationSeconds = Math.floor(durationMs / 1000);

    const sessionDoc = {
      userId,
      topicId,
      subjectCode,
      date,
      startedAt,
      endedAt,
      durationMs,
      durationSeconds,
      createdAt: Date.now(),
    };

    await sessionsColl.insertOne(sessionDoc);

    res.json({
      success: true,
      source: 'mongodb',
      session: sessionDoc,
    });
  } catch (error) {
    console.error('Error in POST /api/study-sessions/record:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET study sessions for user
router.get('/study-sessions', optionalAuth, async (req, res) => {
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
      sessions: [],
    });
  }

  try {
    const db = getDb();
    const sessionsColl = db.collection('studySessions');

    const sessions = await sessionsColl
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      source: 'mongodb',
      sessions,
    });
  } catch (error) {
    console.error('Error in GET /api/study-sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET calculated study stats (weekly hours, streak, achievements)
router.get('/study-stats', optionalAuth, async (req, res) => {
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
      hoursStudied: '0h',
      streakDays: '0 Days',
      streakCount: 0,
      isOneWeekBadgeUnlocked: false,
    });
  }

  try {
    const db = getDb();
    const sessionsColl = db.collection('studySessions');

    const allSessions = await sessionsColl.find({ userId }).toArray();

    // 1. Group active study time by date string (YYYY-MM-DD)
    const dailyTotals = {};
    allSessions.forEach((s) => {
      const dStr = s.date || getTodayLocalDateString(new Date(s.createdAt || s.startedAt));
      dailyTotals[dStr] = (dailyTotals[dStr] || 0) + (s.durationMs || 0);
    });

    // 2. Calculate Weekly Hours (Monday to Sunday)
    const monday = getStartOfWeekDate();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let weeklyMs = 0;
    Object.entries(dailyTotals).forEach(([dateStr, durationMs]) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const logDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (logDate >= monday && logDate <= sunday) {
          weeklyMs += durationMs;
        }
      }
    });

    // Format weekly hours
    let hoursStudied = '0h';
    const totalMinutes = Math.floor(weeklyMs / (1000 * 60));
    if (totalMinutes > 0) {
      if (totalMinutes < 60) {
        hoursStudied = `${totalMinutes}m`;
      } else {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        hoursStudied = m === 0 ? `${h}h` : `${h}h ${m}m`;
      }
    }

    // 3. Calculate Streak (Consecutive calendar days with >= 10 mins study)
    const qualifies = (dateStr) => (dailyTotals[dateStr] || 0) >= MIN_STUDY_TIME_FOR_STREAK;
    const todayStr = getTodayLocalDateString();

    let streakCount = 0;
    const currDate = new Date();

    if (qualifies(todayStr)) {
      streakCount = 1;
      currDate.setDate(currDate.getDate() - 1);
      while (qualifies(getTodayLocalDateString(currDate))) {
        streakCount++;
        currDate.setDate(currDate.getDate() - 1);
      }
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (qualifies(getTodayLocalDateString(yesterday))) {
        streakCount = 1;
        currDate.setDate(currDate.getDate() - 2);
        while (qualifies(getTodayLocalDateString(currDate))) {
          streakCount++;
          currDate.setDate(currDate.getDate() - 1);
        }
      }
    }

    const streakDays = `${streakCount} ${streakCount === 1 ? 'Day' : 'Days'}`;
    const isOneWeekBadgeUnlocked = streakCount >= 7;

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      hoursStudied,
      streakDays,
      streakCount,
      isOneWeekBadgeUnlocked,
    });
  } catch (error) {
    console.error('Error in GET /api/study-stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
