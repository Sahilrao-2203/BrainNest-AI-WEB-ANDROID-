import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { MAKAUT_SUBJECTS, MAKAUT_CURRICULUM } from '../seedData.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Ensure collections are populated
async function ensureSeeded(db) {
  const subjectsColl = db.collection('subjects');
  const topicsColl = db.collection('topics');

  const subjectCount = await subjectsColl.countDocuments();
  if (subjectCount === 0) {
    await subjectsColl.insertMany(MAKAUT_SUBJECTS);
    console.log('🌱 Seeded subjects collection in MongoDB');
  }

  const topicCount = await topicsColl.countDocuments();
  if (topicCount === 0) {
    await topicsColl.insertMany(MAKAUT_CURRICULUM);
    console.log('🌱 Seeded topics collection in MongoDB');
  }
}

// GET all subjects (only standard seeded ones)
router.get('/subjects', optionalAuth, async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      subjects: MAKAUT_SUBJECTS,
    });
  }

  try {
    const db = getDb();
    await ensureSeeded(db);
    
    // Retrieve only standard subjects
    const subjects = await db.collection('subjects').find({ userId: { $exists: false } }, { projection: { _id: 0 } }).toArray();

    res.json({
      success: true,
      source: 'mongodb',
      subjects,
    });
  } catch (error) {
    console.error('Error in GET /api/subjects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET topics (optional query: subjectCode; only standard seeded ones)
router.get('/topics', optionalAuth, async (req, res) => {
  const { subjectCode } = req.query;

  if (!isDbConnected()) {
    const filtered = subjectCode
      ? MAKAUT_CURRICULUM.filter((t) => t.subjectCode === subjectCode)
      : MAKAUT_CURRICULUM;
    return res.json({
      success: true,
      source: 'fallback',
      topics: filtered,
    });
  }

  try {
    const db = getDb();
    await ensureSeeded(db);

    const query = { userId: { $exists: false } };
    if (subjectCode) {
      query.subjectCode = subjectCode;
    }
    
    const topics = await db.collection('topics').find(query, { projection: { _id: 0 } }).toArray();

    res.json({
      success: true,
      source: 'mongodb',
      topics,
    });
  } catch (error) {
    console.error('Error in GET /api/topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET custom syllabus for authenticated user
router.get('/curriculum/custom', requireAuth, async (req, res) => {
  const userId = req.user.studentId;

  if (!isDbConnected()) {
    return res.json({
      success: true,
      syllabus: null,
    });
  }

  try {
    const db = getDb();
    const doc = await db.collection('customSyllabi').findOne({ userId });
    
    res.json({
      success: true,
      syllabus: doc ? doc.syllabus : null,
    });
  } catch (error) {
    console.error('Error in GET /api/curriculum/custom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST store custom syllabus for authenticated user
router.post('/curriculum/custom', requireAuth, async (req, res) => {
  const userId = req.user.studentId;
  const syllabus = req.body;

  if (!syllabus || !syllabus.subjects) {
    return res.status(400).json({
      success: false,
      error: 'Invalid syllabus structure.',
    });
  }

  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error: 'Database is not connected.',
    });
  }

  try {
    const db = getDb();
    await db.collection('customSyllabi').updateOne(
      { userId },
      {
        $set: {
          userId,
          syllabus,
          syllabusSource: 'user_upload',
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );

    res.json({
      success: true,
      syllabus,
    });
  } catch (error) {
    console.error('Error in POST /api/curriculum/custom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE custom syllabus for authenticated user
router.delete('/curriculum/custom', requireAuth, async (req, res) => {
  const userId = req.user.studentId;

  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      error: 'Database is not connected.',
    });
  }

  try {
    const db = getDb();
    await db.collection('customSyllabi').deleteOne({ userId });

    res.json({
      success: true,
      message: 'Custom syllabus deleted.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/curriculum/custom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
