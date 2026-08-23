/**
 * CampusEcho - Smart Campus Query Management System
 * Main server entry point
 */
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusecho';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/api', (req, res) => {
  res.json({
    message: 'CampusEcho API is running',
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error. Please try again.' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`CampusEcho server running on http://localhost:${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/api`);
});
