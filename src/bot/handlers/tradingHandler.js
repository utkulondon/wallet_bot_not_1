const { Markup } = require('telegraf');
const tradingService = require('../../services/TradingService');
const logger = require('../../utils/logger');

async function handleTradingCommands(bot) {
  bot.command('market', async (ctx) => {
    try {
      const [_, chain, symbol, side, amount] = ctx.message.text.split(' ');

      if (!chain || !symbol || !side || !amount) {
        return ctx.reply(
          'Lütfen tüm parametreleri girin.\n' +
          'Örnek: /market SOLANA SOL/USDT BUY 1.5'
        );
      }

      const orderData = {
        chain: chain.toUpperCase(),
        type: 'MARKET',
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        amount: parseFloat(amount)
      };

      const errors = tradingService.validateOrderData(orderData);
      if (errors.length > 0) {
        return ctx.reply(`Hata(lar):\n${errors.join('\n')}`);
      }

      const order = await tradingService.createOrder(ctx.from.id, orderData);
      ctx.reply(
        `Market emri oluşturuldu!\n\n` +
        `🔹 Zincir: ${order.chain}\n` +
        `🔹 Sembol: ${order.symbol}\n` +
        `🔹 Yön: ${order.side}\n` +
        `🔹 Miktar: ${order.amount}`
      );
    } catch (error) {
      logger.error(`Market emri oluşturma hatası: ${error.message}`);
      ctx.reply('Emir oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('limit', async (ctx) => {
    try {
      const [_, chain, symbol, side, amount, price] = ctx.message.text.split(' ');

      if (!chain || !symbol || !side || !amount || !price) {
        return ctx.reply(
          'Lütfen tüm parametreleri girin.\n' +
          'Örnek: /limit SOLANA SOL/USDT BUY 1.5 22.5'
        );
      }

      const orderData = {
        chain: chain.toUpperCase(),
        type: 'LIMIT',
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        amount: parseFloat(amount),
        price: parseFloat(price)
      };

      const errors = tradingService.validateOrderData(orderData);
      if (errors.length > 0) {
        return ctx.reply(`Hata(lar):\n${errors.join('\n')}`);
      }

      const order = await tradingService.createOrder(ctx.from.id, orderData);
      ctx.reply(
        `Limit emri oluşturuldu!\n\n` +
        `🔹 Zincir: ${order.chain}\n` +
        `🔹 Sembol: ${order.symbol}\n` +
        `🔹 Yön: ${order.side}\n` +
        `🔹 Miktar: ${order.amount}\n` +
        `🔹 Fiyat: ${order.price}`
      );
    } catch (error) {
      logger.error(`Limit emri oluşturma hatası: ${error.message}`);
      ctx.reply('Emir oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('stoploss', async (ctx) => {
    try {
      const [_, chain, symbol, side, amount, stopPrice, price] = ctx.message.text.split(' ');

      if (!chain || !symbol || !side || !amount || !stopPrice || !price) {
        return ctx.reply(
          'Lütfen tüm parametreleri girin.\n' +
          'Örnek: /stoploss SOLANA SOL/USDT SELL 1.5 21.0 20.5'
        );
      }

      const orderData = {
        chain: chain.toUpperCase(),
        type: 'STOP_LOSS',
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        amount: parseFloat(amount),
        stopPrice: parseFloat(stopPrice),
        price: parseFloat(price)
      };

      const errors = tradingService.validateOrderData(orderData);
      if (errors.length > 0) {
        return ctx.reply(`Hata(lar):\n${errors.join('\n')}`);
      }

      const order = await tradingService.createOrder(ctx.from.id, orderData);
      ctx.reply(
        `Stop-Loss emri oluşturuldu!\n\n` +
        `🔹 Zincir: ${order.chain}\n` +
        `🔹 Sembol: ${order.symbol}\n` +
        `🔹 Yön: ${order.side}\n` +
        `🔹 Miktar: ${order.amount}\n` +
        `🔹 Stop Fiyatı: ${order.stopPrice}\n` +
        `🔹 Limit Fiyatı: ${order.price}`
      );
    } catch (error) {
      logger.error(`Stop-Loss emri oluşturma hatası: ${error.message}`);
      ctx.reply('Emir oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('orders', async (ctx) => {
    try {
      const orders = await tradingService.getActiveOrders(ctx.from.id);
      
      if (orders.length === 0) {
        return ctx.reply('Aktif emiriniz bulunmuyor.');
      }

      let message = '📋 Aktif Emirleriniz:\n\n';
      orders.forEach((order, index) => {
        message += `${index + 1}. Emir\n`;
        message += `🔹 ID: ${order._id}\n`;
        message += `🔹 Zincir: ${order.chain}\n`;
        message += `🔹 Tip: ${order.type}\n`;
        message += `🔹 Sembol: ${order.symbol}\n`;
        message += `🔹 Yön: ${order.side}\n`;
        message += `🔹 Miktar: ${order.amount}\n`;
        if (order.price) message += `🔹 Fiyat: ${order.price}\n`;
        if (order.stopPrice) message += `🔹 Stop Fiyatı: ${order.stopPrice}\n`;
        message += `🔹 Durum: ${order.status}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Emir listesi alma hatası: ${error.message}`);
      ctx.reply('Emirler alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.command('cancel', async (ctx) => {
    try {
      const orderId = ctx.message.text.split(' ')[1];

      if (!orderId) {
        return ctx.reply('Lütfen iptal edilecek emrin ID\'sini girin. Örnek: /cancel <emir_id>');
      }

      const order = await tradingService.cancelOrder(ctx.from.id, orderId);
      ctx.reply(
        `Emir başarıyla iptal edildi!\n\n` +
        `🔹 ID: ${order._id}\n` +
        `🔹 Zincir: ${order.chain}\n` +
        `🔹 Sembol: ${order.symbol}\n` +
        `🔹 Tip: ${order.type}\n` +
        `🔹 Durum: ${order.status}`
      );
    } catch (error) {
      logger.error(`Emir iptal hatası: ${error.message}`);
      ctx.reply('Emir iptal edilirken bir hata oluştu: ' + error.message);
    }
  });
  bot.command('history', async (ctx) => {
    try {
      const orders = await tradingService.getOrderHistory(ctx.from.id);
      
      if (orders.length === 0) {
        return ctx.reply('Emir geçmişiniz bulunmuyor.');
      }

      let message = '📋 Emir Geçmişiniz:\n\n';
      orders.forEach((order, index) => {
        message += `${index + 1}. Emir\n`;
        message += `🔹 Zincir: ${order.chain}\n`;
        message += `🔹 Tip: ${order.type}\n`;
        message += `🔹 Sembol: ${order.symbol}\n`;
        message += `🔹 Yön: ${order.side}\n`;
        message += `🔹 Miktar: ${order.amount}\n`;
        if (order.filledPrice) message += `🔹 Gerçekleşme Fiyatı: ${order.filledPrice}\n`;
        message += `🔹 Durum: ${order.status}\n`;
        message += `🔹 Tarih: ${new Date(order.updatedAt).toLocaleString('tr-TR')}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Emir geçmişi alma hatası: ${error.message}`);
      ctx.reply('Emir geçmişi alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
}

module.exports = handleTradingCommands; 