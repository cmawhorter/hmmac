import HmmacSigningScheme from './_base.js';
import Message from '../lib/message.js';

export default class PlainScheme extends HmmacSigningScheme {
  constructor(options) {
    options = options || {};
    super(options.algorithm || 'sha256', options.encoding || Message.HEX);
  }

  _validate(req, signedHeaders) {
    let containsAllSignedHeaders = true;
    for (let headerName of signedHeaders) {
      containsAllSignedHeaders = containsAllSignedHeaders && req.hasHeader(headerName);
    }
    let validationErrors = [];
    if (!containsAllSignedHeaders) {
      validationErrors.push(`invalid request; these headers must be signed: ${signedHeaders.join(', ')}`);
    }
    if (validationErrors.length) {
      return new Error('validation failed; ' + validationErrors.join('\n'));
    }
    else {
      return null;
    }
  }

  _canonicalHeadersForRequest(req, signedHeaders) {
    return signedHeaders.map(headerName => {
      headerName = headerName.toLowerCase();
      let headerValue = (req.getHeader(headerName) || '').trim();
      return `${headerName}:${headerValue}`;
    });
  }

  _buildMessage(req, signedHeaders) {
    let canonicalHeaders  = this._canonicalHeadersForRequest(req, signedHeaders);
    let message = new Message(this.algorithm, this.encoding, [
      req.method,
      req.path,
      req.query,
      ...canonicalHeaders,
      '', // new line after headers
      signedHeaders.join(';'),
      this.hash(req.body, 'hex'),
    ].join('\n'));
    return message;
  }

  _signMessage(message, key, secret) {
    return message.sign(secret);
  }

  _parseHeader(authorizationHeaderValue) {
    let [serviceLabel, credentialTokens] = authorizationHeaderValue.split(/\s+/);
    let [key, signature] = credentialTokens.split(':');
    return { serviceLabel, key, signature };
  }

  _format(req, signedHeaders, key, secret) {
    let message   = this.buildMessage(req, signedHeaders);
    let signature = this.signMessage(message, key, secret);
    return `${this.prefix}${key}:${signature}`;
  }
}
