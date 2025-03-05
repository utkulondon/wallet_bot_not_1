const { Markup } = require('telegraf');
const solanaService = require('../../chains/solana/SolanaService');
const tonService = require('../../chains/ton/TonService');
const priceService = require('../../services/PriceService');
const alertService = require('../../services/AlertService');
const tradingService = require('../../services/TradingService');
const settingsService = require('../../services/SettingsService');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const walletService = require('../../services/WalletService');
const { showMainMenu } = require('../../utils/menuHelper');
const tonConnectService = require('../../services/TonConnectService');

async function handleButtons(bot) {
  bot.action('add_solana', (ctx) => {
    ctx.reply('Solana cüzdan adresinizi girin:', 
      Markup.forceReply().selective()
    );
  });

  bot.action('add_ton', (ctx) => {
    ctx.reply('TON cüzdan adresinizi girin:', 
      Markup.forceReply().selective()
    );
  });

  bot.action('sol_balance', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.solanaPubKey) {
        return ctx.reply('Önce Solana cüzdanınızı kaydetmelisiniz.');
      }

      const balance = await solanaService.getBalance(user.solanaPubKey);
      ctx.reply(`Solana Bakiyeniz: ${balance} SOL`);
    } catch (error) {
      logger.error(`Solana bakiye sorgulama hatası: ${error.message}`);
      ctx.reply('Bakiye sorgulanırken bir hata oluştu.');
    }
  });

  bot.action('ton_balance', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || !user.tonAddress) {
        return ctx.reply('Önce TON cüzdanınızı kaydetmelisiniz.');
      }

      const balance = await tonService.getBalance(user.tonAddress);
      ctx.reply(`TON Bakiyeniz: ${balance} TON`);
    } catch (error) {
      logger.error(`TON bakiye sorgulama hatası: ${error.message}`);
      ctx.reply('Bakiye sorgulanırken bir hata oluştu.');
    }
  });

  bot.action('sol_address', async (ctx) => {
    try {
      const wallet = await walletService.getWalletInfo(ctx.from.id, 'SOLANA');
      ctx.reply(
        `💳 Solana Cüzdan Bilgileriniz:\n\n` +
        `📍 Public Key:\n${wallet.publicKey}\n\n` +
        `🔑 Private Key:\n${wallet.privateKey}\n\n` +
        `⚠️ DİKKAT: Private Key'inizi güvenli bir yerde saklayın!`
      );
    } catch (error) {
      logger.error(`Solana adres görüntüleme hatası: ${error.message}`);
      ctx.reply('Cüzdan bilgileri alınırken bir hata oluştu.');
    }
  });

  bot.action('ton_address', async (ctx) => {
    try {
      const wallet = await walletService.getWalletInfo(ctx.from.id, 'TON');
      ctx.reply(
        `💳 TON Cüzdan Bilgileriniz:\n\n` +
        `📍 Adres:\n${wallet.address}\n\n` +
        `🔑 24 Kelimelik Gizli Anahtar:\n${wallet.mnemonic}\n\n` +
        `⚠️ DİKKAT: Bu 24 kelimeyi güvenli bir yerde saklayın! TON Keeper'a bu kelimeleri kullanarak cüzdanınızı aktarabilirsiniz.`
      );
    } catch (error) {
      logger.error(`TON adres görüntüleme hatası: ${error.message}`);
      ctx.reply('Cüzdan bilgileri alınırken bir hata oluştu.');
    }
  });
  bot.action('price_sol', async (ctx) => {
    try {
      const price = await priceService.getPrice('SOL/USDT');
      ctx.reply(`💰 SOL/USDT Fiyat: $${price}`);
    } catch (error) {
      logger.error(`Fiyat sorgulama hatası: ${error.message}`);
      ctx.reply('Fiyat bilgisi alınırken bir hata oluştu.');
    }
  });

  bot.action('price_ton', async (ctx) => {
    try {
      const price = await priceService.getPrice('TON/USDT');
      ctx.reply(`💰 TON/USDT Fiyat: $${price}`);
    } catch (error) {
      logger.error(`Fiyat sorgulama hatası: ${error.message}`);
      ctx.reply('Fiyat bilgisi alınırken bir hata oluştu.');
    }
  });
  bot.action('new_market', (ctx) => {
    const network = global.userNetwork[ctx.from.id];
    const symbol = network === 'SOLANA' ? 'SOL/USDT' : 'TON/USDT';
    ctx.reply(`Market Emri Oluştur (${network})\n\nLütfen işlem detaylarını girin:\n1. İşlem Yönü (BUY/SELL)\n2. Miktar`,
      Markup.forceReply().selective()
    );
  });

  bot.action('new_limit', (ctx) => {
    const network = global.userNetwork[ctx.from.id];
    const symbol = network === 'SOLANA' ? 'SOL/USDT' : 'TON/USDT';
    ctx.reply(`Limit Emri Oluştur (${network})\n\nLütfen işlem detaylarını girin:\n1. İşlem Yönü (BUY/SELL)\n2. Miktar\n3. Limit Fiyatı`,
      Markup.forceReply().selective()
    );
  });

  bot.action('new_stoploss', (ctx) => {
    const network = global.userNetwork[ctx.from.id];
    const symbol = network === 'SOLANA' ? 'SOL/USDT' : 'TON/USDT';
    ctx.reply(`Stop-Loss Emri Oluştur (${network})\n\nLütfen işlem detaylarını girin:\n1. İşlem Yönü (BUY/SELL)\n2. Miktar\n3. Stop Fiyatı\n4. Limit Fiyatı`,
      Markup.forceReply().selective()
    );
  });

  bot.action('active_orders', async (ctx) => {
    try {
      const network = global.userNetwork[ctx.from.id];
      const orders = await tradingService.getActiveOrders(ctx.from.id, { chain: network });
      
      if (orders.length === 0) {
        return ctx.reply(`${network} ağında aktif emiriniz bulunmuyor.`);
      }

      let message = `📋 ${network} Aktif Emirleriniz:\n\n`;
      orders.forEach((order, index) => {
        message += `${index + 1}. Emir\n`;
        message += `🔹 ID: ${order._id}\n`;
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
      ctx.reply('Emirler alınırken bir hata oluştu.');
    }
  });
  bot.action('new_alert', (ctx) => {
    const network = global.userNetwork[ctx.from.id];
    const symbol = network === 'SOLANA' ? 'SOL/USDT' : 'TON/USDT';
    ctx.reply(`Yeni ${network} Fiyat Alarmı\n\nLütfen alarm detaylarını girin:\n1. Koşul (ABOVE/BELOW)\n2. Fiyat\n3. Tekrar (REPEAT - opsiyonel)`,
      Markup.forceReply().selective()
    );
  });

  bot.action('active_alerts', async (ctx) => {
    try {
      const network = global.userNetwork[ctx.from.id];
      const alerts = await alertService.getActiveAlerts(ctx.from.id, { chain: network });
      
      if (alerts.length === 0) {
        return ctx.reply(`${network} ağında aktif alarmınız bulunmuyor.`);
      }

      let message = `📋 ${network} Aktif Alarmlarınız:\n\n`;
      alerts.forEach((alert, index) => {
        message += `${index + 1}. Alarm\n`;
        message += `🔹 ID: ${alert._id}\n`;
        message += `🔹 Sembol: ${alert.symbol}\n`;
        message += `🔹 Koşul: ${alert.type === 'ABOVE' ? 'Üzerine Çıktığında' : 'Altına Düştüğünde'}\n`;
        message += `🔹 Fiyat: ${alert.price}\n`;
        message += `🔹 Tekrar: ${alert.repeat ? 'Evet' : 'Hayır'}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      logger.error(`Alarm listesi alma hatası: ${error.message}`);
      ctx.reply('Alarmlar alınırken bir hata oluştu.');
    }
  });
  bot.action('action_buy', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const selectedChain = global.userNetwork[userId];
      const user = await User.findOne({ telegramId: userId });

      if (!user) {
        return ctx.reply('Lütfen önce /start komutu ile başlayın.');
      }

      if (selectedChain === 'TON') {
        if (!user.tonCüzdan) {
          return ctx.reply('TON cüzdanınız bulunamadı. Lütfen yönetici ile iletişime geçin.');
        }

        const balance = await tonService.getBalance(user.tonCüzdan.address);
        
        const message = `<b>━━━━━━━━━━━━━━━</b>
<b>🔄 TOKEN ALIM</b>
<b>━━━━━━━━━━━━━━━</b>

<b>🌐 Ağ:</b> <code>TON</code>
<b>📍 Platform:</b> <code>StonFi</code>

<b>💼 Cüzdan Bilgileri:</b>
<b>Adres:</b> <code>${user.tonCüzdan.address}</code>
<b>Bakiye:</b> <code>${balance} TON</code>

<i>📝 Lütfen almak istediğiniz token'ın adresini girin:</i>`;
        global.userStates = global.userStates || {};
        global.userStates[userId] = {
          isActive: true,
          action: 'buy',
          walletInfo: user.tonCüzdan
        };

        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            force_reply: true
          }
        });
      }
    } catch (error) {
      logger.error(`Token alım hatası: ${error.message}`);
      ctx.reply('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
  bot.action('action_sell', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        return ctx.reply('Lütfen önce /start komutu ile başlayın.');
      }
      const selectedChain = global.userNetwork[ctx.from.id];
      const chainName = selectedChain === 'SOLANA' ? 'Solana' : 'TON';
      let tokenList = [];
      let tokenButtons = [];
      
      if (selectedChain === 'SOLANA') {
        tokenList = await solanaService.getWalletTokens(user.solanaCüzdan.publicKey);
      } else {
        tokenList = await tonService.getWalletTokens(user.tonCüzdan.address);
      }
      tokenList.forEach(token => {
        tokenButtons.push([
          Markup.button.callback(
            `${token.symbol}: ${token.balance.toLocaleString()} ($${token.value.toFixed(2)})`,
            `sell_token_${token.address}`
          )
        ]);
      });
      let tokenListText = '';
      if (tokenList.length > 0) {
        tokenListText = tokenList.map(token => 
          `• ${token.symbol}: <code>${token.balance.toLocaleString()}</code> (<code>$${token.value.toFixed(2)}</code>)`
        ).join('\n');
      } else {
        tokenListText = '• Henüz token bulunmuyor';
      }

      const message = `<b>━━━━━━━━━━━━━━━</b>
<b>━━━━━━━━━━━━━━━</b>

<b>🌐 Ağ:</b> <code>${chainName}</code>

<b>💼 Cüzdan Bilgileri:</b>
<b>Seçili Cüzdan:</b> <code>w1</code>
<b>Bakiye:</b> <code>${selectedChain === 'SOLANA' ? user.solanaCüzdan?.balance || '0.0' : user.tonCüzdan?.balance || '0.0'} ${selectedChain}</code>

<b>📋 Cüzdanınızdaki Tokenlar:</b>
${tokenListText}

<i>📝 Sayfa: 1/1</i>

<i>🔍 Satmak istediğiniz token'a tıklayın veya Custom 🔧 ile token adresi girin.</i>`;
      const buttons = [
        [
          Markup.button.callback('✓ w1', 'select_w1'),
          Markup.button.callback('w2', 'select_w2'),
          Markup.button.callback('w3', 'select_w3')
        ],
        ...tokenButtons,
        [
          Markup.button.callback('⬅️ Prev', 'sell_prev_page'),
          Markup.button.callback('Custom 🔧', 'sell_custom_token'),
          Markup.button.callback('Next ➡️', 'sell_next_page')
        ]
      ];
      await ctx.replyWithHTML(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Satış başlatma hatası: ${error.message}`);
      ctx.reply('Bir hata oluştu, lütfen tekrar deneyin.');
    }
  });
  bot.action('sell_custom_token', async (ctx) => {
    try {
      const replyMessage = await ctx.reply(
        '📝 Satmak istediğiniz token\'ın adresini girin:',
        { reply_markup: { force_reply: true } }
      );
      global.userStates = global.userStates || {};
      global.userStates[ctx.from.id] = {
        awaitingTokenAddress: true,
        action: 'sell',
        messageId: replyMessage.message_id
      };

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Custom token satış hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action(/sell_token_(.+)/, async (ctx) => {
    try {
      const tokenAddress = ctx.match[1];
      const userId = ctx.from.id;
      const user = await User.findOne({ telegramId: userId });
      const selectedChain = user.settings.defaultChain;
      const message = `<b>— Token Satış | ${selectedChain} —</b>\n\n` +
        `<b>Ağ:</b> ${selectedChain}\n` +
        `<b>Token:</b> ${selectedChain === 'SOLANA' ? tokenAddress.substring(0, 8) : ''}...\n` +
        `<b>Bakiye:</b> ${selectedChain === 'SOLANA' ? user.solanaCüzdan?.balance || '0.0' : ''} ${selectedChain}\n` +
        `<b>Değer:</b> ${selectedChain === 'SOLANA' ? `$${((user.solanaCüzdan?.balance || 0) * await priceService.getPrice('SOL/USDT')).toFixed(2)}` : ''}`;

      const buttons = [
        [
          Markup.button.callback('25%', 'sell_amount_25'),
          Markup.button.callback('50%', 'sell_amount_50'),
          Markup.button.callback('75%', 'sell_amount_75')
        ],
        [
          Markup.button.callback('MAX', 'sell_amount_max'),
          Markup.button.callback('Custom 🔧', 'sell_amount_custom')
        ],
        [
          Markup.button.callback('↩️ Geri', 'action_sell')
        ]
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Token seçim hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action(/sell_amount_(.+)/, async (ctx) => {
    try {
      const amount = ctx.match[1];
      const userId = ctx.from.id;

      if (amount === 'custom') {
        const replyMessage = await ctx.reply(
          '💰 Satmak istediğiniz miktarı girin:',
          { reply_markup: { force_reply: true } }
        );
        global.userStates = global.userStates || {};
        global.userStates[ctx.from.id] = {
          awaitingSellAmount: true,
          messageId: replyMessage.message_id
        };
      } else {
        const percentage = amount === 'max' ? 100 : parseInt(amount);
        const message = `<b>— Satış Onayı —</b>\n\n` +
          `<b>Token:</b> UNIBOT\n` +
          `<b>Miktar:</b> 0.01 UNIBOT\n` +
          `<b>Değer:</b> $24.36\n` +
          `<b>Ağ Ücreti:</b> ~$0.5\n\n` +
          `<i>⚠️ İşlemi onaylıyor musunuz?</i>`;

        const buttons = [
          [
            Markup.button.callback('✅ Onayla', 'confirm_sell'),
            Markup.button.callback('❌ İptal', 'cancel_sell')
          ]
        ];

        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(buttons)
        });
      }

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Satış miktarı seçim hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action('send_transaction', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const userTrade = global.userTrades?.[userId];
      
      if (!userTrade) {
        return ctx.answerCbQuery('Lütfen önce bir token seçin.');
      }
      const user = await User.findOne({ telegramId: userId });
      if (!user || !user.tonCüzdan) {
        return ctx.answerCbQuery('Cüzdan bilgileriniz bulunamadı.');
      }
      let walletInfo = tonConnectService.getWalletInfo(userId);
      if (!walletInfo) {
        try {
          walletInfo = await tonConnectService.connectWallet(userId);
        } catch (error) {
          return ctx.answerCbQuery('Cüzdanınız bağlanamadı: ' + error.message);
        }
      }
      await ctx.answerCbQuery('İşleminiz hazırlanıyor...');
      await ctx.editMessageText(
        `— 🔄 İşlem Hazırlanıyor | Ağ: TON —\n` +
        `Cüzdan: ${walletInfo.address.substring(0, 8)}...\n` +
        `Token: ${userTrade.tokenInfo.name}\n` +
        `CA: ${userTrade.tokenAddress}\n` +
        `Alım Miktarı: ${userTrade.selectedAmount} TON\n` +
        `Alınacak: ${userTrade.swapInfo.expectedAmount} ${userTrade.tokenInfo.symbol}\n` +
        `Durum: ⏳ HAZIRLANIYOR...\n\n` +
        `🛡️ StonFi üzerinden güvenli işlem gerçekleştiriliyor.`,
        { parse_mode: 'HTML' }
      );
      const transaction = {
        messages: [{
          address: userTrade.tokenAddress,
          amount: (userTrade.selectedAmount * 1e9).toString() // TON'u nano TON'a çevir
        }]
      };
      const result = await tonConnectService.sendTransaction(userId, transaction);
      const message = `— 🔄 İşlem | Ağ: TON —\n` +
        `Cüzdan: ${walletInfo.address.substring(0, 8)}...\n` +
        `Token: ${userTrade.tokenInfo.name}\n` +
        `CA: ${userTrade.tokenAddress}\n` +
        `Alım Miktarı: ${userTrade.selectedAmount} TON\n` +
        `Alınacak: ${result.expectedAmount} ${userTrade.tokenInfo.symbol}\n` +
        `Hash: ${result.hash}\n` +
        `Sonuç: ⏳ BEKLENİYOR...\n\n` +
        `🛡️ StonFi üzerinden güvenli işlem gerçekleştiriliyor.`;

      const buttons = [
        [
          Markup.button.callback('↩️ Menü', 'back_to_menu'),
          Markup.button.callback('❌ Kapat', 'close_transaction')
        ]
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });
      delete global.userTrades[userId];

    } catch (error) {
      logger.error(`İşlem gönderme hatası: ${error.message}`);
      ctx.answerCbQuery('İşlem gönderilirken bir hata oluştu: ' + error.message);
    }
  });
  bot.action('back_to_menu', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      await showMainMenu(ctx, user);
    } catch (error) {
      logger.error(`Ana menüye dönüş hatası: ${error.message}`);
      ctx.reply('Ana menüye dönülürken bir hata oluştu.');
    }
  });

  bot.action('close_transaction', async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (error) {
      logger.error(`İşlem kapatma hatası: ${error.message}`);
    }
  });
  bot.action('show_private_key', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        return ctx.answerCbQuery('Kullanıcı bulunamadı.');
      }

      const network = global.userNetwork[ctx.from.id];
      const wallet = network === 'SOLANA' ? user.solanaCüzdan : user.tonCüzdan;
      if (!wallet?.passwordSet) {
        await ctx.reply(
          `🔐 ${network} Güvenlik Şifresi Oluşturma\n\n` +
          `${network === 'SOLANA' ? 'Private key' : '24 kelimelik gizli anahtar'}\'inizi görüntülemek için bir güvenlik şifresi oluşturmanız gerekmektedir.\n\n` +
          'Lütfen en az 6 karakterden oluşan bir şifre girin:',
          { reply_markup: { force_reply: true } }
        );
        global.userStates = global.userStates || {};
        global.userStates[ctx.from.id] = {
          awaitingPasswordSetup: true,
          network: network
        };
      } else {
        await ctx.reply(
          `🔐 ${network} Güvenlik Doğrulama\n\n` +
          `${network === 'SOLANA' ? 'Private key' : '24 kelimelik gizli anahtar'}\'inizi görüntülemek için güvenlik şifrenizi girin:`,
          { reply_markup: { force_reply: true } }
        );
        global.userStates = global.userStates || {};
        global.userStates[ctx.from.id] = {
          awaitingPasswordVerification: true,
          network: network
        };
      }

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Private key gösterme hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.on('text', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const userState = global.userStates?.[userId];
      if (userState?.isActive && userState.action === 'buy') {
        const tokenAddress = ctx.message.text.trim();
        const selectedChain = global.userNetwork[userId];

        if (selectedChain === 'TON') {
          try {
            if (!tonService.validateAddress(tokenAddress)) {
              ctx.reply('❌ Geçersiz token adresi. Lütfen geçerli bir TON token adresi girin.');
              return;
            }
            const tokenInfo = await tonService.getTokenInfo(tokenAddress);
            const swapInfo = await tonService.prepareSwapTransaction(
              tokenAddress,
              0.01,
              userState.walletInfo.address,
              true
            );

            const message = `<b>━━━━━━━━━━━━━━━</b>
<b>🔄 TOKEN ALIM</b>
<b>━━━━━━━━━━━━━━━</b>

<b>🌐 Ağ:</b> <code>TON</code>
<b>📍 Platform:</b> <code>StonFi</code>

<b>💼 Cüzdan Bilgileri:</b>
<b>Adres:</b> <code>${userState.walletInfo.address}</code>

<b>📝 Token Bilgileri:</b>
<b>İsim:</b> <code>${tokenInfo.name} (${tokenInfo.symbol})</code>
<b>Adres:</b> <code>${tokenAddress}</code>
<b>Toplam Arz:</b> <code>${tokenInfo.totalSupply}</code>
<b>Holders:</b> <code>${tokenInfo.holdersCount}</code>

<b>💰 Fiyat Bilgileri:</b>
<b>Fiyat:</b> <code>$${tokenInfo.price}</code>
<b>Market Değeri:</b> <code>$${tokenInfo.marketCap}</code>
<b>24s Hacim:</b> <code>$${tokenInfo.volume24h}</code>
<b>Likidite:</b> <code>$${tokenInfo.liquidity}</code>

<b>🔄 Alım Detayları:</b>
<b>Miktar:</b> <code>0.01 TON</code>
<b>Alınacak:</b> <code>${swapInfo.expectedAmount} ${tokenInfo.symbol}</code>
<b>Fiyat Etkisi:</b> <code>${swapInfo.priceImpact}%</code>
<b>İşlem Ücreti:</b> <code>${swapInfo.fee} TON</code>`;
            global.userTrades = global.userTrades || {};
            global.userTrades[userId] = {
              tokenAddress,
              tokenInfo,
              swapInfo,
              action: 'buy',
              platform: 'stonfi',
              selectedAmount: '0.01'
            };

            const buttons = [
              [
                Markup.button.callback('↩️ Menu', 'back_to_menu'),
                Markup.button.callback('🔄 Refresh', 'refresh_data')
              ],
              [
                Markup.button.callback('0.1 TON', 'amount_0.1'),
                Markup.button.callback('0.5 TON', 'amount_0.5'),
                Markup.button.callback('1 TON', 'amount_1')
              ],
              [
                Markup.button.callback('1.5 TON', 'amount_1.5'),
                Markup.button.callback('2 TON', 'amount_2'),
                Markup.button.callback('X', 'custom_amount')
              ],
              [
                Markup.button.callback('Send Tx', 'send_transaction')
              ]
            ];

            await ctx.reply(message, {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard(buttons)
            });
            delete global.userStates[userId];

          } catch (error) {
            logger.error(`Token bilgisi alma hatası: ${error.message}`);
            ctx.reply('❌ Token bilgileri alınamadı. Lütfen geçerli bir token adresi girin.');
          }
        }
        return;
      }
      if (userState?.awaitingPasswordSetup) {
        const password = ctx.message.text;
        const network = userState.network;
        if (password.length < 6) {
          await ctx.reply('❌ Şifre en az 6 karakter olmalıdır. Lütfen tekrar deneyin:');
          return;
        }
        const user = await User.findOne({ telegramId: userId });
        if (!user) {
          await ctx.reply('❌ Kullanıcı bulunamadı. Lütfen /start komutunu kullanarak başlayın.');
          delete global.userStates[userId];
          return;
        }

        if (network === 'SOLANA') {
          user.solanaCüzdan.securityPassword = password;
          user.solanaCüzdan.passwordSet = true;
        } else {
          user.tonCüzdan.securityPassword = password;
          user.tonCüzdan.passwordSet = true;
        }
        await user.save();
        delete global.userStates[userId];
        await ctx.reply(`✅ ${network} güvenlik şifreniz başarıyla kaydedildi!`);
        try {
          await ctx.deleteMessage();
        } catch (error) {
          logger.error(`Mesaj silme hatası: ${error.message}`);
        }
        await showMainMenu(ctx, user);
        return;
      }
      if (userState?.awaitingPasswordVerification) {
        const password = ctx.message.text;
        const network = userState.network;
        const user = await User.findOne({ telegramId: userId });
        
        if (!user) {
          await ctx.reply('❌ Kullanıcı bulunamadı. Lütfen /start komutunu kullanarak başlayın.');
          delete global.userStates[userId];
          return;
        }

        const wallet = network === 'SOLANA' ? user.solanaCüzdan : user.tonCüzdan;

        if (!wallet?.securityPassword) {
          await ctx.reply('❌ Güvenlik şifresi bulunamadı. Lütfen önce bir şifre oluşturun.');
          delete global.userStates[userId];
          return;
        }

        if (password === wallet.securityPassword) {
          if (network === 'SOLANA') {
            await ctx.reply(
              '🔐 Private Key Bilgileriniz:\n\n' +
              `<code>${wallet.privateKey}</code>\n\n` +
              '⚠️ Bu bilgiyi güvenli bir yerde saklayın ve kimseyle paylaşmayın!',
              { parse_mode: 'HTML' }
            );
          } else {
            await ctx.reply(
              '🔐 24 Kelimelik Gizli Anahtar:\n\n' +
              `<code>${wallet.mnemonic}</code>\n\n` +
              '⚠️ Bu kelimeleri güvenli bir yerde saklayın ve kimseyle paylaşmayın!\n' +
              '💡 Bu kelimeleri kullanarak TON Keeper\'a cüzdanınızı aktarabilirsiniz.',
              { parse_mode: 'HTML' }
            );
          }
          delete global.userStates[userId];
        } else {
          await ctx.reply('❌ Yanlış şifre! Lütfen tekrar deneyin:');
        }
        try {
          await ctx.deleteMessage();
        } catch (error) {
          logger.error(`Mesaj silme hatası: ${error.message}`);
        }
        return;
      }
      if (userState?.awaitingCustomAmount) {
        const amount = parseFloat(ctx.message.text.trim());
        if (isNaN(amount) || amount <= 0) {
          ctx.reply('❌ Geçersiz miktar. Lütfen pozitif bir sayı girin.');
          return;
        }

        const userId = ctx.from.id;
        const userTrade = global.userTrades[userId];
        userTrade.selectedAmount = amount.toString();
        const message = ctx.update.message.reply_to_message.text;
        const buttons = [
          [
            Markup.button.callback('↩️ Menu', 'back_to_menu'),
            Markup.button.callback('🔄 Refresh', 'refresh_data')
          ],
          [
            Markup.button.callback(amount === '0.1' ? '✓ 0.1 TON' : '0.1 TON', 'amount_0.1'),
            Markup.button.callback(amount === '0.5' ? '✓ 0.5 TON' : '0.5 TON', 'amount_0.5'),
            Markup.button.callback(amount === '1' ? '✓ 1 TON' : '1 TON', 'amount_1')
          ],
          [
            Markup.button.callback(amount === '1.5' ? '✓ 1.5 TON' : '1.5 TON', 'amount_1.5'),
            Markup.button.callback(amount === '2' ? '✓ 2 TON' : '2 TON', 'amount_2'),
            Markup.button.callback(`✓ ${amount} TON`, 'custom_amount')
          ],
          [
            Markup.button.callback('Send Tx', 'send_transaction')
          ]
        ];

        await ctx.reply(message, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(buttons)
        });

        delete global.userStates[userId];
        return;
      }
    } catch (error) {
      logger.error(`Metin işleme hatası: ${error.message}`);
      ctx.reply('Bir hata oluştu, lütfen tekrar deneyin.');
    }
  });
  bot.action(/amount_(.+)/, async (ctx) => {
    try {
      const amount = ctx.match[1];
      const userId = ctx.from.id;
      const userTrade = global.userTrades[userId];
      
      if (!userTrade) {
        return ctx.answerCbQuery('Lütfen önce bir token seçin.');
      }

      userTrade.selectedAmount = amount;
      const message = ctx.update.callback_query.message.text;
      
      const buttons = [
        [
          Markup.button.callback('↩️ Menu', 'back_to_menu'),
          Markup.button.callback('🔄 Refresh', 'refresh_data')
        ],
        [
          Markup.button.callback(amount === '0.1' ? '✓ 0.1 TON' : '0.1 TON', 'amount_0.1'),
          Markup.button.callback(amount === '0.5' ? '✓ 0.5 TON' : '0.5 TON', 'amount_0.5'),
          Markup.button.callback(amount === '1' ? '✓ 1 TON' : '1 TON', 'amount_1')
        ],
        [
          Markup.button.callback(amount === '1.5' ? '✓ 1.5 TON' : '1.5 TON', 'amount_1.5'),
          Markup.button.callback(amount === '2' ? '✓ 2 TON' : '2 TON', 'amount_2'),
          Markup.button.callback('X', 'custom_amount')
        ],
        [
          Markup.button.callback('Send Tx', 'send_transaction')
        ]
      ];

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      });

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Miktar seçme hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action('custom_amount', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const userTrade = global.userTrades[userId];
      
      if (!userTrade) {
        return ctx.answerCbQuery('Lütfen önce bir token seçin.');
      }
      const replyMessage = await ctx.reply(
        '💰 Almak istediğiniz miktarı TON cinsinden girin:',
        { reply_markup: { force_reply: true } }
      );
      global.userStates = global.userStates || {};
      global.userStates[userId] = {
        awaitingCustomAmount: true,
        messageId: replyMessage.message_id
      };

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Özel miktar girişi hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action('back_to_menu', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      await showMainMenu(ctx, user);
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`Ana menüye dönüş hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action('cancel_buy', async (ctx) => {
    try {
      const userId = ctx.from.id;
      delete global.userTrades[userId];
      await ctx.editMessageText(
        '❌ İşlem iptal edildi.',
        Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Menü', 'back_to_menu')]
        ])
      );
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error(`İşlem iptal hatası: ${error.message}`);
      ctx.answerCbQuery('Bir hata oluştu');
    }
  });
  bot.action(/.+/, (ctx) => {
    ctx.answerCbQuery();
  });
}

module.exports = handleButtons; 