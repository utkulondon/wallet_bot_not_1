const { Keypair } = require('@solana/web3.js');
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');
const { TonClient, WalletContractV5R1 } = require('@ton/ton');
const axios = require('axios');
const User = require('../models/User');
const logger = require('../utils/logger');
require('dotenv').config();

class WalletService {
  constructor() {
    this.client = new TonClient({
      endpoint: process.env.TON_RPC_URL || 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TON_API_KEY
    });
    this.openTonApiEndpoint = 'https://tonapi.io/v2';
  }

  async createSolanaWallet(userId) {
    try {
      let user = await User.findOne({ telegramId: userId });
      if (!user) {
        user = new User({
          telegramId: userId
        });
      }
      if (user.solanaCüzdan?.publicKey) {
        return {
          publicKey: user.solanaCüzdan.publicKey,
          privateKey: user.solanaCüzdan.privateKey
        };
      }
      const keypair = Keypair.generate();
      const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      user.solanaCüzdan = {
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyBase64,
        createdAt: new Date()
      };

      await user.save();
      
      logger.info(`Yeni Solana cüzdanı oluşturuldu. Public Key: ${keypair.publicKey.toString()}`);
      
      return {
        publicKey: user.solanaCüzdan.publicKey,
        privateKey: privateKeyBase64
      };
    } catch (error) {
      logger.error(`Solana cüzdanı oluşturma hatası: ${error.message}`);
      throw new Error('Solana cüzdanı oluşturulurken bir hata oluştu');
    }
  }

  async createTonWallet(userId) {
    try {
      let user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        user = new User({
          telegramId: userId
        });
      }

      if (user.tonCüzdan?.address) {
        return {
          address: user.tonCüzdan.address,
          mnemonic: user.tonCüzdan.mnemonic
        };
      }
      const mnemonicWords = await mnemonicNew(24);
      const mnemonicPhrase = mnemonicWords.join(' ');
      const privateKey = await mnemonicToPrivateKey(mnemonicWords);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: privateKey.publicKey,
        walletId: 698983191 // TonKeeper varsayılan subwallet_id
      });
      const nonBounceableAddress = wallet.address.toString({ bounceable: false });
      const bounceableAddress = wallet.address.toString({ bounceable: true });
      const privateKeyHex = Buffer.from(privateKey.secretKey).toString('hex');

      logger.info(`Yeni TON V5R1 cüzdanı oluşturuldu (TonKeeper uyumlu)`);
      logger.info(`Public Key: ${Buffer.from(privateKey.publicKey).toString('hex')}`);
      logger.info(`Bounceable Adres: ${bounceableAddress}`);
      logger.info(`Non-Bounceable Adres: ${nonBounceableAddress}`);
      user.tonCüzdan = {
        address: nonBounceableAddress, // Non-bounceable adresi kaydediyoruz
        privateKey: privateKeyHex,
        mnemonic: mnemonicPhrase,
        createdAt: new Date()
      };

      await user.save();

      return {
        address: nonBounceableAddress, // Non-bounceable adresi dönüyoruz
        mnemonic: mnemonicPhrase
      };
    } catch (error) {
      logger.error(`TON cüzdanı oluşturma hatası: ${error.message}`);
      throw new Error('TON cüzdanı oluşturulurken bir hata oluştu');
    }
  }

  async getTonWalletAddress(privateKeyHex) {
    try {
      const secretKey = Buffer.from(privateKeyHex, 'hex');
      const publicKey = secretKey.slice(32);

      const wallet = await this.client.open(WalletContractV5R1.create({
        workchain: 0,
        publicKey: publicKey,
        walletId: 698983191 // TonKeeper varsayılan subwallet_id
      }));

      return wallet.address.toString({ bounceable: false }); // Non-bounceable adres dönüyoruz
    } catch (error) {
      logger.error(`TON adresi sorgulama hatası: ${error.message}`);
      throw new Error('TON adresi sorgulanırken bir hata oluştu');
    }
  }

  async getWalletInfo(userId, network) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      if (network === 'SOLANA') {
        if (!user.solanaCüzdan) {
          throw new Error('Solana cüzdanı bulunamadı');
        }
        return {
          publicKey: user.solanaCüzdan.publicKey,
          privateKey: user.solanaCüzdan.privateKey
        };
      } else {
        if (!user.tonCüzdan) {
          throw new Error('TON cüzdanı bulunamadı');
        }
        return {
          address: user.tonCüzdan.address,
          mnemonic: user.tonCüzdan.mnemonic
        };
      }
    } catch (error) {
      logger.error(`Cüzdan bilgisi alma hatası: ${error.message}`);
      throw new Error('Cüzdan bilgileri alınırken bir hata oluştu');
    }
  }
}

module.exports = new WalletService(); 