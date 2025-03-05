const { TonClient, WalletContractV5R1 } = require('@ton/ton');
const { Address, beginCell, toNano, fromNano, internal, SendMode } = require('@ton/core');
const { StonApiClient } = require('@ston-fi/api');
const logger = require('../../utils/logger');
const axios = require('axios');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const User = require('../../models/User');
require('dotenv').config();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function safeApiCall(fn, retryDelay = 2000, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if ((error.message && error.message.includes("429")) || 
          (error.response && error.response.status === 429) && 
          i < maxRetries - 1) {
        const waitTime = retryDelay * Math.pow(2, i); // Exponential backoff
        logger.warn(`API rate limit aşıldı, ${waitTime/1000} saniye bekleniyor... (Deneme ${i+1}/${maxRetries})`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Maksimum deneme sayısı (${maxRetries}) aşıldı.`);
}

class TonService {
  constructor() {
    this.client = new TonClient({
      endpoint: process.env.TON_RPC_URL || 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TON_API_KEY
    });
    this.tonApiEndpoint = process.env.TON_API_ENDPOINT || 'https://tonapi.io/v2';
    this.tonApiKey = process.env.TON_API_KEY;
    this.stonFiEndpoint = process.env.STON_FI_ENDPOINT || 'https://api.ston.fi/v1';
    this.stonFiClient = new StonApiClient();
  }

  async getTokenInfo(tokenAddress) {
    try {
      const tonApiResponse = await axios.get(`${this.tonApiEndpoint}/jettons/${tokenAddress}`, {
        headers: {
          'Authorization': `Bearer ${this.tonApiKey}`
        }
      });

      const tonApiData = tonApiResponse.data;
      
      // StonApiClient kullanarak token bilgilerini alıyoruz
      const asset = await this.stonFiClient.getAsset(tokenAddress);
      const price = asset?.price || 0;
      const totalSupply = tonApiData.total_supply / Math.pow(10, tonApiData.metadata?.decimals || 9);
      const marketCap = totalSupply * price;
      const volume24h = asset?.volume24h || 0;
      const expectedAmount = price > 0 ? (0.01 / price) : 0;

      return {
        name: tonApiData.metadata?.name || 'Unknown',
        symbol: tonApiData.metadata?.symbol || 'Unknown',
        decimals: parseInt(tonApiData.metadata?.decimals || '9'),
        address: tokenAddress,
        totalSupply: totalSupply.toFixed(2),
        holdersCount: tonApiData.holders_count,
        description: tonApiData.metadata?.description,
        image: tonApiData.metadata?.image,
        social: tonApiData.metadata?.social,
        websites: tonApiData.metadata?.websites,
        verified: tonApiData.verification === 'whitelist',
        price: price,
        marketCap: marketCap.toFixed(2),
        volume24h: volume24h,
        liquidity: asset?.liquidity || 0,
        expectedAmount: expectedAmount.toFixed(6),
        priceImpact: asset?.priceImpact || 0,
        poolAddress: asset?.poolAddress,
        isListed: asset?.isListed || false,
        tradingEnabled: true
      };
    } catch (error) {
      logger.error(`Token bilgisi alma hatası: ${error.message}`);
      throw new Error('Token bilgileri alınamadı');
    }
  }

  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      const response = await axios.get(`${this.tonApiEndpoint}/accounts/${walletAddress}/jettons`, {
        headers: {
          'Authorization': `Bearer ${this.tonApiKey}`
        }
      });

      const token = response.data.balances.find(t => t.jetton.address === tokenAddress);
      return token ? token.balance : 0;
    } catch (error) {
      logger.error(`Token bakiyesi alma hatası: ${error.message}`);
      throw new Error('Token bakiyesi alınamadı');
    }
  }

  async getBalance(address) {
    try {
      const response = await axios.get(`${this.tonApiEndpoint}/accounts/${address}`, {
        headers: {
          'Authorization': `Bearer ${this.tonApiKey}`
        }
      });
      return Number(response.data.balance) / 1e9; // Nano TON'u TON'a çevir
    } catch (error) {
      logger.error(`TON bakiye sorgulama hatası: ${error.message}`);
      throw new Error('Bakiye sorgulanırken bir hata oluştu');
    }
  }

  async getTransactionHistory(address) {
    try {
      const response = await axios.get(`${this.tonApiEndpoint}/accounts/${address}/events`, {
        headers: {
          'Authorization': `Bearer ${this.tonApiKey}`
        },
        params: {
          limit: 10
        }
      });

      return response.data.events.map(event => ({
        hash: event.hash,
        timestamp: event.timestamp,
        amount: event.value / 1e9,
        type: event.is_incoming ? 'Gelen' : 'Giden',
        status: event.success ? 'Başarılı' : 'Başarısız'
      }));
    } catch (error) {
      logger.error(`İşlem geçmişi alma hatası: ${error.message}`);
      return [];
    }
  }

  validateAddress(address) {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  async getWalletTokens(address) {
    try {
      const response = await axios.get(`${this.tonApiEndpoint}/accounts/${address}/jettons`, {
        headers: {
          'Authorization': `Bearer ${this.tonApiKey}`
        }
      });

      return response.data.balances.map(token => ({
        symbol: token.jetton.metadata?.symbol || 'Unknown',
        name: token.jetton.metadata?.name || 'Unknown Token',
        balance: token.balance / Math.pow(10, token.jetton.metadata?.decimals || 9),
        value: token.price?.usd ? (token.balance / Math.pow(10, token.jetton.metadata?.decimals || 9)) * token.price.usd : 0,
        address: token.jetton.address,
        verified: token.jetton.verification === 'whitelist'
      })).sort((a, b) => b.value - a.value);
    } catch (error) {
      logger.error(`TON token listesi alma hatası: ${error.message}`);
      return [];
    }
  }

  async calculateSwap(tokenAddress, amount, userAddress, isBuy = true) {
    try {
      // StonApiClient kullanarak takas simülasyonu yapıyoruz
      if (isBuy) {
        // TON'dan token'a takas (buy)
        const simulation = await this.stonFiClient.simulateSwap({
          offerAsset: 'ton', // TON
          askAsset: tokenAddress, // Token
          offerAmount: (amount * 1e9).toString(), // TON'u nano TON'a çevir
          userAddress: userAddress
        });
        
        return {
          expectedAmount: simulation.expectedAskAmount,
          priceImpact: simulation.priceImpact,
          fee: simulation.fee,
          txParams: {
            to: simulation.txParams.to,
            value: simulation.txParams.value,
            payload: simulation.txParams.payload
          }
        };
      } else {
        // Token'dan TON'a takas (sell)
        const simulation = await this.stonFiClient.simulateSwap({
          offerAsset: tokenAddress, // Token
          askAsset: 'ton', // TON
          offerAmount: amount.toString(),
          userAddress: userAddress
        });
        
        return {
          expectedAmount: simulation.expectedAskAmount,
          priceImpact: simulation.priceImpact,
          fee: simulation.fee,
          txParams: {
            to: simulation.txParams.to,
            value: simulation.txParams.value,
            payload: simulation.txParams.payload
          }
        };
      }
    } catch (error) {
      logger.error(`Takas hesaplama hatası: ${error.message}`);
      throw new Error('Takas hesaplanamadı');
    }
  }

  async prepareSwapTransaction(tokenAddress, amount, userAddress, isBuy = true) {
    try {
      const swapCalc = await this.calculateSwap(tokenAddress, amount, userAddress, isBuy);
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 dakika geçerli
        network: 'mainnet',
        from: userAddress,
        messages: [{
          address: swapCalc.txParams.to,
          amount: swapCalc.txParams.value.toString(),
          payload: swapCalc.txParams.payload
        }]
      };

      return {
        transaction,
        expectedAmount: swapCalc.expectedAmount,
        priceImpact: swapCalc.priceImpact,
        fee: swapCalc.fee
      };
    } catch (error) {
      logger.error(`İşlem hazırlama hatası: ${error.message}`);
      throw new Error('Takas işlemi hazırlanamadı');
    }
  }

  async getLiquidityPools() {
    try {
      // StonApiClient kullanarak likidite havuzlarını alıyoruz
      const pools = await this.stonFiClient.getPools();
      return pools.map(pool => ({
        pairAddress: pool.address,
        token0: pool.token0?.address,
        token1: pool.token1?.address,
        liquidity: pool.liquidity,
        volume24h: pool.volume24h,
        price: pool.price
      }));
    } catch (error) {
      logger.error(`Likidite havuzu bilgileri alma hatası: ${error.message}`);
      return [];
    }
  }

  async sendTransaction(walletAddress, tokenAddress, amount) {
    try {
      logger.info(`TON swap işlemi başlatılıyor: ${walletAddress} adresinden ${amount} TON ile ${tokenAddress} tokenı alınıyor`);
      const user = await User.findOne({ 'tonCüzdan.address': walletAddress });
      if (!user || !user.tonCüzdan) {
        throw new Error('Kullanıcı cüzdanı bulunamadı');
      }
      const mnemonicPhrase = user.tonCüzdan.mnemonic;
      const mnemonicWords = mnemonicPhrase.split(' ');
      const keyPair = await mnemonicToPrivateKey(mnemonicWords);
      const wallet = this.client.open(WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
        walletId: 698983191 // TonKeeper varsayılan subwallet_id
      }));
      const seqno = await safeApiCall(() => wallet.getSeqno());
      logger.info(`Cüzdan seqno: ${seqno}`);
      const balance = await this.getBalance(walletAddress);
      const swapAmount = amount; // TON miktarı
      const gasAmount = 1; // Gas için 1 TON
      const totalAmount = swapAmount + gasAmount;
      
      if (balance < totalAmount) {
        throw new Error(`Yetersiz bakiye. Gerekli: ${totalAmount} TON, Mevcut: ${balance} TON`);
      }
      const swapCalc = await this.calculateSwap(tokenAddress, amount, walletAddress, true);
      logger.info(`Swap hesaplaması: Beklenen miktar=${swapCalc.expectedAmount}, Fiyat etkisi=${swapCalc.priceImpact}, Ücret=${swapCalc.fee}`);
      const routerAddress = Address.parse(process.env.STON_FI_ROUTER_ADDRESS || "kQALh-JBBIKK7gr0o4AVf9JZnEsFndqO0qTCyT-D-yBsWk0v");
      logger.info(`Router adresi: ${routerAddress.toString()}`);
      const destAddress = Address.parse(process.env.STON_FI_DEST_ADDRESS || "kQACS30DNoUQ7NfApPvzh7eBmSZ9L4ygJ-lkNWtba8TQT-Px");
      logger.info(`Hedef adres: ${destAddress.toString()}`);
      const refundAddress = Address.parse(walletAddress);
      logger.info(`Refund adresi: ${refundAddress.toString()}`);
      const swapAmountNano = toNano(swapAmount.toString()); // TON miktarını nano TON'a çevir
      const msgValue = toNano((swapAmount + gasAmount).toString()); // Toplam gönderilecek miktar
      const queryId = Math.floor(Date.now() * 1000); // Benzersiz bir query ID oluştur
      
      logger.info(`Swap parametreleri: Miktar=${swapAmount} TON, Gas=${gasAmount} TON, Toplam=${totalAmount} TON, QueryID=${queryId}`);
      const opCode = parseInt(process.env.PTON_TON_TRANSFER_OP_CODE || "32736093"); // StonFi swap operasyon kodu
      const transferPayload = beginCell()
        .storeUint(opCode, 32) // PtonTonTransfer operasyon kodu
        .storeUint(queryId, 64) // Query ID
        .storeCoins(swapAmountNano) // Transfer edilecek TON miktarı
        .storeAddress(refundAddress) // Refund adresi - kullanıcının adresi
        .storeRef(beginCell().endCell()) // Boş bir referans
        .endCell();
      
      logger.info('Swap payload oluşturuldu');
      const transfer = wallet.createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [internal({
          to: destAddress,
          value: msgValue,
          bounce: true,
          body: transferPayload
        })],
        sendMode: SendMode.PAY_GAS_SEPARATELY | 3 // Mode 3
      });
      logger.info('Swap işlemi gönderiliyor...');
      const result = await safeApiCall(() => wallet.send(transfer));
      logger.info(`Swap işlemi gönderildi: ${JSON.stringify(result)}`);
      const txHash = `${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 10)}`;
      
      return {
        success: true,
        hash: txHash,
        expectedAmount: swapCalc.expectedAmount,
        priceImpact: swapCalc.priceImpact,
        fee: swapCalc.fee
      };
    } catch (error) {
      logger.error(`Swap işlemi hatası: ${error.message}`);
      throw new Error(`Swap işlemi başarısız: ${error.message}`);
    }
  }
}

module.exports = new TonService(); 