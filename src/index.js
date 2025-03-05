require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const EventEmitter = require('events');
const http = require('http');
const handleSolanaCommands = require('./bot/handlers/solanaHandler');
const handleTonCommands = require('./bot/handlers/tonHandler');
const handleTradingCommands = require('./bot/handlers/tradingHandler');
const handleAlertCommands = require('./bot/handlers/alertHandler');
const handlePriceCommands = require('./bot/handlers/priceHandler');
const handleSettingsCommands = require('./bot/handlers/settingsHandler');
const handleButtons = require('./bot/handlers/buttonHandler');
const solanaService = require('./chains/solana/SolanaService');
const tonService = require('./chains/ton/TonService');
const priceService = require('./services/PriceService');
const alertService = require('./services/AlertService');
const tradingService = require('./services/TradingService');
const settingsService = require('./services/SettingsService');
const walletService = require('./services/WalletService');
const logger = require('./utils/logger');
const User = require('./models/User');
const { showMainMenu } = require('./utils/menuHelper');

// Render için minimal HTTP sunucusu
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Wallet Bot aktif');
}).listen(PORT, () => {
  logger.info(`HTTP sunucusu ${PORT} portunda başlatıldı`);
});

global.eventEmitter = new EventEmitter();
global.privateKeys = new Map();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('MongoDB\'ye başarıyla bağlanıldı'))
  .catch(err => logger.error('MongoDB bağlantı hatası:', err));
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.command('start', async (ctx) => {
  try {
    await ctx.reply(
      '🌟 Hoş Geldiniz!\n\nLütfen işlem yapmak istediğiniz ağı seçin:',
      Markup.keyboard([
        ['🌟 Solana (SOL)', '💎 TON']
      ])
      .resize()
    );
  } catch (error) {
    logger.error(`Start komutu hatası: ${error.message}`);
    ctx.reply('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
  }
});
bot.hears('🌟 Solana (SOL)', async (ctx) => {
  try {
    await ctx.reply('Solana ağı seçildi...', { reply_markup: { remove_keyboard: true } });
    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        username: ctx.from.username
      });
      await user.save();
    }
    global.userNetwork = global.userNetwork || {};
    global.userNetwork[ctx.from.id] = 'SOLANA';
    let wallet;
    if (!user.solanaCüzdan?.publicKey) {
      wallet = await walletService.createSolanaWallet(ctx.from.id);
      user = await User.findOne({ telegramId: ctx.from.id }); // Güncel kullanıcı bilgisini al
    }
    const solPrice = await priceService.getPrice('SOL/USDT');
    const message = `<b>📱 Telegram Trading Bot</b>\n\n` +
      `<b>💰 Current Price:</b>\n` +
      `<b>🌟 SOL:</b> <code>$${solPrice}</code>\n\n` +
      `<b>— Your Wallet —</b>\n\n` +
      `<b>Wallet:</b> <code>${user.solanaCüzdan.publicKey}</code>\n` +
      `<b>Balance:</b> <code>${user.solanaCüzdan.balance || '0'} SOL</code>`;
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
    logger.error(`Solana seçim hatası: ${error.message}`);
    ctx.reply('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
  }
});
bot.hears('💎 TON', async (ctx) => {
  try {
    await ctx.reply('TON ağı seçildi...', { reply_markup: { remove_keyboard: true } });
    let user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        username: ctx.from.username
      });
      await user.save();
    }
    global.userNetwork = global.userNetwork || {};
    global.userNetwork[ctx.from.id] = 'TON';
    if (!user.tonCüzdan?.address) {
      await walletService.createTonWallet(ctx.from.id);
      user = await User.findOne({ telegramId: ctx.from.id }); // Güncel kullanıcı bilgisini al
    }
    await showMainMenu(ctx, user);
  } catch (error) {
    logger.error(`TON ağı seçme hatası: ${error.message}`);
    ctx.reply('Bir hata oluştu, lütfen tekrar deneyin.');
  }
});
bot.action('refresh_data', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    await showMainMenu(ctx, user);
  } catch (error) {
    logger.error(`Yenileme hatası: ${error.message}`);
    ctx.reply('Veriler yenilenirken bir hata oluştu.');
  }
});
bot.action('show_private_key', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const network = global.userNetwork[ctx.from.id];

    if (network === 'TON') {
      const message = `🔐 TON Cüzdan Bilgileriniz:\n\n` +
        `📍 Adres:\n<code>${user.tonCüzdan.address}</code>\n\n` +
        `🔑 24 Kelimelik Gizli Anahtar:\n<code>${user.tonCüzdan.mnemonic}</code>\n\n` +
        `⚠️ DİKKAT: Bu bilgileri güvenli bir yerde saklayın ve kimseyle paylaşmayın!`;

      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Ana Menü', 'back_to_menu')]
        ])
      });
    }
  } catch (error) {
    logger.error(`Private key gösterme hatası: ${error.message}`);
    ctx.reply('Private key gösterilirken bir hata oluştu.');
  }
});
bot.hears('🔄 Ağ Değiştir', (ctx) => {
  ctx.reply('Lütfen işlem yapmak istediğiniz ağı seçin:', 
    Markup.keyboard([
      ['🌟 Solana (SOL)', '💎 TON']
    ])
    .resize()
  );
});
bot.hears('💰 Cüzdan', (ctx) => {
  const network = global.userNetwork[ctx.from.id];
  if (network === 'SOLANA') {
    ctx.reply('Solana Cüzdan İşlemleri:', 
      Markup.inlineKeyboard([
        [Markup.button.callback('💳 Cüzdan Adresim', 'sol_address')],
        [Markup.button.callback('🔑 Private Key Göster', 'sol_private_key')],
        [Markup.button.callback('💰 Bakiye Göster', 'sol_balance')],
        [Markup.button.callback('📝 İşlem Geçmişi', 'sol_tx')]
      ])
    );
  } else {
    ctx.reply('TON Cüzdan İşlemleri:', 
      Markup.inlineKeyboard([
        [Markup.button.callback('💳 Cüzdan Adresim', 'ton_address')],
        [Markup.button.callback('🔑 Private Key Göster', 'ton_private_key')],
        [Markup.button.callback('💰 Bakiye Göster', 'ton_balance')],
        [Markup.button.callback('📝 İşlem Geçmişi', 'ton_tx')]
      ])
    );
  }
});

