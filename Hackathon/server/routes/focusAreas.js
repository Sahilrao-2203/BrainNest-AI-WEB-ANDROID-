import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { MAKAUT_CURRICULUM, MAKAUT_SUBJECTS } from '../seedData.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

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

// GET dynamic focus areas for userId
router.get('/focus-areas', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const selectedSubjectCode = req.query.subjectCode || 'ES-CS201';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      focusAreas: [],
    });
  }

  try {
    const db = getDb();
    const topicsColl = db.collection('topics');
    const subjectsColl = db.collection('subjects');
    const progressColl = db.collection('topicProgress');
    const quizColl = db.collection('quizAttempts');

    // 1. Fetch user topic progress and quiz attempts from DB
    const userProgressDoc = await progressColl.findOne({ userId });
    const completedTopicIds = userProgressDoc?.completedTopicIds || [];

    const userQuizAttempts = await quizColl
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const quizScoresByTopic = {};
    userQuizAttempts.forEach((att) => {
      if (att.topicId && quizScoresByTopic[att.topicId] === undefined) {
        quizScoresByTopic[att.topicId] = att.percentage;
      }
    });

    // 2. Fetch candidate topics from DB
    let candidateTopics = await topicsColl.find({ subjectCode: selectedSubjectCode }, { projection: { _id: 0 } }).toArray();
    if (candidateTopics.length === 0) {
      candidateTopics = await topicsColl.find({}, { projection: { _id: 0 } }).toArray();
    }
    if (candidateTopics.length === 0) {
      candidateTopics = MAKAUT_CURRICULUM.filter((t) => t.subjectCode === selectedSubjectCode);
    }

    // 3. Score topics based on completion, quiz scores, and priority
    const scoredAreas = [];

    candidateTopics.forEach((topic) => {
      const cleanId = getCanonicalTopicId(topic.id);
      const isCompleted = completedTopicIds.some((storedId) => {
        const canonical = getCanonicalTopicId(storedId);
        return storedId === topic.id || canonical === cleanId || storedId === cleanId;
      });

      const quizScore = quizScoresByTopic[topic.id] ?? quizScoresByTopic[cleanId] ?? null;

      // Skip completed topics unless quiz score is poor (< 60%)
      if (isCompleted && (quizScore === null || quizScore >= 60)) {
        return;
      }

      let priorityScore = 20;
      let scoreDisplay = 'Not Started';
      let scoreColor = 'outline';
      let description = `Scheduled topic in ${topic.module || 'Core Module'}.`;
      let actionType = 'practice';
      let actionText = 'Generate Practice Set →';

      if (quizScore !== null && quizScore < 60) {
        priorityScore += 100;
        scoreDisplay = `${quizScore}%`;
        scoreColor = 'error';
        description = `Recent quiz score is ${quizScore}%. Review and practice recommended.`;
        actionType = 'practice';
        actionText = 'Generate Practice Set →';
      } else if (topic.priority === 'high') {
        priorityScore += 30;
        scoreDisplay = 'Not Started';
        scoreColor = 'primary';
        description = `High-priority core topic in ${topic.module || 'Module 1'}.`;
        actionType = 'practice';
        actionText = 'Generate Practice Set →';
      }

      scoredAreas.push({
        priorityScore,
        area: {
          id: `focus-${topic.id}`,
          topicId: topic.id,
          subjectCode: topic.subjectCode,
          subjectName: topic.subject || 'Computer Science',
          subjectColor: topic.subjectColor || 'primary',
          scoreDisplay,
          scoreColor,
          title: topic.topic,
          description,
          actionType,
          actionText,
          topic,
        },
      });
    });

    scoredAreas.sort((a, b) => b.priorityScore - a.priorityScore);

    const focusAreas = scoredAreas.slice(0, 3).map((item) => item.area);

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      subjectCode: selectedSubjectCode,
      focusAreas,
    });
  } catch (error) {
    console.error('Error in GET /api/focus-areas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
