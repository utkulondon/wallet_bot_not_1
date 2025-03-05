const crypto = require('crypto');
const logger = require('../utils/logger');

class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.decryptedKeys = new Map(); // RAM'de geçici olarak tutulacak
  }
  encrypt(text, password) {
    try {
      const salt = crypto.randomBytes(32);
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      logger.error(`Şifreleme hatası: ${error.message}`);
      throw new Error('Şifreleme işlemi başarısız oldu');
    }
  }
  decrypt(encryptedData, password) {
    try {
      const { encrypted, iv, authTag, salt } = encryptedData;
      const key = crypto.pbkdf2Sync(
        password, 
        Buffer.from(salt, 'hex'),
        100000,
        32,
        'sha256'
      );

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error(`Şifre çözme hatası: ${error.message}`);
      throw new Error('Şifre çözme işlemi başarısız oldu');
    }
  }
  storeDecryptedKey(userId, network, privateKey) {
    const key = `${userId}-${network}`;
    this.decryptedKeys.set(key, privateKey);
    setTimeout(() => {
      this.decryptedKeys.delete(key);
    }, 60 * 60 * 1000);
  }
  getDecryptedKey(userId, network) {
    const key = `${userId}-${network}`;
    return this.decryptedKeys.get(key);
  }
  removeDecryptedKey(userId, network) {
    const key = `${userId}-${network}`;
    this.decryptedKeys.delete(key);
  }
}

module.exports = new CryptoService(); 