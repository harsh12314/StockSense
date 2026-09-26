const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Validation helpers ──────────────────────────────────────────────

/**
 * Password must have: ≥1 lowercase, ≥1 uppercase, ≥1 special char, length > 8.
 */
function validatePassword(password) {
  if (!password || password.length <= 8) {
    return 'Password must be longer than 8 characters.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

/**
 * Login ID: unique, 6–12 characters.
 */
function validateLoginId(loginId) {
  if (!loginId || loginId.length < 6 || loginId.length > 12) {
    return 'Login ID must be between 6 and 12 characters.';
  }
  return null;
}

// ── Controllers ─────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Body: { loginId, email, password, confirmPassword, role? }
 */
const signup = async (req, res) => {
  const rawLoginId = req.body.loginId;
  const rawEmail = req.body.email;
  const { password, confirmPassword, role } = req.body;

  const loginId = typeof rawLoginId === 'string' ? rawLoginId.trim() : '';
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  // Required fields
  if (!loginId || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      error: { message: 'All fields are required (loginId, email, password, confirmPassword).' },
    });
  }

  // Confirm password match
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: { message: 'Passwords do not match.' },
    });
  }

  // Validate login ID
  const loginIdErr = validateLoginId(loginId);
  if (loginIdErr) {
    return res.status(400).json({ success: false, error: { message: loginIdErr } });
  }

  // Validate password strength
  const passwordErr = validatePassword(password);
  if (passwordErr) {
    return res.status(400).json({ success: false, error: { message: passwordErr } });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide a valid email address.' },
    });
  }

  try {
    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id, email, login_id FROM users WHERE email = ? OR login_id = ?',
      [email, loginId]
    );

    if (existing.length > 0) {
      const emailTaken = existing.some((u) => u.email.toLowerCase() === email);
      const loginIdTaken = existing.some((u) => u.login_id === loginId);

      let message = 'A user with these credentials already exists.';
      if (loginIdTaken && emailTaken) {
        message = 'Both this Login ID and email address are already registered.';
      } else if (loginIdTaken) {
        message = 'This Login ID is already taken. Please choose another.';
      } else if (emailTaken) {
        message = 'This email address is already registered.';
      }

      return res.status(409).json({
        success: false,
        error: { message },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Determine role (default: warehouse_staff)
    const userRole = role === 'inventory_manager' ? 'inventory_manager' : 'warehouse_staff';

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (login_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [loginId, email, passwordHash, userRole]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.insertId, loginId, email, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully!',
        token,
        user: { id: result.insertId, loginId, email, role: userRole },
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error. Please try again later.' },
    });
  }
};

/**
 * POST /api/auth/login
 * Body: { loginId, password }
 */
const login = async (req, res) => {
  const rawLoginId = req.body.loginId;
  const { password } = req.body;
  const loginId = typeof rawLoginId === 'string' ? rawLoginId.trim() : '';

  if (!loginId || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Login ID and password are required.' },
    });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE login_id = ?',
      [loginId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Login Id or Password.' },
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid Login Id or Password.' },
      });
    }

    const token = jwt.sign(
      { id: user.id, loginId: user.login_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        message: 'Login successful!',
        token,
        user: { id: user.id, loginId: user.login_id, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error. Please try again later.' },
    });
  }
};

/**
 * GET /api/auth/profile   (protected)
 */
const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, login_id, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
    }

    res.json({ success: true, data: { user: users[0] } });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error.' },
    });
  }
};

module.exports = { signup, login, getProfile };