bot.hears('📊 Fiyatlar', (ctx) => {
  const network = global.userNetwork[ctx.from.id];
  if (network === 'SOLANA') {
    ctx.reply('Solana Fiyat İşlemleri:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💰 SOL/USDT', 'price_sol')],
        [Markup.button.callback('📊 SOL Detay', 'market_sol')],
        [Markup.button.callback('📋 Desteklenen Çiftler', 'pairs')]
      ])
    );
  } else {
    ctx.reply('TON Fiyat İşlemleri:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💰 TON/USDT', 'price_ton')],
        [Markup.button.callback('📊 TON Detay', 'market_ton')],
        [Markup.button.callback('📋 Desteklenen Çiftler', 'pairs')]
      ])
    );
  }
});

bot.hears('💱 Trading', (ctx) => {
  const network = global.userNetwork[ctx.from.id];
  const networkName = network === 'SOLANA' ? 'Solana' : 'TON';
  ctx.reply(`${networkName} Trading İşlemleri:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('📈 Market Emri', 'new_market'),
        Markup.button.callback('📉 Limit Emri', 'new_limit')
      ],
      [
        Markup.button.callback('🛑 Stop-Loss', 'new_stoploss'),
        Markup.button.callback('📋 Aktif Emirler', 'active_orders')
      ],
      [
        Markup.button.callback('❌ Emir İptal', 'cancel_order'),
        Markup.button.callback('📜 Emir Geçmişi', 'order_history')
      ]
    ])
  );
});

bot.hears('🔔 Alarmlar', (ctx) => {
  ctx.reply('Alarm İşlemleri:',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Yeni Alarm', 'new_alert'),
        Markup.button.callback('🔔 Aktif Alarmlar', 'active_alerts')
      ],
      [
        Markup.button.callback('📋 Tüm Alarmlar', 'all_alerts'),
        Markup.button.callback('❌ Alarm Sil', 'delete_alert')
      ]
    ])
  );
});

bot.hears('⚙️ Ayarlar', (ctx) => {
  ctx.reply('Ayarlar:',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('🔔 Bildirimler', 'settings_notifications'),
        Markup.button.callback('🌍 Genel', 'settings_general')
      ],
      [
        Markup.button.callback('💱 Trading', 'settings_trading')
      ]
    ])
  );
});

bot.hears('❓ Yardım', (ctx) => {
  ctx.reply(`Mevcut komutlar:

Solana Komutları:
/addsolana - Solana cüzdanı ekle
/solbalance - Solana bakiyesi görüntüle
/soltx - Solana işlem geçmişi

TON Komutları:
/addton - TON cüzdanı ekle
/tonbalance - TON bakiyesi görüntüle
/tontx - TON işlem geçmişi

Trading Komutları:
/market - Market emri oluştur
/limit - Limit emri oluştur
/stoploss - Stop-Loss emri oluştur
/orders - Aktif emirleri listele
/cancel - Emir iptal et
/history - Emir geçmişini görüntüle

Fiyat Komutları:
/price - Token fiyatını görüntüle
/market - Detaylı market bilgisi
/pairs - Desteklenen token çiftleri

Alarm Komutları:
/setalert - Fiyat alarmı oluştur
/alerts - Aktif alarmları listele
/allalerts - Tüm alarmları listele
/delalert - Alarm sil

Ayarlar Komutları:
/settings - Ayarlar menüsünü aç
/setlang - Dil ayarı
/setchain - Varsayılan blockchain
/setslippage - Slippage toleransı
/setordertype - Varsayılan emir tipi`);
});
handleSolanaCommands(bot);
handleTonCommands(bot);
handleTradingCommands(bot);
handleAlertCommands(bot);
handlePriceCommands(bot);
handleSettingsCommands(bot);
handleButtons(bot);
global.eventEmitter.on('priceUpdate', async (symbol, price) => {
  try {
    await alertService.checkPrice(symbol, price);
  } catch (error) {
    logger.error(`Fiyat güncelleme işleme hatası: ${error.message}`);
  }
});
global.eventEmitter.on('sendTelegramMessage', async (userId, message) => {
  try {
    await bot.telegram.sendMessage(userId, message);
    logger.info(`Telegram bildirimi gönderildi: ${userId}`);
  } catch (error) {
    logger.error(`Telegram mesaj gönderme hatası: ${error.message}`);
  }
});
priceService.startPriceMonitoring();
bot.catch((err, ctx) => {
  logger.error(`Bot hatası: ${err}`);
  ctx.reply('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
});
bot.launch()
  .then(() => logger.info('Bot başarıyla başlatıldı'))
  .catch(err => logger.error('Bot başlatma hatası:', err));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { showMainMenu }; 