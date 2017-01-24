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
  return getAwsISO8601Date(dt).split('T')[0];
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

function getAwsISO8601Date(dt) {
  var d = new Date(dt)
    , s = d.toISOString().replace(/[^\dT]/g, '');

  return s.substr(0, s.length - 3) + 'Z'; // trim milli
}

function convertAwsISO8601DateToStd(dt) {
  // 20111014T235959Z
  var parts = dt.split('Z')[0].split('T')
    , d = parts[0]
    , t = parts[1]
    , dYear = d.substr(0, 4)
    , dMonth = d.substr(4, 2)
    , dDay = d.substr(6, 2)
    , tHour = t.substr(0, 2)
    , tMinute = t.substr(2, 2)
    , tSecond = t.substr(4, 2)
    , fixedDate = [ dYear, dMonth, dDay ].join('-')
    , fixedTime = [ tHour, tMinute, tSecond ].join(':')
    , fixedDateTime = [ fixedDate, 'T', fixedTime, 'Z' ].join('');

  return new Date(fixedDateTime).toISOString();
}

function getHeaderDate(headers) {
  if ('x-amz-date' in headers) {
    return convertAwsISO8601DateToStd(headers['x-amz-date']);
  }
  else {
    return headers['date'];
  }
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

    var body = this._body(req);
    var path = typeof req.original.path == 'function' ? req.original.path() : req.original.path || req.original.url;
    var query = typeof req.original.query == 'function' ? req.original.query() : req.original.query || {};
    if (typeof query == 'object') query = querystring.stringify(query);

    var CanonicalRequest =
        req.original.method.toUpperCase() + '\n' +
        path + '\n' +
        query + '\n' +
        CanonicalHeaders + '\n' +
        req.signedHeaders.join(';') + '\n' +
        this._hash(body, 'hex');

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    var suppliedDate = getHeaderDate(req.original.headers);
    var CredentialScope = [getCredentialDate(suppliedDate), (this.config.schemeConfig.region || _defRegion), (this.config.schemeConfig.service || _defService), 'aws4_request'].join('/');
    var HashedCanonicalRequest = this._hash(CanonicalRequest, 'hex');
    var StringToSign  =  [
        'AWS4-HMAC-' + this.config.algorithm.toUpperCase(),
        getAwsISO8601Date(suppliedDate),
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
    var suppliedDate = getHeaderDate(req.original.headers);
    var credential = [
        key,
        getCredentialDate(suppliedDate),
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

    var headerDate = getHeaderDate(req.original.headers);
    var query = typeof req.original.query === 'function' ? req.original.query() : req.original.query || {};
    if (typeof query === 'string') {
      query = querystring.parse(query);
    }


    // if both query date and header date are supplied they should match exactly
    if ('x-amz-date' in query && headerDate && query['x-amz-date'] !== headerDate) {
      return null;
    }

    var suppliedDate = query['x-amz-date'] || headerDate;
    var kDate = this._hmac(getCredentialDate(suppliedDate), 'AWS4' + credentials.secret)
      , kRegion = this._hmac(this.config.schemeConfig.region || _defRegion, kDate)
      , kService = this._hmac(this.config.schemeConfig.service || _defService, kRegion)
      , kSigning = this._hmac('aws4_request', kService);

    var message = this.config.scheme.buildMessageToSign.call(this, req);
    return this._hmac(message, kSigning, this.config.signatureEncoding);
  }

};

module.exports = scheme;
