import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'studyflow_jwt_secret_key_2026_production';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Require Authentication Middleware
export function requireAuth(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.studyflow_token) {
    token = req.cookies.studyflow_token;
  }

  // 2. Check Authorization Bearer header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to access this resource.',
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.studentId) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.',
    });
  }

  req.user = decoded;
  next();
}

// Optional Authentication Middleware
export function optionalAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.studyflow_token) {
    token = req.cookies.studyflow_token;
  }

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.studentId) {
      req.user = decoded;
    }
  }

  next();
}
