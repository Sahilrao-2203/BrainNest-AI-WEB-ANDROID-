import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { MAKAUT_CURRICULUM } from '../seedData.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Helper to canonicalize topic IDs
function getCanonicalTopicId(topicId) {
  if (!topicId) return '';
  let clean = topicId.replace(/^(task-|makaut-|custom-)/, '');
  
  if (topicId.includes('custom-') || clean.startsWith('custom-')) {
    return `custom-${clean}`;
  }

  const dashCount = (clean.match(/-/g) || []).length;
  if (dashCount > 2) {
    clean = clean.replace(/-\d+$/, '');
  }
  return clean;
}

// Helper to extract semester number defensively
function extractSemesterNum(sem) {
  if (!sem) return 1;
  const s = sem.toString().toUpperCase().trim();
  if (s.includes('1') || s.includes('I')) return 1;
  if (s.includes('2') || s.includes('II')) return 2;
  return 1;
}

// Shared helper to compute progress stats
async function getProgressStats(db, userId, completedTopicIds, semesterQuery) {
  const customSyllabiColl = db.collection('customSyllabi');
  const topicsColl = db.collection('topics');

  // Check if user has custom syllabus
  const customDoc = await customSyllabiColl.findOne({ userId });
  let topicsList = [];

  if (customDoc && customDoc.syllabus) {
    const subjects = customDoc.syllabus.subjects || [];
    const semNum = extractSemesterNum(customDoc.syllabus.semester);

    subjects.forEach((s, subIdx) => {
      const code = s.code || s.subjectCode || `SUBJ-${subIdx}`;
      const units = s.units || [];
      units.forEach((u, unitIdx) => {
        const topics = u.topics || [];
        topics.forEach((t, topicIdx) => {
          const topicName = typeof t === 'string' ? t : (t.name || '');
          topicsList.push({
            id: `custom-${code}-${unitIdx}-${topicIdx}`,
            subjectCode: code,
            semester: semNum,
            topic: topicName,
          });
        });
      });
    });
  } else {
    // Retrieve standard topics filtered by semester
    let semester = semesterQuery ? parseInt(semesterQuery) : null;
    if (!semester) {
      // Fallback: load user's profile to get semester
      const user = await db.collection('users').findOne({ studentId: userId });
      if (user) {
        semester = extractSemesterNum(user.semester);
      }
    }
    if (!semester) {
      semester = 1; // Default fallback
    }

    const query = { semester };
    const allTopics = await topicsColl.find(query, { projection: { id: 1 } }).toArray();
    topicsList = allTopics.length > 0 ? allTopics : MAKAUT_CURRICULUM.filter(t => t.semester === semester);
  }

  const totalCount = topicsList.length;

  let completedCount = 0;
  topicsList.forEach((topic) => {
    const cleanId = getCanonicalTopicId(topic.id);
    const isDone = completedTopicIds.some((storedId) => {
      const canonical = getCanonicalTopicId(storedId);
      return storedId === topic.id || canonical === cleanId || storedId === cleanId;
    });
    if (isDone) completedCount++;
  });

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completedCount,
    totalCount,
    percentage,
  };
}

// GET user topic progress & calculated percentage
router.get('/progress', optionalAuth, async (req, res) => {
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
      completedTopicIds: [],
      completedCount: 0,
      totalCount: MAKAUT_CURRICULUM.length,
      percentage: 0,
    });
  }

  try {
    const db = getDb();
    const progressColl = db.collection('topicProgress');

    const record = await progressColl.findOne({ userId });
    const completedTopicIds = record?.completedTopicIds || [];

    const stats = await getProgressStats(db, userId, completedTopicIds, req.query.semester);

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      completedTopicIds,
      ...stats,
    });
  } catch (error) {
    console.error('Error in GET /api/progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST toggle topic completion state
router.post('/progress/toggle', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const { topicId, semester } = req.body;

  if (!topicId) {
    return res.status(400).json({ success: false, error: 'topicId is required' });
  }

  if (!isDbConnected()) {
    return res.json({
      success: false,
      source: 'fallback',
      error: 'MongoDB is disconnected.',
    });
  }

  try {
    const db = getDb();
    const progressColl = db.collection('topicProgress');

    let record = await progressColl.findOne({ userId });
    let completedTopicIds = record?.completedTopicIds || [];

    const cleanId = getCanonicalTopicId(topicId);
    const isAlreadyCompleted = completedTopicIds.some((id) => {
      const canonical = getCanonicalTopicId(id);
      return id === topicId || canonical === cleanId || id === cleanId;
    });

    if (isAlreadyCompleted) {
      // Remove topic ID and canonical ID
      completedTopicIds = completedTopicIds.filter((id) => {
        const canonical = getCanonicalTopicId(id);
        return id !== topicId && canonical !== cleanId && id !== cleanId;
      });
    } else {
      // Add topic ID and canonical ID
      const newSet = new Set(completedTopicIds);
      newSet.add(topicId);
      if (cleanId) newSet.add(cleanId);
      completedTopicIds = Array.from(newSet);
    }

    await progressColl.updateOne(
      { userId },
      { $set: { completedTopicIds, updatedAt: Date.now() } },
      { upsert: true }
    );

    const stats = await getProgressStats(db, userId, completedTopicIds, semester || req.body.semester);

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      completedTopicIds,
      ...stats,
    });
  } catch (error) {
    console.error('Error in POST /api/progress/toggle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
