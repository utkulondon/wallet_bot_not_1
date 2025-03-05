const User = require('../models/User');
const tonService = require('../chains/ton/TonService');
const logger = require('../utils/logger');
const walletService = require('./WalletService');

class TonConnectService {
  constructor() {
    this.connectedWallets = new Map();
  }

  /**
   * Kullanıcının cüzdan bilgilerini alır
   * @param {string} userId - Telegram kullanıcı ID'si
   * @returns {Object|null} - Cüzdan bilgileri veya null
   */
  getWalletInfo(userId) {
    try {
      if (this.connectedWallets.has(userId)) {
        return this.connectedWallets.get(userId);
      }
      return null;
    } catch (error) {
      logger.error(`Cüzdan bilgisi alma hatası: ${error.message}`);
      return null;
    }
  }

  /**
   * Kullanıcının cüzdanını bağlar
   * @param {string} userId - Telegram kullanıcı ID'si
   * @returns {Promise<Object>} - Bağlanan cüzdan bilgileri
   */
  async connectWallet(userId) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user || !user.tonCüzdan) {
        throw new Error('Kullanıcı cüzdanı bulunamadı');
      }
      const walletInfo = {
        address: user.tonCüzdan.address,
        mnemonic: user.tonCüzdan.mnemonic,
        connectedAt: new Date()
      };

      this.connectedWallets.set(userId, walletInfo);
      logger.info(`Kullanıcı ${userId} cüzdanı bağlandı: ${walletInfo.address}`);

      return walletInfo;
    } catch (error) {
      logger.error(`Cüzdan bağlama hatası: ${error.message}`);
      throw new Error('Cüzdan bağlanamadı: ' + error.message);
    }
  }

  /**
   * Kullanıcının cüzdanını ayırır
   * @param {string} userId - Telegram kullanıcı ID'si
   * @returns {boolean} - İşlem başarılı mı
   */
  disconnectWallet(userId) {
    try {
      if (this.connectedWallets.has(userId)) {
        this.connectedWallets.delete(userId);
        logger.info(`Kullanıcı ${userId} cüzdanı ayrıldı`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Cüzdan ayırma hatası: ${error.message}`);
      return false;
    }
  }

  /**
   * İşlem gönderir
   * @param {string} userId - Telegram kullanıcı ID'si
   * @param {Object} transaction - İşlem bilgileri
   * @returns {Promise<Object>} - İşlem sonucu
   */
  async sendTransaction(userId, transaction) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user || !user.tonCüzdan) {
        throw new Error('Kullanıcı cüzdanı bulunamadı');
      }
      const walletInfo = await walletService.getWalletInfo(userId);
      if (!walletInfo) {
        throw new Error('Cüzdan bilgileri alınamadı');
      }
      if (!transaction || !transaction.messages || transaction.messages.length === 0) {
        throw new Error('Geçersiz işlem bilgileri');
      }
      logger.info(`Kullanıcı ${userId} için işlem gönderiliyor`);
      const message = transaction.messages[0];
      const tokenAddress = message.address;
      const amount = parseFloat(message.amount) / 1e9; // nano TON'dan TON'a çevir
      const result = await tonService.sendTransaction(user.tonCüzdan.address, tokenAddress, amount);
      
      logger.info(`İşlem sonucu: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`İşlem gönderme hatası: ${error.message}`);
      throw new Error('İşlem gönderilemedi: ' + error.message);
    }
  }
}

module.exports = new TonConnectService(); 