// server/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// DEV BYPASS: if no token is present and we're in development, inject a mock
// user so the app works before the auth feature is built.
// ⚠️ Remove DEV_BYPASS (or set NODE_ENV=production) before demo.
const DEV_BYPASS_USER = { id: 1, login_id: 'dev_user', role: 'inventory_manager' };

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (!authHeader && process.env.NODE_ENV !== 'production') {
    req.user = DEV_BYPASS_USER;
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, login_id, role }
    next();
  } catch {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};
