import crypto from 'crypto';

const createHash = crypto.createHash;
const createHmac = crypto.createHmac;

// babel doesn't like this
// import { createHash, createHmac } from 'crypto';

export function hash(algorithm, encoding, message) {
  return crypto.createHash(algorithm).update(message).digest(encoding);
}

export function hmac(algorithm, encoding, key, message) {
  return crypto.createHmac(algorithm, key).update(message).digest(encoding);
}
