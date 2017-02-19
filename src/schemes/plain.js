import BaseScheme from './_base.js';

export default class PlainScheme extends BaseScheme {
  constructor() {
    super();
  }

  _headersSignedInRequest(req) {
    return (req.getHeader('x-auth-signedheaders') || '').toLowerCase().split(/\s*\;\s*/);
  }

  _signedHeaders(req) {
    let requestSignedHeaders = this._headersSignedInRequest(req);
    let signedHeaders = req.getSignedHeaders();
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

  message(req, options) {
    let signedHeaders     = this._signedHeaders(req);
    let canonicalHeaders  = this._canonicalHeadersForRequest(req, signedHeaders);
    return [
      req.method,
      req.path,
      req.query,
      ...canonicalHeaders,
      signedHeaders.join(';'),
      this._hash(req.body, 'hex'),
    ].join('\n');
  }

  parse(authorizationHeaderValue, options) {
    let [serviceLabel, credentialTokens] = authorizationHeaderValue.split(/\s+/);
    let [key, signature] = credentialTokens.split(':');
    return { serviceLabel, key, signature };
  }

  build(req, key, secret, options) {
    var signature = 'TODO:';
    return `${this.serviceLabelPrefixed}${key}:${signature}`;
  }
}

// ?
  // sign: function(req, credentials) {
  //   if (this.config.debug) this._lastRequest = req;
  //   var message = this.config.scheme.buildMessageToSign.call(this, req);
  //   req.original.headers['x-auth-signedheaders'] = req.signedHeaders.join(';');
  //   return this._hmac(message, credentials.secret, this.config.signatureEncoding);
  // }
