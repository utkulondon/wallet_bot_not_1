const Order = require('../models/Order');
const logger = require('../utils/logger');
const solanaService = require('../chains/solana/SolanaService');
const tonService = require('../chains/ton/TonService');
const User = require('../models/User');

class TradingService {
  constructor() {
    this.baseUrl = process.env.TRADING_API_URL;
  }

  async createOrder(userId, orderData) {
    try {
      const order = new Order({
        userId,
        ...orderData
      });

      await order.save();
      return order;
    } catch (error) {
      logger.error(`Emir oluşturma hatası: ${error.message}`);
      throw new Error('Emir oluşturulurken bir hata oluştu');
    }
  }

  async getOrders(userId, filters = {}) {
    try {
      const query = { userId, ...filters };
      const orders = await Order.find(query).sort({ createdAt: -1 });
      return orders;
    } catch (error) {
      logger.error(`Emir listesi alma hatası: ${error.message}`);
      throw new Error('Emirler alınırken bir hata oluştu');
    }
  }

  async cancelOrder(userId, orderId) {
    try {
      const order = await Order.findOne({ _id: orderId, userId });
      
      if (!order) {
        throw new Error('Emir bulunamadı');
      }

      if (order.status !== 'PENDING') {
        throw new Error('Bu emir iptal edilemez');
      }

      order.status = 'CANCELLED';
      await order.save();
      
      return order;
    } catch (error) {
      logger.error(`Emir iptal hatası: ${error.message}`);
      throw new Error('Emir iptal edilirken bir hata oluştu');
    }
  }

  async getActiveOrders(userId) {
    try {
      return await Order.find({
        userId,
        status: 'PENDING'
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Aktif emir listesi alma hatası: ${error.message}`);
      throw new Error('Aktif emirler alınırken bir hata oluştu');
    }
  }

  async getOrderHistory(userId, limit = 10) {
    try {
      return await Order.find({
        userId,
        status: { $in: ['FILLED', 'CANCELLED', 'EXPIRED'] }
      })
      .sort({ updatedAt: -1 })
      .limit(limit);
    } catch (error) {
      logger.error(`Emir geçmişi alma hatası: ${error.message}`);
      throw new Error('Emir geçmişi alınırken bir hata oluştu');
    }
  }

  validateOrderData(orderData) {
    const errors = [];

    if (!['SOLANA', 'TON'].includes(orderData.chain)) {
      errors.push('Geçersiz blockchain');
    }

    if (!['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'].includes(orderData.type)) {
      errors.push('Geçersiz emir tipi');
    }

    if (!['BUY', 'SELL'].includes(orderData.side)) {
      errors.push('Geçersiz işlem yönü');
    }

    if (orderData.amount <= 0) {
      errors.push('Miktar sıfırdan büyük olmalıdır');
    }

    if (orderData.type !== 'MARKET' && (!orderData.price || orderData.price <= 0)) {
      errors.push('Geçersiz fiyat');
    }

    if (['STOP_LOSS', 'TAKE_PROFIT'].includes(orderData.type) && 
        (!orderData.stopPrice || orderData.stopPrice <= 0)) {
      errors.push('Geçersiz stop fiyatı');
    }

    return errors;
  }

  async getTokenInfo(tokenAddress, chain) {
    try {
      if (chain === 'SOLANA') {
        return await solanaService.getTokenInfo(tokenAddress);
      } else if (chain === 'TON') {
        return await tonService.getTokenInfo(tokenAddress);
      } else {
        throw new Error('Desteklenmeyen blockchain');
      }
    } catch (error) {
      logger.error(`Token bilgisi alma hatası: ${error.message}`);
      throw new Error('Token bilgileri alınamadı');
    }
  }

  async calculateSwapAmount(tokenAddress, amount, chain) {
    try {
      const tokenInfo = await this.getTokenInfo(tokenAddress, chain);
      return {
        inputAmount: amount,
        outputAmount: amount * tokenInfo.price,
        priceImpact: tokenInfo.priceImpact,
        minimumReceived: (amount * tokenInfo.price * 0.995).toFixed(8) // %0.5 slippage
      };
    } catch (error) {
      logger.error(`Swap hesaplama hatası: ${error.message}`);
      throw new Error('Swap miktarı hesaplanamadı');
    }
  }

  async sendTransaction(userId, tokenAddress, amount, chain) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) throw new Error('Kullanıcı bulunamadı');
      let wallet;
      if (chain === 'SOLANA') {
        wallet = user.solanaCüzdan;
        return await solanaService.sendTransaction(wallet.publicKey, tokenAddress, amount);
      } else if (chain === 'TON') {
        wallet = user.tonCüzdan;
        return await tonService.sendTransaction(wallet.address, tokenAddress, amount);
      } else {
        throw new Error('Desteklenmeyen blockchain');
      }
    } catch (error) {
      logger.error(`İşlem gönderme hatası: ${error.message}`);
      throw new Error('İşlem gönderilemedi: ' + error.message);
    }
  }

  async checkTransactionStatus(txHash, chain) {
    try {
      return {
        status: 'COMPLETED',
        confirmations: 12,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`İşlem durumu kontrol hatası: ${error.message}`);
      throw new Error('İşlem durumu kontrol edilemedi');
    }
  }
}

module.exports = new TradingService(); 