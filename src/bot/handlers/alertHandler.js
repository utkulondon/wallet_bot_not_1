const { Markup } = require('telegraf');
const alertService = require('../../services/AlertService');
const logger = require('../../utils/logger');

async function handleAlertCommands(bot) {
  bot.command('setalert', async (ctx) => {
    try {
      const [_, chain, symbol, type, price, repeat] = ctx.message.text.split(' ');

      if (!chain || !symbol || !type || !price) {
        return ctx.reply(
          'Lütfen tüm parametreleri girin.\n' +
          'Örnek: /setalert SOLANA SOL/USDT ABOVE 25.5 [REPEAT]'
        );
      }

      const alertData = {
        chain: chain.toUpperCase(),
        symbol: symbol.toUpperCase(),
        type: type.toUpperCase(),
        price: parseFloat(price),
        repeat: repeat?.toUpperCase() === 'REPEAT'
      };

      const errors = alertService.validateAlertData(alertData);
      if (errors.length > 0) {
        return ctx.reply(`Hata(lar):\n${errors.join('\n')}`);
      }

      const alert = await alertService.createAlert(ctx.from.id, alertData);
      ctx.reply(
        `Fiyat alarmı oluşturuldu!\n\n` +
        `🔹 Zincir: ${alert.chain}\n` +
        `🔹 Sembol: ${alert.symbol}\n` +
        `🔹 Koşul: Fiyat ${alert.type === 'ABOVE' ? 'üzerine çıktığında' : 'altına düştüğünde'}\n` +
        `🔹 Fiyat: ${alert.price}\n` +
        `🔹 Tekrar: ${alert.repeat ? 'Evet' : 'Hayır'}`
      );
    } catch (error) {
      logger.error(`Alarm oluşturma hatası: ${error.message}`);
      ctx.reply('Alarm oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('alerts', async (ctx) => {
    try {
      const alerts = await alertService.getActiveAlerts(ctx.from.id);
      
      if (alerts.length === 0) {
        return ctx.reply('Aktif alarmınız bulunmuyor.');
      }

      let message = '📋 Aktif Alarmlarınız:\n\n';
      alerts.forEach((alert, index) => {
        message += `${index + 1}. Alarm\n`;
        message += `🔹 ID: ${alert._id}\n`;
        message += `🔹 Zincir: ${alert.chain}\n`;
        message += `🔹 Sembol: ${alert.symbol}\n`;
        message += `🔹 Koşul: Fiyat ${alert.type === 'ABOVE' ? 'üzerine çıktığında' : 'altına düştüğünde'}\n`;
        message += `🔹 Fiyat: ${alert.price}\n`;
        message += `🔹 Tekrar: ${alert.repeat ? 'Evet' : 'Hayır'}\n`;
        if (alert.lastTriggered) {
          message += `🔹 Son Tetiklenme: ${new Date(alert.lastTriggered).toLocaleString('tr-TR')}\n`;
        }
        message += '\n';
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Alarm listesi alma hatası: ${error.message}`);
      ctx.reply('Alarmlar alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('delalert', async (ctx) => {
    try {
      const alertId = ctx.message.text.split(' ')[1];

      if (!alertId) {
        return ctx.reply('Lütfen silinecek alarmın ID\'sini girin. Örnek: /delalert <alarm_id>');
      }

      const alert = await alertService.deleteAlert(ctx.from.id, alertId);
      ctx.reply(
        `Alarm başarıyla silindi!\n\n` +
        `🔹 Zincir: ${alert.chain}\n` +
        `🔹 Sembol: ${alert.symbol}\n` +
        `🔹 Fiyat: ${alert.price}`
      );
    } catch (error) {
      logger.error(`Alarm silme hatası: ${error.message}`);
      ctx.reply('Alarm silinirken bir hata oluştu: ' + error.message);
    }
  });
  bot.command('allalerts', async (ctx) => {
    try {
      const alerts = await alertService.getAlerts(ctx.from.id);
      
      if (alerts.length === 0) {
        return ctx.reply('Hiç alarmınız bulunmuyor.');
      }

      let message = '📋 Tüm Alarmlarınız:\n\n';
      alerts.forEach((alert, index) => {
        message += `${index + 1}. Alarm\n`;
        message += `🔹 ID: ${alert._id}\n`;
        message += `🔹 Zincir: ${alert.chain}\n`;
        message += `🔹 Sembol: ${alert.symbol}\n`;
        message += `🔹 Koşul: Fiyat ${alert.type === 'ABOVE' ? 'üzerine çıktığında' : 'altına düştüğünde'}\n`;
        message += `🔹 Fiyat: ${alert.price}\n`;
        message += `🔹 Durum: ${alert.status}\n`;
        message += `🔹 Tekrar: ${alert.repeat ? 'Evet' : 'Hayır'}\n`;
        if (alert.lastTriggered) {
          message += `🔹 Son Tetiklenme: ${new Date(alert.lastTriggered).toLocaleString('tr-TR')}\n`;
        }
        message += '\n';
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Tüm alarm listesi alma hatası: ${error.message}`);
      ctx.reply('Alarmlar alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
}

module.exports = handleAlertCommands; 