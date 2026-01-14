'use strict';

class WalletError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.details = details;
  }
}

module.exports = { WalletError };
