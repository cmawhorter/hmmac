import BaseScheme from './_base.js';

export default class PlainScheme extends BaseScheme {
  constructor(algorithm, encoding) {
    super(algorithm, encoding);
  }

  _headersSignedInRequest(req) {
    return (req.getHeader('x-auth-signedheaders') || '').toLowerCase().split(/\s*\;\s*/);
  }

  _signedHeaders(req) {
    let requestSignedHeaders  = this._headersSignedInRequest(req);
    let signedHeaders         = req.getSignedHeaders();
    signedHeaders.sort();
    return signedHeaders;
  }

  _canonicalHeadersForRequest(req, signedHeaders) {
    return signedHeaders.map(headerName => {
      headerName = headerName.toLowerCase();
      let headerValue = (req.getHeader(headerName) || '').trim();
      return `${headerName}:${headerValue}`;
    });
  }

  buildMessage(req) {
    let signedHeaders       = this._signedHeaders(req);
    let canonicalHeaders    = this._canonicalHeadersForRequest(req, signedHeaders);
    return [
      req.method,
      req.path,
      req.query,
      ...canonicalHeaders,
      '', // new line after headers
      signedHeaders.join(';'),
      this.hash(req.body, 'hex'),
    ].join('\n');
  }

  signMessage(message, key, secret) {
    return this.hmac(secret, message);
  }

  parse(authorizationHeaderValue) {
    let [serviceLabel, credentialTokens] = authorizationHeaderValue.split(/\s+/);
    let [key, signature] = credentialTokens.split(':');
    return { serviceLabel, key, signature };
  }

  format(req, key, secret) {
    let message           = this.buildMessage(req);
    let signature         = this.signMessage(message, secret);
    return `${this.serviceLabelPrefixed}${key}:${signature}`;
  }
}
