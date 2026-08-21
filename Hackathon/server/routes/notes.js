import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// GET /api/notes - Fetch all notes for authenticated user
router.get('/notes', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      userId,
      notes: [],
    });
  }

  try {
    const db = getDb();
    const notesColl = db.collection('notes');

    const notes = await notesColl
      .find({ userId }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({
      success: true,
      source: 'mongodb',
      userId,
      notes,
    });
  } catch (error) {
    console.error('Error in GET /api/notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/notes - Create a new note
router.post('/notes', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const { title = 'Untitled Note', content = '', tags = [], subjectCode, id } = req.body;

  const now = new Date().toISOString();
  const noteId = id || `note-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const newNote = {
    id: noteId,
    userId,
    title: title.trim() || 'Untitled Note',
    content: content || '',
    tags: Array.isArray(tags) ? tags : [],
    subjectCode: subjectCode || null,
    createdAt: now,
    updatedAt: now,
  };

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      note: newNote,
    });
  }

  try {
    const db = getDb();
    const notesColl = db.collection('notes');

    await notesColl.updateOne(
      { id: noteId, userId },
      { $set: newNote },
      { upsert: true }
    );

    res.json({
      success: true,
      source: 'mongodb',
      note: newNote,
    });
  } catch (error) {
    console.error('Error in POST /api/notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notes/:id - Update an existing note
router.put('/notes/:id', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.userId || req.body.studentId || req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const noteId = req.params.id;
  const { title, content, tags, subjectCode } = req.body;

  const now = new Date().toISOString();
  const updateFields = {
    updatedAt: now,
  };

  if (title !== undefined) updateFields.title = title.trim() || 'Untitled Note';
  if (content !== undefined) updateFields.content = content;
  if (tags !== undefined && Array.isArray(tags)) updateFields.tags = tags;
  if (subjectCode !== undefined) updateFields.subjectCode = subjectCode;

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      note: { id: noteId, userId, ...updateFields },
    });
  }

  try {
    const db = getDb();
    const notesColl = db.collection('notes');

    const result = await notesColl.findOneAndUpdate(
      { id: noteId, userId },
      { $set: updateFields },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Note not found or unauthorized' });
    }

    res.json({
      success: true,
      source: 'mongodb',
      note: result,
    });
  } catch (error) {
    console.error('Error in PUT /api/notes/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/notes/:id', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId || req.body?.userId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId && requestedUserId !== 'SF-2024-0892') {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const noteId = req.params.id;

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      deletedId: noteId,
    });
  }

  try {
    const db = getDb();
    const notesColl = db.collection('notes');

    const result = await notesColl.deleteOne({ id: noteId, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Note not found or unauthorized' });
    }

    res.json({
      success: true,
      source: 'mongodb',
      deletedId: noteId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/notes/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
