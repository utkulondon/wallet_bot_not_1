const { Markup } = require('telegraf');
const priceService = require('../services/PriceService');
const logger = require('./logger');

async function showMainMenu(ctx, user) {
  try {
    const network = global.userNetwork[ctx.from.id];
    const price = await priceService.getPrice(network === 'SOLANA' ? 'SOL/USDT' : 'TON/USDT');
    const wallet = network === 'SOLANA' ? user.solanaCüzdan : user.tonCüzdan;
    const balance = wallet?.balance || 0;
    const symbol = network === 'SOLANA' ? 'SOL' : 'TON';

    const message = `<b>📱 Telegram Trading Bot</b>\n\n` +
      `<b>💰 Current Price:</b>\n` +
      `<b>${network === 'SOLANA' ? '🌟' : '💎'} ${symbol}:</b> <code>$${price}</code>\n\n` +
      `<b>— Your Wallet —</b>\n\n` +
      `<b>Wallet:</b> <code>${network === 'SOLANA' ? wallet?.publicKey : wallet?.address}</code>\n` +
      `<b>Balance:</b> <code>${balance} ${symbol}</code>\n` +
      `<b>Value:</b> <code>$${(balance * price).toFixed(2)}</code>`;

    const mainMenuButtons = [
      [
        Markup.button.callback('Al', 'action_buy'),
        Markup.button.callback('Sat', 'action_sell')
      ],
      [
        Markup.button.callback('Pozisyonlar', 'show_positions'),
        Markup.button.callback('Limit Emirleri', 'show_limit_orders'),
        Markup.button.callback('DCA Emirleri', 'show_dca_orders')
      ],
      [
        Markup.button.callback('Copy Trade', 'copy_trade')
      ],
      [
        Markup.button.callback('Referanslar', 'show_referrals'),
        Markup.button.callback('Çek', 'action_withdraw')
      ],
      [
        Markup.button.callback('Ayarlar', 'show_settings'),
        Markup.button.callback('Yenile', 'refresh_data')
      ],
      [
        Markup.button.callback('🔐 Private Key', 'show_private_key')
      ]
    ];

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(mainMenuButtons)
    });
  } catch (error) {
    logger.error(`Ana menü gösterme hatası: ${error.message}`);
    ctx.reply('Ana menü gösterilirken bir hata oluştu.');
  }
}

module.exports = { showMainMenu }; 