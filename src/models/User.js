const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: false
  },
  solanaCüzdan: {
    publicKey: String,
    privateKey: String,
    balance: {
      type: Number,
      default: 0
    },
    securityPassword: {
      type: String,
      required: false
    },
    passwordSet: {
      type: Boolean,
      default: false
    },
    createdAt: Date
  },
  tonCüzdan: {
    address: String,
    privateKey: String,
    mnemonic: String,
    balance: {
      type: Number,
      default: 0
    },
    securityPassword: {
      type: String,
      required: false
    },
    passwordSet: {
      type: Boolean,
      default: false
    },
    createdAt: Date
  },
  session: {
    isActive: {
      type: Boolean,
      default: false
    },
    lastActivity: Date,
    expiresAt: Date
  },
  settings: {
    notifications: {
      priceAlerts: {
        type: Boolean,
        default: true
      },
      tradeUpdates: {
        type: Boolean,
        default: true
      },
      marketNews: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    timezone: {
      type: String,
      default: 'Europe/Istanbul'
    },
    defaultChain: {
      type: String,
      enum: ['SOLANA', 'TON'],
      default: 'SOLANA'
    },
    tradingDefaults: {
      slippageTolerance: {
        type: Number,
        default: 0.5
      },
      defaultOrderType: {
        type: String,
        enum: ['MARKET', 'LIMIT'],
        default: 'MARKET'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema); 