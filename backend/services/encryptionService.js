// services/encryptionService.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long-here',
      'salt',
      32
    );
  }

  encrypt(text,iv='username') {
    //const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  decrypt(encryptedText, ivHex ) {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm , this.key, iv );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = new EncryptionService();