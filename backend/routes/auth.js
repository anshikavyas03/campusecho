/**
 * Authentication Routes
 * POST /api/auth/register - Create new account
 * POST /api/auth/login    - Login and receive JWT
 * GET  /api/auth/me       - Get current user profile
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// ========================
// REGISTER
// ========================
/**
 * POST /api/auth/register
 * Body: { name, email, password, department? }
 *
 * Response (201):
 * { message: "Registration successful", token, user: { id, name, email, role } }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department, role, adminCode } = req.body;

    // --- Input validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // --- Admin secret code validation ---
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'campus@admin2025';
    if (role === 'admin') {
      if (!adminCode) {
        return res.status(403).json({ error: 'Admin secret code is required to register as admin.' });
      }
      if (adminCode !== ADMIN_SECRET) {
        return res.status(403).json({ error: 'Invalid admin secret code.' });
      }
    }

    // --- Check for existing user ---
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // --- Create user ---
    const user = new User({ name, email, department: department || 'General' });
    user.role = (role === 'admin') ? 'admin' : 'student';
    user.password = password;
    await user.save();

    // --- Generate JWT token ---
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful! Welcome to CampusEcho.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ========================
// LOGIN
// ========================
/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Response (200):
 * { message: "Login successful", token, user: { id, name, email, role } }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // --- Input validation ---
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // --- Find user by email ---
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // --- Verify password ---
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // --- Role mismatch check ---
    // If user selected Admin on login but their account is Student, block them
    if (role && role !== user.role) {
      return res.status(403).json({
        error: `This account is registered as "${user.role}". Please select "${user.role}" and try again.`
      });
    }

    // --- Generate JWT ---
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ========================
// GET CURRENT USER
// ========================
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// ========================
// EDIT PROFILE
// ========================
/**
 * PUT /api/auth/profile
 * Body: { name, department, currentPassword?, newPassword? }
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, department, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Update name and department
    if (name && name.trim().length >= 2) user.name = name.trim();
    if (department !== undefined) user.department = department.trim() || 'General';

    // Change password if requested
    if (currentPassword && newPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      user.password = newPassword; // hashed by pre-save hook
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Edit profile error:', err);
    res.status(500).json({ error: 'Server error while updating profile.' });
  }
});

// ========================
// DELETE ACCOUNT
// ========================
/**
 * DELETE /api/auth/account
 * Body: { password } — user must confirm with password
 */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required to delete account.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Verify password before deleting
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password.' });

    // Delete all queries belonging to this user
    const Query = require('../models/Query');
    await Query.deleteMany({ userId: req.userId });

    // Delete user account
    await User.findByIdAndDelete(req.userId);

    res.json({ message: 'Account and all associated queries deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Server error while deleting account.' });
  }
});

module.exports = router;