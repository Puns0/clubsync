const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Helper to strip password from user object
 */
function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

/**
 * POST /api/auth/register
 * Register a new user account (role is always 'user')
 */
router.post('/register', (req, res) => {
  const db = req.app.get('db');
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Hash password and insert
  const hashedPassword = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hashedPassword, 'user');

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(newUser);

  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: sanitizeUser(newUser),
  });
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', (req, res) => {
  const db = req.app.get('db');
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Logged in successfully',
    token,
    user: sanitizeUser(user),
  });
});

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile
 */
router.get('/me', authenticate, (req, res) => {
  const db = req.app.get('db');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: sanitizeUser(user) });
});

/**
 * PUT /api/auth/profile
 * Update current user's profile (name)
 */
router.put('/profile', authenticate, (req, res) => {
  const db = req.app.get('db');
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.prepare('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(name, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ message: 'Profile updated', user: sanitizeUser(user) });
});

/**
 * GET /api/auth/users  (Admin only)
 * List all users
 */
router.get('/users', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const users = db.prepare('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

/**
 * PATCH /api/auth/users/:id/role  (Admin only)
 * Update a user's role (promote to organizer or demote to user)
 */
router.patch('/users/:id/role', authenticate, authorize('admin'), (req, res) => {
  const db = req.app.get('db');
  const { role } = req.body;
  const userId = parseInt(req.params.id, 10);

  if (!['user', 'organizer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "organizer"' });
  }

  // Prevent modifying admin accounts
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (targetUser.role === 'admin') {
    return res.status(403).json({ error: 'Cannot modify admin accounts' });
  }

  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(role, userId);

  const updatedUser = db.prepare('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?').get(userId);
  res.json({ message: `User role updated to ${role}`, user: updatedUser });
});

module.exports = router;
