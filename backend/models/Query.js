/**
 * Query Model
 * Represents a campus query submitted by a student
 */

const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  // Reference to the student who submitted this query
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Query details
  title: {
    type: String,
    required: [true, 'Query title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Academic',
      'Hostel',
      'Library',
      'Fees & Finance',
      'Transportation',
      'Sports & Activities',
      'IT & Technical',
      'Other'
    ]
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },

  // Status tracking
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
    default: 'Pending'
  },

  // Admin response
  adminResponse: {
    type: String,
    trim: true,
    default: ''
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` on every save
querySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual: formatted creation date
querySchema.virtual('createdAtFormatted').get(function () {
  return this.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

module.exports = mongoose.model('Query', querySchema);
