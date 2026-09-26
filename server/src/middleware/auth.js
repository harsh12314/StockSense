const jwt = require('jsonwebtoken');

/**
 * Express middleware — verifies the JWT from the Authorization header.
 * Attaches decoded payload to `req.user` on success.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access denied. No token provided.' },
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured in environment variables.');
      return res.status(500).json({
        success: false,
        error: { message: 'Server configuration error.' },
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token. Please log in again.' },
    });
  }
};

/**
 * Role authorization middleware — ensures req.user has the required role.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden. You do not have permission to access this resource.' },
      });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
