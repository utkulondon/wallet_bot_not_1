const { Markup } = require('telegraf');
const tonService = require('../../chains/ton/TonService');
const User = require('../../models/User');
const logger = require('../../utils/logger');

async function handleTonCommands(bot) {
  bot.command('tonbalance', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.tonAddress) {
        return ctx.reply('Önce TON cüzdanınızı kaydetmelisiniz. /addton <cüzdan_adresi> komutunu kullanın.');
      }

      const balance = await tonService.getBalance(user.tonAddress);
      ctx.reply(`TON Bakiyeniz: ${balance} TON`);
    } catch (error) {
      logger.error(`TON bakiye sorgulama hatası: ${error.message}`);
      ctx.reply('Bakiye sorgulanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('addton', async (ctx) => {
    try {
      const address = ctx.message.text.split(' ')[1];
      
      if (!address) {
        return ctx.reply('Lütfen TON cüzdan adresinizi girin. Örnek: /addton <cüzdan_adresi>');
      }

      if (!tonService.validateAddress(address)) {
        return ctx.reply('Geçersiz TON cüzdan adresi.');
      }

      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { 
          $set: { tonAddress: address },
          $setOnInsert: { telegramId: ctx.from.id }
        },
        { upsert: true }
      );

      ctx.reply('TON cüzdanınız başarıyla kaydedildi! 🎉');
    } catch (error) {
      logger.error(`TON cüzdan ekleme hatası: ${error.message}`);
      ctx.reply('Cüzdan eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('tontx', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.tonAddress) {
        return ctx.reply('Önce TON cüzdanınızı kaydetmelisiniz. /addton <cüzdan_adresi> komutunu kullanın.');
      }

      const transactions = await tonService.getTransactionHistory(user.tonAddress);
      
      if (transactions.length === 0) {
        return ctx.reply('Henüz işlem geçmişi bulunmuyor.');
      }

      let message = 'Son İşlemleriniz:\n\n';
      transactions.forEach((tx, index) => {
        message += `${index + 1}. İşlem\n`;
        message += `📝 Hash: ${tx.hash.slice(0, 8)}...\n`;
        message += `⏰ Tarih: ${new Date(tx.timestamp * 1000).toLocaleString('tr-TR')}\n`;
        message += `💰 Miktar: ${tx.amount} TON\n`;
        message += `📥 Tür: ${tx.type}\n`;
        message += `✅ Durum: ${tx.status}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`TON işlem geçmişi sorgulama hatası: ${error.message}`);
      ctx.reply('İşlem geçmişi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
}

module.exports = handleTonCommands; 