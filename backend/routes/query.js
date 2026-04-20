/**
 * Query Routes
 * All routes are protected by JWT auth middleware
 *
 * POST   /api/queries         - Submit new query (student)
 * GET    /api/queries         - Get current user's queries (student)
 * GET    /api/queries/:id     - Get single query details
 * PUT    /api/queries/:id     - Update query status (admin or owner)
 * DELETE /api/queries/:id     - Delete a query (owner only)
 * GET    /api/admin/queries   - Get ALL queries (admin only)
 */

const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ========================
// SUBMIT NEW QUERY (Protected)
// ========================
/**
 * POST /api/queries
 * Headers: Authorization: Bearer <token>
 * Body: { title, description, category, priority }
 *
 * Response (201):
 * { message: "Query submitted", query: { ... } }
 */
router.post('/queries', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required.' });
    }

    const query = new Query({
      userId: req.userId,
      title,
      description,
      category,
      priority: priority || 'Medium',
      status: 'Pending'
    });

    await query.save();

    // Populate user info for response
    await query.populate('userId', 'name email department');

    res.status(201).json({
      message: 'Query submitted successfully! We will get back to you soon.',
      query
    });

  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    console.error('Submit query error:', err);
    res.status(500).json({ error: 'Server error while submitting query.' });
  }
});

// ========================
// GET USER'S OWN QUERIES (Protected)
// ========================
/**
 * GET /api/queries
 * Headers: Authorization: Bearer <token>
 * Query params: ?status=Pending&category=Academic&sort=newest
 */
router.get('/queries', authMiddleware, async (req, res) => {
  try {
    const { status, category, sort } = req.query;

    // Build filter — students only see their own queries
    const filter = { userId: req.userId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Sorting
    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const queries = await Query.find(filter)
      .sort(sortOrder)
      .populate('userId', 'name email department');

    // Stats summary
    const stats = {
      total: queries.length,
      pending: queries.filter(q => q.status === 'Pending').length,
      inProgress: queries.filter(q => q.status === 'In Progress').length,
      resolved: queries.filter(q => q.status === 'Resolved').length,
    };

    res.json({ queries, stats });

  } catch (err) {
    console.error('Fetch queries error:', err);
    res.status(500).json({ error: 'Server error while fetching queries.' });
  }
});

// ========================
// GET SINGLE QUERY (Protected)
// ========================
router.get('/queries/:id', authMiddleware, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id).populate('userId', 'name email department');

    if (!query) {
      return res.status(404).json({ error: 'Query not found.' });
    }

    // Students can only view their own queries
    if (req.user.role !== 'admin' && query.userId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ query });

  } catch (err) {
    console.error('Get query error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ========================
// UPDATE QUERY STATUS (Protected)
// ========================
/**
 * PUT /api/queries/:id
 * Admin: can update status + adminResponse
 * Student: can only update title/description if Pending
 */
router.put('/queries/:id', authMiddleware, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) {
      return res.status(404).json({ error: 'Query not found.' });
    }

    // Admin can update status and respond
    if (req.user.role === 'admin') {
      const { status, adminResponse } = req.body;
      if (status) query.status = status;
      if (adminResponse !== undefined) query.adminResponse = adminResponse;
    } else {
      // Student can only edit their own pending queries
      if (query.userId.toString() !== req.userId) {
        return res.status(403).json({ error: 'You can only edit your own queries.' });
      }
      if (query.status !== 'Pending') {
        return res.status(400).json({ error: 'Only Pending queries can be edited.' });
      }
      const { title, description, priority } = req.body;
      if (title) query.title = title;
      if (description) query.description = description;
      if (priority) query.priority = priority;
    }

    await query.save();
    await query.populate('userId', 'name email department');

    res.json({
      message: 'Query updated successfully.',
      query
    });

  } catch (err) {
    console.error('Update query error:', err);
    res.status(500).json({ error: 'Server error while updating query.' });
  }
});

// ========================
// DELETE QUERY (Protected — owner only, Pending status)
// ========================
router.delete('/queries/:id', authMiddleware, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found.' });

    if (query.userId.toString() !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own queries.' });
    }

    await Query.findByIdAndDelete(req.params.id);
    res.json({ message: 'Query deleted successfully.' });

  } catch (err) {
    console.error('Delete query error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ========================
// ADMIN: GET ALL QUERIES
// ========================
/**
 * GET /api/admin/queries
 * Headers: Authorization: Bearer <admin-token>
 */
router.get('/admin/queries', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email department');

    // Comprehensive stats for admin dashboard
    const allQueries = await Query.find({});
    const stats = {
      total: allQueries.length,
      pending: allQueries.filter(q => q.status === 'Pending').length,
      inProgress: allQueries.filter(q => q.status === 'In Progress').length,
      resolved: allQueries.filter(q => q.status === 'Resolved').length,
      urgent: allQueries.filter(q => q.priority === 'Urgent').length,
    };

    res.json({ queries, stats });

  } catch (err) {
    console.error('Admin fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
