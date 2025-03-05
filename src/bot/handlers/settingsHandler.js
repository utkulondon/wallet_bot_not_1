const { Markup } = require('telegraf');
const settingsService = require('../../services/SettingsService');
const logger = require('../../utils/logger');

async function handleSettingsCommands(bot) {
  bot.command('settings', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      
      const message = `⚙️ Ayarlar\n\n` +
        `🔔 Bildirimler:\n` +
        `  • Fiyat Alarmları: ${settings.notifications.priceAlerts ? '✅' : '❌'}\n` +
        `  • İşlem Güncellemeleri: ${settings.notifications.tradeUpdates ? '✅' : '❌'}\n` +
        `  • Piyasa Haberleri: ${settings.notifications.marketNews ? '✅' : '❌'}\n\n` +
        `🌍 Genel:\n` +
        `  • Dil: ${settings.language === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}\n` +
        `  • Saat Dilimi: ${settings.timezone}\n` +
        `  • Varsayılan Blockchain: ${settings.defaultChain}\n\n` +
        `💱 Trading Varsayılanları:\n` +
        `  • Slippage Toleransı: ${settings.tradingDefaults.slippageTolerance}%\n` +
        `  • Varsayılan Emir Tipi: ${settings.tradingDefaults.defaultOrderType}`;

      ctx.reply(message, Markup.inlineKeyboard([
        [Markup.button.callback('🔔 Bildirim Ayarları', 'settings_notifications')],
        [Markup.button.callback('🌍 Genel Ayarlar', 'settings_general')],
        [Markup.button.callback('💱 Trading Ayarları', 'settings_trading')]
      ]));
    } catch (error) {
      logger.error(`Ayarlar menüsü hatası: ${error.message}`);
      ctx.reply('Ayarlar menüsü açılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.action('settings_notifications', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      
      ctx.editMessageText(
        `🔔 Bildirim Ayarları\n\n` +
        `Mevcut Ayarlar:\n` +
        `• Fiyat Alarmları: ${settings.notifications.priceAlerts ? '✅' : '❌'}\n` +
        `• İşlem Güncellemeleri: ${settings.notifications.tradeUpdates ? '✅' : '❌'}\n` +
        `• Piyasa Haberleri: ${settings.notifications.marketNews ? '✅' : '❌'}\n\n` +
        `Değiştirmek istediğiniz ayarı seçin:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              `Fiyat Alarmları ${settings.notifications.priceAlerts ? '✅' : '❌'}`,
              'toggle_price_alerts'
            )
          ],
          [
            Markup.button.callback(
              `İşlem Güncellemeleri ${settings.notifications.tradeUpdates ? '✅' : '❌'}`,
              'toggle_trade_updates'
            )
          ],
          [
            Markup.button.callback(
              `Piyasa Haberleri ${settings.notifications.marketNews ? '✅' : '❌'}`,
              'toggle_market_news'
            )
          ],
          [Markup.button.callback('⬅️ Geri', 'back_to_settings')]
        ])
      );
    } catch (error) {
      logger.error(`Bildirim ayarları menüsü hatası: ${error.message}`);
      ctx.reply('Bildirim ayarları açılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.action('settings_trading', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      
      ctx.editMessageText(
        `💱 Trading Ayarları\n\n` +
        `Mevcut Ayarlar:\n` +
        `• Slippage Toleransı: ${settings.tradingDefaults.slippageTolerance}%\n` +
        `• Varsayılan Emir Tipi: ${settings.tradingDefaults.defaultOrderType}\n\n` +
        `Değiştirmek için komutu kullanın:\n` +
        `/setslippage <0.1-5.0> - Slippage toleransını ayarla\n` +
        `/setordertype MARKET|LIMIT - Varsayılan emir tipini ayarla`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Geri', 'back_to_settings')]
        ])
      );
    } catch (error) {
      logger.error(`Trading ayarları menüsü hatası: ${error.message}`);
      ctx.reply('Trading ayarları açılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.action('settings_general', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      
      ctx.editMessageText(
        `🌍 Genel Ayarlar\n\n` +
        `Mevcut Ayarlar:\n` +
        `• Dil: ${settings.language === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}\n` +
        `• Varsayılan Blockchain: ${settings.defaultChain}\n\n` +
        `Değiştirmek için komutu kullanın:\n` +
        `/setlang tr|en - Dili değiştir\n` +
        `/setchain SOLANA|TON - Varsayılan blockchain'i ayarla`,
        Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Geri', 'back_to_settings')]
        ])
      );
    } catch (error) {
      logger.error(`Genel ayarlar menüsü hatası: ${error.message}`);
      ctx.reply('Genel ayarlar açılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  });
  bot.action('toggle_price_alerts', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      await settingsService.updateNotificationSettings(ctx.from.id, {
        priceAlerts: !settings.notifications.priceAlerts
      });
      ctx.answerCbQuery('Fiyat alarmları ayarı güncellendi');
      ctx.dispatch('settings_notifications');
    } catch (error) {
      logger.error(`Bildirim ayarı güncelleme hatası: ${error.message}`);
      ctx.answerCbQuery('Ayar güncellenirken bir hata oluştu');
    }
  });

  bot.action('toggle_trade_updates', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      await settingsService.updateNotificationSettings(ctx.from.id, {
        tradeUpdates: !settings.notifications.tradeUpdates
      });
      ctx.answerCbQuery('İşlem güncellemeleri ayarı güncellendi');
      ctx.dispatch('settings_notifications');
    } catch (error) {
      logger.error(`Bildirim ayarı güncelleme hatası: ${error.message}`);
      ctx.answerCbQuery('Ayar güncellenirken bir hata oluştu');
    }
  });

  bot.action('toggle_market_news', async (ctx) => {
    try {
      const settings = await settingsService.getSettings(ctx.from.id);
      await settingsService.updateNotificationSettings(ctx.from.id, {
        marketNews: !settings.notifications.marketNews
      });
      ctx.answerCbQuery('Piyasa haberleri ayarı güncellendi');
      ctx.dispatch('settings_notifications');
    } catch (error) {
      logger.error(`Bildirim ayarı güncelleme hatası: ${error.message}`);
      ctx.answerCbQuery('Ayar güncellenirken bir hata oluştu');
    }
  });
  bot.action('back_to_settings', (ctx) => {
    ctx.dispatch('settings');
  });
  bot.command('setlang', async (ctx) => {
    try {
      const lang = ctx.message.text.split(' ')[1];
      
      if (!lang || !['tr', 'en'].includes(lang)) {
        return ctx.reply('Geçersiz dil. Kullanım: /setlang tr|en');
      }

      await settingsService.updateSettings(ctx.from.id, { language: lang });
      ctx.reply(`✅ Dil ${lang === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'} olarak ayarlandı.`);
    } catch (error) {
      logger.error(`Dil ayarı güncelleme hatası: ${error.message}`);
      ctx.reply('Dil ayarı güncellenirken bir hata oluştu.');
    }
  });

  bot.command('setchain', async (ctx) => {
    try {
      const chain = ctx.message.text.split(' ')[1];
      
      if (!chain || !['SOLANA', 'TON'].includes(chain)) {
        return ctx.reply('Geçersiz blockchain. Kullanım: /setchain SOLANA|TON');
      }

      await settingsService.updateSettings(ctx.from.id, { defaultChain: chain });
      ctx.reply(`✅ Varsayılan blockchain ${chain} olarak ayarlandı.`);
    } catch (error) {
      logger.error(`Blockchain ayarı güncelleme hatası: ${error.message}`);
      ctx.reply('Blockchain ayarı güncellenirken bir hata oluştu.');
    }
  });

  bot.command('setslippage', async (ctx) => {
    try {
      const slippage = parseFloat(ctx.message.text.split(' ')[1]);
      
      if (isNaN(slippage) || slippage < 0.1 || slippage > 5) {
        return ctx.reply('Geçersiz slippage değeri. Kullanım: /setslippage <0.1-5.0>');
      }

      await settingsService.updateTradingDefaults(ctx.from.id, {
        slippageTolerance: slippage
      });
      ctx.reply(`✅ Slippage toleransı ${slippage}% olarak ayarlandı.`);
    } catch (error) {
      logger.error(`Slippage ayarı güncelleme hatası: ${error.message}`);
      ctx.reply('Slippage ayarı güncellenirken bir hata oluştu.');
    }
  });

  bot.command('setordertype', async (ctx) => {
    try {
      const orderType = ctx.message.text.split(' ')[1];
      
      if (!orderType || !['MARKET', 'LIMIT'].includes(orderType)) {
        return ctx.reply('Geçersiz emir tipi. Kullanım: /setordertype MARKET|LIMIT');
      }

      await settingsService.updateTradingDefaults(ctx.from.id, {
        defaultOrderType: orderType
      });
      ctx.reply(`✅ Varsayılan emir tipi ${orderType} olarak ayarlandı.`);
    } catch (error) {
      logger.error(`Emir tipi ayarı güncelleme hatası: ${error.message}`);
      ctx.reply('Emir tipi ayarı güncellenirken bir hata oluştu.');
    }
  });
}

module.exports = handleSettingsCommands; 