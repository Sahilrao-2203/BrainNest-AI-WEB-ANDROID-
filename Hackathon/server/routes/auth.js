import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, isDbConnected } from '../db.js';
import { generateToken, requireAuth, optionalAuth } from '../middleware/auth.js';
import { INITIAL_PROFILE } from '../seedData.js';
import { getFallbackProfile, saveFallbackProfile, findFallbackUserByEmailOrStudentId } from './users.js';

const router = Router();

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { email, password, name, studentId, course, branch, bio } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email address is required.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
  }

  const assignedStudentId = studentId || `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanEmail = email.toLowerCase().trim();

  // Save to fallback store for offline/fallback consistency
  saveFallbackProfile(assignedStudentId, {
    studentId: assignedStudentId,
    email: cleanEmail,
    name: name || 'Student',
    course: course || 'B.Tech',
    branch: branch || 'Computer Science & Engineering',
    bio: bio || 'Passionate about AI and software development.',
    avatarUrl: INITIAL_PROFILE.avatarUrl,
    year: '',
    semester: '',
    collegeName: '',
    universityRollNo: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
  });

  if (!isDbConnected()) {
    const token = generateToken({ studentId: assignedStudentId, email: cleanEmail, name: name || 'Student' });
    res.cookie('studyflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const fallbackProf = getFallbackProfile(assignedStudentId);
    delete fallbackProf.passwordHash;
    return res.json({
      success: true,
      source: 'fallback',
      token,
      profile: fallbackProf,
    });
  }

  try {
    const db = getDb();
    const usersColl = db.collection('users');

    // Check if email already registered
    const existingUser = await usersColl.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newProfile = {
      studentId: assignedStudentId,
      email: cleanEmail,
      passwordHash,
      name: name || 'Student',
      course: course || 'B.Tech',
      branch: branch || 'Computer Science & Engineering',
      bio: bio || 'Passionate about AI and software development.',
      avatarUrl: INITIAL_PROFILE.avatarUrl,
      year: '',
      semester: '',
      collegeName: '',
      universityRollNo: '',
      phoneNumber: '',
      dateOfBirth: '',
      gender: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await usersColl.updateOne(
      { studentId: assignedStudentId },
      { $set: newProfile },
      { upsert: true }
    );

    saveFallbackProfile(assignedStudentId, newProfile);

    const token = generateToken({
      studentId: assignedStudentId,
      email: newProfile.email,
      name: newProfile.name,
    });

    res.cookie('studyflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Omit passwordHash in response
    const { passwordHash: _, ...safeProfile } = newProfile;

    res.json({
      success: true,
      source: 'mongodb',
      token,
      profile: safeProfile,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/register:', error);
    res.status(500).json({ success: false, error: 'Failed to create user account. Please try again.' });
  }
});

// In-memory rate limiting map for login attempts (IP -> { count: number, lockUntil: number })
const loginAttemptsMap = new Map();

function getClientIp(req) {
  let raw = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
  if (Array.isArray(raw)) raw = raw[0];
  if (typeof raw === 'string' && raw.includes(',')) raw = raw.split(',')[0];
  if (typeof raw === 'string') {
    raw = raw.replace(/^::ffff:/, '').trim();
    if (raw === '::1') raw = '127.0.0.1';
  }
  return raw || '127.0.0.1';
}

export function loginRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let record = loginAttemptsMap.get(ip);

  if (record && record.lockUntil > now) {
    const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
    const timeMsg = remainingSec > 1 && remainingSec < 60 ? `${remainingSec} seconds` : '1 minute';
    return res.status(429).json({
      success: false,
      error: `Too many login attempts. Please try again in ${timeMsg}.`,
      retryAfterSeconds: remainingSec,
    });
  }

  if (record && record.lockUntil > 0 && record.lockUntil <= now) {
    loginAttemptsMap.delete(ip);
  }

  req.recordFailedLogin = () => {
    let rec = loginAttemptsMap.get(ip) || { count: 0, lockUntil: 0 };
    rec.count += 1;
    if (rec.count >= 3) {
      rec.lockUntil = Date.now() + 60 * 1000; // Lock for 1 minute after 3 failed attempts
    }
    loginAttemptsMap.set(ip, rec);
  };

  req.resetFailedLogin = () => {
    loginAttemptsMap.delete(ip);
  };

  next();
}

// POST /api/auth/login
router.post('/auth/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.recordFailedLogin();
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  if (!isDbConnected()) {
    let matchedUser = findFallbackUserByEmailOrStudentId(email);
    if (!matchedUser) {
      const fallbackId = email.includes('SF-') ? email.trim() : `SF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      matchedUser = saveFallbackProfile(fallbackId, {
        email: email.toLowerCase().trim(),
        name: email.split('@')[0] || 'Student',
      });
    }

    const token = generateToken({ studentId: matchedUser.studentId, email: matchedUser.email || email, name: matchedUser.name });
    res.cookie('studyflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    req.resetFailedLogin();
    const { passwordHash: _, ...safeFallback } = matchedUser;
    return res.json({
      success: true,
      source: 'fallback',
      token,
      profile: safeFallback,
    });
  }

  try {
    const db = getDb();
    const usersColl = db.collection('users');

    const user = await usersColl.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { studentId: email.trim() },
      ],
    });

    if (!user) {
      req.recordFailedLogin();
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Verify password if hash exists
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        req.recordFailedLogin();
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }
    }

    // Reset failed login counter on successful authentication
    req.resetFailedLogin();

    const token = generateToken({
      studentId: user.studentId,
      email: user.email || email,
      name: user.name,
    });

    res.cookie('studyflow_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...safeProfile } = user;

    res.json({
      success: true,
      source: 'mongodb',
      token,
      profile: safeProfile,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    res.status(500).json({ success: false, error: 'Authentication error. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('studyflow_token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
router.get('/auth/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({
      success: true,
      authenticated: false,
      profile: getFallbackProfile('SF-2024-0892'),
    });
  }

  if (!isDbConnected()) {
    return res.json({
      success: true,
      authenticated: true,
      source: 'fallback',
      profile: getFallbackProfile(req.user.studentId),
    });
  }

  try {
    const db = getDb();
    const usersColl = db.collection('users');

    let user = await usersColl.findOne({ studentId: req.user.studentId });

    if (!user) {
      user = { ...INITIAL_PROFILE, studentId: req.user.studentId, createdAt: Date.now() };
      await usersColl.insertOne(user);
    }

    const { passwordHash: _, ...safeProfile } = user;

    res.json({
      success: true,
      authenticated: true,
      source: 'mongodb',
      profile: safeProfile,
    });
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
