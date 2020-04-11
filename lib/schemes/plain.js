/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const querystring = require('querystring');

const scheme = {
  authorizationHeader: 'authorization',

  getServiceLabel() {
    return 'HMAC';
  },

  buildMessageToSign(req) {
    req.signedHeaders.sort();

    let CanonicalHeaders = '';

    for (let i = 0; i < req.signedHeaders.length; i += 1) {
      const headerKey = req.signedHeaders[i];
      const v = Object.prototype.hasOwnProperty.call(
        req.original.headers,
        headerKey,
      )
        ? req.original.headers[headerKey]
        : '';
      CanonicalHeaders += `${headerKey.toLowerCase()}:${v.trim()}\n`;
    }

    const body = this._body(req);
    const url = req.original.originalUrl || req.original.path;
    const path = typeof url === 'function' ? url() : url || req.original.url;
    let query =
      typeof req.original.query === 'function'
        ? req.original.query()
        : req.original.query || {};
    if (typeof query === 'object') query = querystring.stringify(query);

    const CanonicalRequest = `${req.original.method.toUpperCase()}\n${path}\n${query}\n${CanonicalHeaders}\n${req.signedHeaders.join(
      ';',
    )}\n${this._hash(body, 'hex')}`;

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    // console.log(CanonicalRequest, body);

    return CanonicalRequest;
  },

  parseAuthorization(req) {
    try {
      // HMAC key:signature
      const toks = req.original.headers[
        this.config.scheme.authorizationHeader
      ].split(' ');
      const sl = toks[0].trim();
      const credtoks = toks[1].split(':');

      if (!req.original.headers['x-auth-signedheaders']) {
        throw new Error(
          'Hmmac scheme(plain)::parseAuthorization: Request does not contain an x-auth-signedheaders header',
        );
      }

      req.signedHeaders = req.original.headers['x-auth-signedheaders']
        .toLowerCase()
        .split(/\s*;\s*/);

      return {
        serviceLabel: sl,
        key: credtoks[0],
        signature: credtoks[1],
      };
    } catch (err) {
      this.log(err);

      return null;
    }
  },

  buildAuthorization(req, key, signature) {
    return {
      key: this.config.scheme.authorizationHeader,
      value: `${this.config.scheme.getServiceLabel.call(
        this,
      )} ${key}:${signature}`,
    };
  },

  sign(req, credentials) {
    if (this.config.debug) this._lastRequest = req;
    const message = this.config.scheme.buildMessageToSign.call(this, req);
    req.original.headers['x-auth-signedheaders'] = req.signedHeaders.join(';');

    return this._hmac(
      message,
      credentials.secret,
      this.config.signatureEncoding,
    );
  },
};

module.exports = scheme;
