const User = require('../models/User');
const logger = require('../utils/logger');

class SettingsService {
  async getSettings(userId) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      return user.settings;
    } catch (error) {
      logger.error(`Ayarları alma hatası: ${error.message}`);
      throw new Error('Ayarlar alınırken bir hata oluştu');
    }
  }

  async updateSettings(userId, settings) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      user.settings = {
        ...user.settings,
        ...settings
      };

      await user.save();
      return user.settings;
    } catch (error) {
      logger.error(`Ayarları güncelleme hatası: ${error.message}`);
      throw new Error('Ayarlar güncellenirken bir hata oluştu');
    }
  }

  async updateNotificationSettings(userId, notificationSettings) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      user.settings.notifications = {
        ...user.settings.notifications,
        ...notificationSettings
      };

      await user.save();
      return user.settings.notifications;
    } catch (error) {
      logger.error(`Bildirim ayarlarını güncelleme hatası: ${error.message}`);
      throw new Error('Bildirim ayarları güncellenirken bir hata oluştu');
    }
  }

  async updateTradingDefaults(userId, tradingDefaults) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      user.settings.tradingDefaults = {
        ...user.settings.tradingDefaults,
        ...tradingDefaults
      };

      await user.save();
      return user.settings.tradingDefaults;
    } catch (error) {
      logger.error(`Trading varsayılanlarını güncelleme hatası: ${error.message}`);
      throw new Error('Trading varsayılanları güncellenirken bir hata oluştu');
    }
  }

  validateSettings(settings) {
    const errors = [];

    if (settings.language && !['tr', 'en'].includes(settings.language)) {
      errors.push('Geçersiz dil seçimi');
    }

    if (settings.defaultChain && !['SOLANA', 'TON'].includes(settings.defaultChain)) {
      errors.push('Geçersiz varsayılan blockchain');
    }

    if (settings.tradingDefaults) {
      if (settings.tradingDefaults.slippageTolerance && 
          (settings.tradingDefaults.slippageTolerance < 0.1 || 
           settings.tradingDefaults.slippageTolerance > 5)) {
        errors.push('Slippage toleransı 0.1% ile 5% arasında olmalıdır');
      }

      if (settings.tradingDefaults.defaultOrderType && 
          !['MARKET', 'LIMIT'].includes(settings.tradingDefaults.defaultOrderType)) {
        errors.push('Geçersiz varsayılan emir tipi');
      }
    }

    return errors;
  }
}

module.exports = new SettingsService(); 