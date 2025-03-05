const { Markup } = require('telegraf');
const solanaService = require('../../chains/solana/SolanaService');
const User = require('../../models/User');
const logger = require('../../utils/logger');

async function handleSolanaCommands(bot) {
  bot.command('solbalance', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.solanaPubKey) {
        return ctx.reply('Önce Solana cüzdanınızı kaydetmelisiniz. /addsolana <cüzdan_adresi> komutunu kullanın.');
      }

      const balance = await solanaService.getBalance(user.solanaPubKey);
      ctx.reply(`Solana Bakiyeniz: ${balance} SOL`);
    } catch (error) {
      logger.error(`Solana bakiye sorgulama hatası: ${error.message}`);
      ctx.reply('Bakiye sorgulanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('addsolana', async (ctx) => {
    try {
      const address = ctx.message.text.split(' ')[1];
      
      if (!address) {
        return ctx.reply('Lütfen Solana cüzdan adresinizi girin. Örnek: /addsolana <cüzdan_adresi>');
      }

      if (!solanaService.validateAddress(address)) {
        return ctx.reply('Geçersiz Solana cüzdan adresi.');
      }

      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { 
          $set: { solanaPubKey: address },
          $setOnInsert: { telegramId: ctx.from.id }
        },
        { upsert: true }
      );

      ctx.reply('Solana cüzdanınız başarıyla kaydedildi! 🎉');
    } catch (error) {
      logger.error(`Solana cüzdan ekleme hatası: ${error.message}`);
      ctx.reply('Cüzdan eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('soltx', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.solanaPubKey) {
        return ctx.reply('Önce Solana cüzdanınızı kaydetmelisiniz. /addsolana <cüzdan_adresi> komutunu kullanın.');
      }

      const transactions = await solanaService.getTransactionHistory(user.solanaPubKey);
      
      if (transactions.length === 0) {
        return ctx.reply('Henüz işlem geçmişi bulunmuyor.');
      }

      let message = 'Son İşlemleriniz:\n\n';
      transactions.forEach((tx, index) => {
        message += `${index + 1}. İşlem\n`;
        message += `📝 İmza: ${tx.signature.slice(0, 8)}...\n`;
        message += `⏰ Tarih: ${new Date(tx.timestamp * 1000).toLocaleString('tr-TR')}\n`;
        message += `💰 Miktar: ${tx.amount / 1e9} SOL\n`;
        message += `✅ Durum: ${tx.status}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Solana işlem geçmişi sorgulama hatası: ${error.message}`);
      ctx.reply('İşlem geçmişi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
}

module.exports = handleSolanaCommands; 