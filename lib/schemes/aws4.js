/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// AWS Signature Version 4: http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

var querystring = require('querystring');

function getCredentialDate(dt) {
  var d = new Date(dt);
  return d.getFullYear().toString() + pad(d.getMonth()+1) + pad(d.getDate());
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

function getAwsISO8601Date(dt) {
  var d = new Date(dt)
    , s = d.toISOString().replace(/[^\dT]/g, '');

  return s.substr(0, s.length - 3) + 'Z'; // trim milli
}

var _defRegion = 'no-region'
  , _defService = 'no-service';

var scheme = {
  authorizationHeader: 'authorization',

  getServiceLabel: function() {
    return 'AWS4-HMAC-' + this.config.algorithm.toUpperCase();
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
    var query = querystring.stringify(typeof req.original.query == 'function' ? req.original.query() : req.original.query || '');

    var CanonicalRequest =
        req.original.method.toUpperCase() + '\n' +
        path + '\n' +
        query + '\n' +
        CanonicalHeaders + '\n' +
        req.signedHeaders.join(';') + '\n' +
        this._hash(body || '', 'hex');

    // console.log(req)

    // console.log('======');
    // console.log('======');
    // console.log('CanonicalRequest:');
    // console.log(CanonicalRequest);
    // console.log('======');
    // console.log('Body', body);
    // console.log('======');
    // console.log('======');

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    var CredentialScope = [getCredentialDate(req.original.headers['date']), (this.config.schemeConfig.region || _defRegion), (this.config.schemeConfig.service || _defService), 'aws4_request'].join('/');
    var HashedCanonicalRequest = this._hash(CanonicalRequest, 'hex');
    var StringToSign  =  [
        'AWS4-HMAC-' + this.config.algorithm.toUpperCase(),
        getAwsISO8601Date(req.original.headers['date']),
        CredentialScope,
        HashedCanonicalRequest
      ].join('\n');

    if (this.config.debug) {
      this._lastStringToSign = StringToSign;
    }

    return StringToSign;
  },

  parseAuthorization: function(req) {
    try {
      // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=ced6826de92d2bdeed8f846f0bf508e8559e98e4b0199114b84c54174deb456c
      var sl = req.original.headers[this.config.scheme.authorizationHeader].split(' ', 1)[0].trim()
        , rawprops = req.original.headers[this.config.scheme.authorizationHeader].substr(sl.length).split(',')
        , props = {};

      for (var i=0; i < rawprops.length; i++) {
        var parts = rawprops[i].split('=');
        props[ parts[0].toLowerCase().trim() ] = parts[1].trim();
      }

      var credparts = props['credential'].split('/')
        , key = credparts.shift();

      req.signedHeaders = props['signedheaders'].toLowerCase().split(/\s*\;\s*/);

      return {
        serviceLabel: sl,
        key: key,
        signature: props['signature'],
        schemeConfig: credparts
      };
    }
    catch (err) {
      this.log(err);
      return null;
    }
  },

  buildAuthorization: function(req, key, signature) {
    if (typeof this.config.schemeConfig == 'undefined') this.config.schemeConfig = {};
    var credential = [
        key,
        getCredentialDate(req.original.headers['date']),
        (this.config.schemeConfig.region || _defRegion),
        (this.config.schemeConfig.service || _defService),
        'aws4_request'
      ].join('/');

    return {
      key: this.config.scheme.authorizationHeader,
      value: this.config.scheme.getServiceLabel.call(this) + ' Credential=' + credential + ', SignedHeaders=' + req.signedHeaders.join(';') + ', Signature=' + signature
    };
  },

  sign: function(req, credentials) {
    if (this.config.debug) this._lastRequest = req;
    if (typeof this.config.schemeConfig == 'undefined') this.config.schemeConfig = {};
    var kDate = this._hmac('AWS4' + credentials.secret, getCredentialDate(req.original.headers['date']))
      , kRegion = this._hmac(kDate, this.config.schemeConfig.region || _defRegion)
      , kService = this._hmac(kRegion, this.config.schemeConfig.service || _defService)
      , kSigning = this._hmac(kService, 'aws4_request');

    var message = this.config.scheme.buildMessageToSign.call(this, req);
    return this._hmac(message, kSigning, this.config.signatureEncoding);
  }

};

module.exports = scheme;
