const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  chain: {
    type: String,
    enum: ['SOLANA', 'TON'],
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['ABOVE', 'BELOW'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  repeat: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'TRIGGERED', 'DISABLED'],
    default: 'ACTIVE'
  },
  lastTriggered: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
alertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Alert', alertSchema); 