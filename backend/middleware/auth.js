'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yulu-lens-dev-secret-change-in-production';

/**
 * Express middleware that validates an incoming JWT bearer token.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success, attaches the decoded payload to `req.user`.
 * On failure, responds with 401 Unauthorized.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header must use Bearer scheme.',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: 'Unauthorized',
      message: isExpired ? 'Token has expired.' : 'Invalid token.',
    });
  }
}

module.exports = { authenticateToken, JWT_SECRET };
