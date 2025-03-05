const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const User = require('../models/User');

class AlertService {
  async createAlert(userId, alertData) {
    try {
      const alert = new Alert({
        userId,
        ...alertData
      });

      await alert.save();
      return alert;
    } catch (error) {
      logger.error(`Alarm oluşturma hatası: ${error.message}`);
      throw new Error('Alarm oluşturulurken bir hata oluştu');
    }
  }

  async getAlerts(userId, filters = {}) {
    try {
      const query = { userId, ...filters };
      const alerts = await Alert.find(query).sort({ createdAt: -1 });
      return alerts;
    } catch (error) {
      logger.error(`Alarm listesi alma hatası: ${error.message}`);
      throw new Error('Alarmlar alınırken bir hata oluştu');
    }
  }

  async getActiveAlerts(userId) {
    try {
      return await Alert.find({
        userId,
        status: 'ACTIVE'
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error(`Aktif alarm listesi alma hatası: ${error.message}`);
      throw new Error('Aktif alarmlar alınırken bir hata oluştu');
    }
  }

  async deleteAlert(userId, alertId) {
    try {
      const alert = await Alert.findOneAndDelete({ _id: alertId, userId });
      
      if (!alert) {
        throw new Error('Alarm bulunamadı');
      }

      return alert;
    } catch (error) {
      logger.error(`Alarm silme hatası: ${error.message}`);
      throw new Error('Alarm silinirken bir hata oluştu');
    }
  }

  async updateAlertStatus(alertId, status) {
    try {
      const alert = await Alert.findById(alertId);
      
      if (!alert) {
        throw new Error('Alarm bulunamadı');
      }

      alert.status = status;
      if (status === 'TRIGGERED') {
        alert.lastTriggered = new Date();
      }

      await alert.save();
      return alert;
    } catch (error) {
      logger.error(`Alarm güncelleme hatası: ${error.message}`);
      throw new Error('Alarm güncellenirken bir hata oluştu');
    }
  }

  validateAlertData(alertData) {
    const errors = [];

    if (!['SOLANA', 'TON'].includes(alertData.chain)) {
      errors.push('Geçersiz blockchain');
    }

    if (!alertData.symbol) {
      errors.push('Sembol belirtilmedi');
    }

    if (!['ABOVE', 'BELOW'].includes(alertData.type)) {
      errors.push('Geçersiz alarm tipi');
    }

    if (!alertData.price || alertData.price <= 0) {
      errors.push('Geçersiz fiyat');
    }

    return errors;
  }
  async checkPrice(symbol, currentPrice) {
    try {
      const activeAlerts = await Alert.find({
        symbol: symbol.toUpperCase(),
        status: 'ACTIVE'
      });

      for (const alert of activeAlerts) {
        let shouldTrigger = false;

        if (alert.type === 'ABOVE' && currentPrice >= alert.price) {
          shouldTrigger = true;
        } else if (alert.type === 'BELOW' && currentPrice <= alert.price) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          const user = await User.findOne({ telegramId: alert.userId });
          if (!user) continue;
          const message = `🔔 Fiyat Alarmı!\n\n` +
            `🪙 ${symbol}\n` +
            `💰 Mevcut Fiyat: $${currentPrice}\n` +
            `📊 Hedef Fiyat: $${alert.price}\n` +
            `📈 Koşul: ${alert.type === 'ABOVE' ? 'Üzerine Çıktı' : 'Altına Düştü'}\n\n` +
            `${alert.repeat ? '🔄 Bu alarm tekrar etkinleştirilecek' : '⚠️ Bu alarm devre dışı bırakıldı'}`;
          global.eventEmitter.emit('sendTelegramMessage', user.telegramId, message);

          if (alert.repeat) {
            await this.updateAlertStatus(alert._id, 'TRIGGERED');
          } else {
            await this.updateAlertStatus(alert._id, 'DISABLED');
          }
        }
      }
    } catch (error) {
      logger.error(`Fiyat kontrol hatası: ${error.message}`);
      throw new Error('Fiyat kontrolü yapılırken bir hata oluştu');
    }
  }
}

module.exports = new AlertService(); 