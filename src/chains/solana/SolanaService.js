const { Connection, PublicKey, clusterApiUrl, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } = require('@solana/spl-token');
const axios = require('axios');
const logger = require('../../utils/logger');

class SolanaService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
      'confirmed'
    );
    this.dexScreenerUrl = 'https://api.dexscreener.com/latest/dex/tokens';
    this.isDevnet = true; // Devnet modunda olduğumuzu belirt
  }

  async getTokenInfo(tokenAddress) {
    try {
      if (this.isDevnet) {
        return {
          name: `Test Token (${tokenAddress.slice(0, 8)}...)`,
          symbol: 'TEST',
          decimals: 9,
          price: 1.0, // Test için sabit fiyat
          marketCap: '1,000,000',
          volume24h: '100,000',
          priceImpact: '0.00',
          address: tokenAddress,
          totalSupply: '1000000'
        };
      }
      const mintPubkey = new PublicKey(tokenAddress);
      const [metadata, supply] = await Promise.all([
        this.connection.getParsedAccountInfo(mintPubkey),
        this.connection.getTokenSupply(mintPubkey)
      ]);

      const dexResponse = await axios.get(`${this.dexScreenerUrl}/${tokenAddress}`);
      const pairs = dexResponse.data.pairs || [];
      const bestPair = pairs[0] || {};

      const tokenInfo = metadata?.value?.data?.parsed?.info || {};
      const tokenName = tokenInfo.name || bestPair.baseToken?.name || `Token (${tokenAddress.slice(0, 8)}...)`;
      const tokenSymbol = tokenInfo.symbol || bestPair.baseToken?.symbol || 'UNKNOWN';

      const price = bestPair.priceUsd || 0;
      const volume24h = bestPair.volume?.h24 || 0;
      const totalSupply = supply.value.uiAmount || 0;
      const marketCap = (price * totalSupply).toLocaleString('en-US', { maximumFractionDigits: 2 });

      return {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: supply.value.decimals,
        price: price,
        marketCap: marketCap,
        volume24h: volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 }),
        priceImpact: bestPair.priceChange?.h24 || '0.00',
        address: tokenAddress,
        totalSupply: totalSupply.toLocaleString('en-US', { maximumFractionDigits: supply.value.decimals })
      };
    } catch (error) {
      logger.error(`Solana token bilgisi alma hatası: ${error.message}`);
      throw new Error('Token bilgileri alınamadı');
    }
  }

  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      const response = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { mint: new PublicKey(tokenAddress) }
      );

      if (response.value.length === 0) return 0;
      return response.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    } catch (error) {
      logger.error(`Token bakiyesi alma hatası: ${error.message}`);
      throw new Error('Token bakiyesi alınamadı');
    }
  }

  async getBalance(publicKeyStr) {
    try {
      const publicKey = new PublicKey(publicKeyStr);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Lamports'u SOL'a çevir
    } catch (error) {
      logger.error(`Solana bakiye sorgulama hatası: ${error.message}`);
      throw new Error('Bakiye sorgulanırken bir hata oluştu');
    }
  }

  async getTransactionHistory(publicKeyStr) {
    try {
      const publicKey = new PublicKey(publicKeyStr);
      const signatures = await this.connection.getSignaturesForAddress(publicKey);
      
      const transactions = await Promise.all(
        signatures.slice(0, 10).map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature);
          return {
            signature: sig.signature,
            timestamp: sig.blockTime,
            amount: tx?.meta?.postBalances[0] - tx?.meta?.preBalances[0],
            status: sig.confirmationStatus
          };
        })
      );

      return transactions;
    } catch (error) {
      logger.error(`Solana işlem geçmişi sorgulama hatası: ${error.message}`);
      throw new Error('İşlem geçmişi alınırken bir hata oluştu');
    }
  }

  validateAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async getWalletTokens(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const tokens = [];
      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const mintAddress = tokenInfo.mint;
        const balance = tokenInfo.tokenAmount.uiAmount;

        if (balance > 0) {  // Sadece bakiyesi olan tokenları listele
          try {
            const tokenData = await this.getTokenInfo(mintAddress);
            
            tokens.push({
              symbol: tokenData.symbol,
              name: tokenData.name,
              balance: balance,
              value: balance * tokenData.price,
              address: mintAddress
            });
          } catch (error) {
            logger.error(`Token bilgisi alma hatası (${mintAddress}): ${error.message}`);
            tokens.push({
              symbol: 'UNKNOWN',
              name: `Token (${mintAddress.slice(0, 8)}...)`,
              balance: balance,
              value: 0,
              address: mintAddress
            });
          }
        }
      }
      return tokens.sort((a, b) => b.value - a.value);
    } catch (error) {
      logger.error(`Cüzdan token listesi alma hatası: ${error.message}`);
      throw new Error('Token listesi alınamadı');
    }
  }
  async createTestToken(ownerPublicKeyStr, tokenName = 'Test Token', tokenSymbol = 'TEST', decimals = 9) {
    try {
      const ownerPublicKey = new PublicKey(ownerPublicKeyStr);
      const mintKeypair = Keypair.generate();
      const mint = await createMint(
        this.connection,
        ownerPublicKey, // payer
        ownerPublicKey, // mint authority
        ownerPublicKey, // freeze authority
        decimals,
        mintKeypair
      );
      const tokenAccount = await createAccount(
        this.connection,
        ownerPublicKey, // payer
        mint, // mint
        ownerPublicKey // owner
      );
      await mintTo(
        this.connection,
        ownerPublicKey, // payer
        mint, // mint
        tokenAccount, // destination
        ownerPublicKey, // authority
        1000 * (10 ** decimals) // amount
      );

      logger.info(`Test token oluşturuldu: ${mint.toBase58()}`);
      
      return {
        mint: mint.toBase58(),
        tokenAccount: tokenAccount.toBase58(),
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimals,
        amount: 1000
      };
    } catch (error) {
      logger.error(`Test token oluşturma hatası: ${error.message}`);
      throw error;
    }
  }
  async requestAirdrop(publicKeyStr, amount = 1) {
    try {
      const publicKey = new PublicKey(publicKeyStr);
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * 1000000000 // amount SOL to lamports
      );
      await this.connection.confirmTransaction(signature);
      logger.info(`Airdrop başarılı: ${amount} SOL -> ${publicKeyStr}`);
      return signature;
    } catch (error) {
      logger.error(`Airdrop hatası: ${error.message}`);
      throw new Error('Airdrop başarısız oldu');
    }
  }
}

module.exports = new SolanaService(); 