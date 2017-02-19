import { hash as createHash, hmac as createHmac } from '../lib/signing.js';

const SERVICE_LABEL           = 'HMAC';
const SERVICE_LABEL_SEPARATOR = ' ';

export default class BaseScheme {
  constructor(algorithm, encoding) {
    this.algorithm  = algorithm || 'sha256';
    this.encoding   = encoding || 'hex';
  }

  get serviceLabel() {
    return SERVICE_LABEL;
  }

  get serviceLabelSeparator() {
    return SERVICE_LABEL_SEPARATOR;
  }

  get serviceLabelPrefixed() {
    return `${this.serviceLabel}${this.serviceLabelSeparator}`;
  }

  hash(message, encoding) {
    return createHash(this.algorithm, encoding || this.encoding, message);
  }

  hmac(key, message, encoding) {
    return createHmac(this.algorithm, encoding || this.encoding, key, message);
  }

  buildMessage(req) {
    throw new Error('must inherit');
  }

  signMessage(message, key, secret) {
    throw new Error('must inherit');
  }

  parse(authorizationHeaderValue) {
    throw new Error('must inherit');
  }

  format(req, key, secret) {
    throw new Error('must inherit');
  }
}
