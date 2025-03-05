const { Markup } = require('telegraf');
const priceService = require('../../services/PriceService');
const logger = require('../../utils/logger');

async function handlePriceCommands(bot) {
  bot.command('price', async (ctx) => {
    try {
      const symbol = ctx.message.text.split(' ')[1];

      if (!symbol) {
        return ctx.reply(
          'Lütfen bir token çifti girin.\n' +
          'Örnek: /price SOL/USDT'
        );
      }

      const price = await priceService.getPrice(symbol);
      ctx.reply(`💰 ${symbol} Fiyat: $${price}`);
    } catch (error) {
      logger.error(`Fiyat sorgulama hatası: ${error.message}`);
      ctx.reply('Fiyat bilgisi alınırken bir hata oluştu: ' + error.message);
    }
  });
  bot.command('market', async (ctx) => {
    try {
      const symbol = ctx.message.text.split(' ')[1];

      if (!symbol) {
        return ctx.reply(
          'Lütfen bir token çifti girin.\n' +
          'Örnek: /market SOL/USDT'
        );
      }

      const data = await priceService.getMarketData(symbol);
      
      const message = `📊 ${symbol} Market Bilgisi\n\n` +
        `💰 Fiyat: $${data.currentPrice}\n` +
        `📈 24s Değişim: ${data.priceChange24h.toFixed(2)}%\n` +
        `💎 Market Değeri: $${(data.marketCap / 1e6).toFixed(2)}M\n` +
        `📊 24s Hacim: $${(data.volume24h / 1e6).toFixed(2)}M\n` +
        `⬆️ 24s En Yüksek: $${data.high24h}\n` +
        `⬇️ 24s En Düşük: $${data.low24h}\n` +
        `🕒 Son Güncelleme: ${new Date(data.lastUpdated).toLocaleString('tr-TR')}`;

      ctx.reply(message);
    } catch (error) {
      logger.error(`Market bilgisi sorgulama hatası: ${error.message}`);
      ctx.reply('Market bilgisi alınırken bir hata oluştu: ' + error.message);
    }
  });
  bot.command('pairs', async (ctx) => {
    try {
      const pairs = Object.keys(priceService.tokenIds);
      const message = '📊 Desteklenen Token Çiftleri:\n\n' +
        pairs.map((pair, index) => `${index + 1}. ${pair}`).join('\n');

      ctx.reply(message);
    } catch (error) {
      logger.error(`Token çiftleri listeleme hatası: ${error.message}`);
      ctx.reply('Token çiftleri listelenirken bir hata oluştu.');
    }
  });
}

module.exports = handlePriceCommands; 