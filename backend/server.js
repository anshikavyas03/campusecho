/**
 * CampusEcho - Smart Campus Query Management System
 * Main Server Entry Point
 */
const API_BASE = 'https://campusecho-w36x.onrender.com/api';
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ========================
// DATABASE CONNECTION
// ========================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusecho';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// ========================
// ROUTES
// ========================
app.get('/api', (req, res) => {
  res.json({
    message: '🎓 CampusEcho API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register | /api/auth/login',
      queries: '/api/queries | /api/queries/:id',
      admin: '/api/admin/queries'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', queryRoutes);

// Catch-all: serve frontend for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================
// GLOBAL ERROR HANDLER
// ========================
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ error: 'Internal server error. Please try again.' });
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`\n🚀 CampusEcho server running on http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api\n`);
});
