export default class HmmacSigningScheme {
  constructor(algorithm, encoding) {
    this.algorithm  = algorithm;
    this.encoding   = encoding;
  }

  get serviceLabel() {
    return 'HMAC';
  }

  get serviceLabelSeparator() {
    return String.fromCharCode(32);
  }

  get prefix() {
    return `${this.serviceLabel}${this.serviceLabelSeparator}`;
  }

  _validate(req, signedHeaders) {
    throw new Error('must inherit');
  }

  validate(req, signedHeaders) {
    return this._validate(req, signedHeaders);
  }

  _buildMessage(req, signedHeaders) {
    throw new Error('must inherit');
  }

  buildMessage(req, signedHeaders) {
    return this._buildMessage(req, signedHeaders);
  }

  _signMessage(message, key, secret) {
    throw new Error('must inherit');
  }

  signMessage(message, key, secret) {
    return this._signMessage(message, key, secret);
  }

  validHeader(authorizationHeaderValue, strict) {
    let prefix = strict ? this.prefix : this.prefix.toLowerCase();
    let value  = strict ? authorizationHeaderValue : authorizationHeaderValue.toLowerCase();
    return 0 === authorizationHeaderValue.indexOf(prefix);
  }

  _parseHeader(authorizationHeaderValue) {
    throw new Error('must inherit');
  }

  parseHeader(authorizationHeaderValue) {
    if (!this.validHeader(authorizationHeaderValue)) return null;
    return this._parseHeader(authorizationHeaderValue);
  }

  _format(req, signedHeaders, key, secret) {
    throw new Error('must inherit');
  }

  format(req, signedHeaders, key, secret) {
    return this._format(req, signedHeaders, key, secret);
  }
}
