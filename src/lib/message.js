import { hash as createHash, hmac as createHmac } from './signing.js';

export default class Message {
  constructor(algorithm, encoding, message) {
    this.algorithm  = algorithm;
    this.encoding   = encoding;
    this.meta       = {};
    this.message    = typeof message === 'string' ? message : null;
  }

  get messageIsValid() {
    return typeof this.message === 'string';
  }

  hash() {
    if (!this.messageIsValid) {
      throw new Error('cannot hash; message is invalid: ' + this.message);
    }
    return createHash(this.algorithm, this.encoding, this.message);
  }

  sign(signingKey) {
    if (!this.messageIsValid) {
      throw new Error('cannot sign; message is invalid: ' + this.message);
    }
    return createHmac(this.algorithm, this.encoding, signingKey, this.message);
  }

  toString() {
    return this.message;
  }
}

Message.BINARY = 'binary';
Message.HEX    = 'hex';
