const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'],
    required: true
  },
  side: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: function() {
      return this.type !== 'MARKET';
    }
  },
  stopPrice: {
    type: Number,
    required: function() {
      return this.type === 'STOP_LOSS' || this.type === 'TAKE_PROFIT';
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'FILLED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING'
  },
  filledAmount: {
    type: Number,
    default: 0
  },
  filledPrice: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema); 