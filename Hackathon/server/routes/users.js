import { Router } from 'express';
import { getDb, isDbConnected } from '../db.js';
import { INITIAL_PROFILE } from '../seedData.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// In-memory fallback store for offline/fallback mode (keyed by studentId)
const fallbackUsersStore = new Map();

export function getFallbackProfile(userId) {
  if (fallbackUsersStore.has(userId)) {
    return { ...fallbackUsersStore.get(userId) };
  }
  const profile = { ...INITIAL_PROFILE, studentId: userId };
  fallbackUsersStore.set(userId, profile);
  return { ...profile };
}

export function saveFallbackProfile(userId, updates) {
  const existing = getFallbackProfile(userId);
  const updated = { ...existing, ...updates, studentId: userId, updatedAt: Date.now() };
  delete updated.passwordHash;
  fallbackUsersStore.set(userId, updated);
  return { ...updated };
}

export function findFallbackUserByEmailOrStudentId(identifier) {
  if (!identifier) return null;
  const term = identifier.toLowerCase().trim();
  for (const [id, prof] of fallbackUsersStore.entries()) {
    if (
      id.toLowerCase() === term ||
      (prof.studentId && prof.studentId.toLowerCase() === term) ||
      (prof.email && prof.email.toLowerCase() === term)
    ) {
      return { ...prof };
    }
  }
  return null;
}

// GET user profile
router.get('/profile', optionalAuth, async (req, res) => {
  const requestedUserId = req.query.userId || req.query.studentId;
  const authUserId = req.user?.studentId;

  // Security Check: If authenticated and requesting another user's data, reject
  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized access to another user's data" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';

  if (!isDbConnected()) {
    return res.json({
      success: true,
      source: 'fallback',
      profile: getFallbackProfile(userId),
    });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({ studentId: userId });

    if (!user) {
      // Seed initial user profile if not found
      const newProfile = { ...INITIAL_PROFILE, studentId: userId, createdAt: Date.now() };
      await usersCollection.insertOne(newProfile);
      user = newProfile;
    }

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      success: true,
      source: 'mongodb',
      profile: safeUser,
    });
  } catch (error) {
    console.error('Error in GET /api/users/profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update user profile
router.put('/profile', optionalAuth, async (req, res) => {
  const requestedUserId = req.body.studentId || req.body.userId;
  const authUserId = req.user?.studentId;

  if (authUserId && requestedUserId && requestedUserId !== authUserId) {
    return res.status(403).json({ success: false, error: "Unauthorized modification of another user's profile" });
  }

  const userId = authUserId || requestedUserId || 'SF-2024-0892';
  const updates = req.body;
  delete updates.passwordHash; // Prevent overwriting password hash via profile edit endpoint

  // Backend Validation
  if (updates.collegeName !== undefined) {
    const rawVal = req.body.collegeName;
    if (rawVal !== undefined && rawVal !== '') {
      if (rawVal.trim() === '') {
        return res.status(400).json({ success: false, error: 'College Name cannot consist only of whitespace.' });
      }
      updates.collegeName = rawVal.trim();
    }
  }

  if (updates.universityRollNo !== undefined) {
    const rawVal = req.body.universityRollNo;
    if (rawVal !== undefined && rawVal !== '') {
      if (rawVal.trim() === '') {
        return res.status(400).json({ success: false, error: 'University Roll No cannot consist only of whitespace.' });
      }
      updates.universityRollNo = rawVal.trim();
    }
  }

  if (updates.phoneNumber !== undefined && updates.phoneNumber !== '') {
    updates.phoneNumber = updates.phoneNumber.trim();
    const phoneRegex = /^(\+91)?\d{10}$/;
    if (!phoneRegex.test(updates.phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid phone number.' });
    }
  }

  if (updates.dateOfBirth !== undefined && updates.dateOfBirth !== '') {
    updates.dateOfBirth = updates.dateOfBirth.trim();
    const dobDate = new Date(updates.dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Please enter a valid Date of Birth.' });
    }
    if (dobDate > new Date()) {
      return res.status(400).json({ success: false, error: 'Date of Birth cannot be in the future.' });
    }
  }

  if (updates.gender !== undefined) {
    if (updates.gender !== '' && !['Male', 'Female', 'Prefer not to say'].includes(updates.gender)) {
      return res.status(400).json({ success: false, error: 'Invalid gender value.' });
    }
  }

  if (!isDbConnected()) {
    const updatedFallback = saveFallbackProfile(userId, updates);
    return res.json({
      success: true,
      source: 'fallback',
      profile: updatedFallback,
    });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    await usersCollection.updateOne(
      { studentId: userId },
      { $set: { ...updates, updatedAt: Date.now() } },
      { upsert: true }
    );

    const updatedUser = await usersCollection.findOne({ studentId: userId });
    saveFallbackProfile(userId, updatedUser);

    res.json({
      success: true,
      source: 'mongodb',
      profile: updatedUser,
    });
  } catch (error) {
    console.error('Error in PUT /api/users/profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
