const axios = require('axios');
const logger = require('../utils/logger');

class PriceService {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.tokenIds = {
      'SOL/USDT': 'solana',
      'TON/USDT': 'the-open-network'
    };
    this.priceCache = new Map();
    this.cacheDuration = 60 * 1000; // 1 dakika
  }

  async getPrice(symbol) {
    try {
      const normalizedSymbol = symbol.toUpperCase();
      const tokenId = this.tokenIds[normalizedSymbol];

      if (!tokenId) {
        logger.error(`Fiyat sorgulama hatası: Desteklenmeyen token çifti`);
        throw new Error('Desteklenmeyen token çifti');
      }
      const cachedData = this.priceCache.get(normalizedSymbol);
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheDuration) {
        return cachedData.price;
      }

      const response = await axios.get(`${this.baseUrl}/simple/price`, {
        params: {
          ids: tokenId,
          vs_currencies: 'usd'
        }
      });

      if (!response.data || !response.data[tokenId] || !response.data[tokenId].usd) {
        throw new Error('Geçersiz API yanıtı');
      }

      const price = response.data[tokenId].usd;
      this.priceCache.set(normalizedSymbol, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      logger.error(`Fiyat sorgulama hatası: ${error.message}`);
      if (error.message === 'Desteklenmeyen token çifti') {
        throw error;
      }
      throw new Error('Fiyat bilgisi alınırken bir hata oluştu');
    }
  }

  async getMarketData(symbol) {
    try {
      const normalizedSymbol = symbol.toUpperCase();
      const tokenId = this.tokenIds[normalizedSymbol];

      if (!tokenId) {
        logger.error(`Market verisi sorgulama hatası: Desteklenmeyen token çifti`);
        throw new Error('Desteklenmeyen token çifti');
      }

      const response = await axios.get(`${this.baseUrl}/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      if (!response.data || !response.data.market_data) {
        throw new Error('Geçersiz API yanıtı');
      }

      const data = response.data;
      return {
        currentPrice: data.market_data.current_price.usd,
        priceChange24h: data.market_data.price_change_percentage_24h,
        marketCap: data.market_data.market_cap.usd,
        volume24h: data.market_data.total_volume.usd,
        high24h: data.market_data.high_24h.usd,
        low24h: data.market_data.low_24h.usd,
        lastUpdated: data.market_data.last_updated
      };
    } catch (error) {
      logger.error(`Market verisi sorgulama hatası: ${error.message}`);
      if (error.message === 'Desteklenmeyen token çifti') {
        throw error;
      }
      throw new Error('Market verisi alınırken bir hata oluştu');
    }
  }
  async checkPriceAlerts() {
    try {
      for (const symbol of Object.keys(this.tokenIds)) {
        try {
          const currentPrice = await this.getPrice(symbol);
          global.eventEmitter.emit('priceUpdate', symbol, currentPrice);
        } catch (error) {
          logger.error(`${symbol} için fiyat kontrolü hatası: ${error.message}`);
          continue;
        }
      }
    } catch (error) {
      logger.error(`Fiyat alarm kontrolü hatası: ${error.message}`);
    }
  }

  startPriceMonitoring(interval = 1 * 60 * 1000) { // Varsayılan 1 dakika
    setInterval(() => this.checkPriceAlerts(), interval);
  }
}

module.exports = new PriceService(); 