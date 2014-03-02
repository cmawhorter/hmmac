/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

var querystring = require('querystring');

var scheme = {
  authorizationHeader: 'authorization',

  getServiceLabel: function() {
    return 'HMAC';
  },

  buildMessageToSign: function(req) {
    req.signedHeaders.sort();

    var CanonicalHeaders = '';
    for (var i=0; i < req.signedHeaders.length; i++) {
      var headerKey = req.signedHeaders[i]
        , v = req.original.headers.hasOwnProperty(headerKey) ? req.original.headers[headerKey] : '';
      CanonicalHeaders += headerKey.toLowerCase() + ':' + v.trim() + '\n';
    }

    var body = typeof req.original.body == 'string' ? req.original.body : req.original._body || '';
    var path = typeof req.original.path == 'function' ? req.original.path() : req.original.path || req.original.url;
    var query = typeof req.original.query == 'function' ? req.original.query() : req.original.query || {};
    if (typeof query == 'object') query = querystring.stringify(query);

    var CanonicalRequest =
        req.original.method.toUpperCase() + '\n' +
        path + '\n' +
        query + '\n' +
        CanonicalHeaders + '\n' +
        req.signedHeaders.join(';') + '\n' +
        this._hash(body || '', 'hex');

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    // console.log(CanonicalRequest, body);

    return CanonicalRequest;
  },

  parseAuthorization: function(req) {
    try {
      // HMAC key:signature
      var toks = req.original.headers[this.config.scheme.authorizationHeader].split(' ')
        , sl = toks[0].trim()
        , credtoks = toks[1].split(':');

      if (!req.original.headers['x-auth-signedheaders']) throw new Error('Hmmac scheme(plain)::parseAuthorization: Request does not contain an x-auth-signedheaders header');

      req.signedHeaders = req.original.headers['x-auth-signedheaders'].toLowerCase().split(/\s*\;\s*/);

      return {
        serviceLabel: sl,
        key: credtoks[0],
        signature: credtoks[1]
      };
    }
    catch (err) {
      this.log(err);
      return null;
    }
  },

  buildAuthorization: function(req, key, signature) {
    return {
      key: this.config.scheme.authorizationHeader,
      value: this.config.scheme.getServiceLabel.call(this) + ' ' + key + ':' + signature
    };
  },

  sign: function(req, credentials) {
    if (this.config.debug) this._lastRequest = req;
    var message = this.config.scheme.buildMessageToSign.call(this, req);
    req.original.headers['x-auth-signedheaders'] = req.signedHeaders.join(';');
    return this._hmac(message, credentials.secret, this.config.signatureEncoding);
  }

};

module.exports = scheme;