/**
 * JWT Authentication Middleware
 *
 * HOW JWT WORKS:
 * 1. User logs in → server creates a signed token containing userId
 * 2. Token is sent to client → stored in localStorage
 * 3. Client sends token in every request header: "Authorization: Bearer <token>"
 * 4. This middleware intercepts protected routes, verifies the token,
 *    and attaches the userId to req for use in route handlers
 * 5. If token is missing/invalid/expired → 401 Unauthorized is returned
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'campusecho_super_secret_key_2024';

/**
 * Protect routes — verifies JWT token
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        hint: 'Include Authorization: Bearer <token> in your request headers'
      });
    }

    const token = authHeader.split(' ')[1]; // Get token after "Bearer "

    // 2. Verify token signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Fetch user from database (ensures user still exists)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Token is valid but user no longer exists.' });
    }

    // 4. Attach user info to request object for downstream use
    req.userId = decoded.userId;
    req.user = user;

    next(); // Proceed to the actual route handler

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error.' });
  }
};

/**
 * Admin-only middleware — must be used AFTER authMiddleware
 */
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access forbidden. Admin privileges required.'
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
