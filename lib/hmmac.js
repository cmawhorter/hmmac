/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

var crypto = require('crypto');

var schemeLoader = {
  load: function(scheme) {
    scheme = scheme.toLowerCase();
    var includedSchemes = [ 'plain', 'aws4' ];
    if (false === includedSchemes.indexOf(scheme)) throw new Error('Invalid hmmac scheme.  Included schemes are ' + includedSchemes.join(', '));
    return require('./schemes/' + scheme);
  }
};

var defCredentialProvider = function(key, callback) {
  throw new Error('Hmmac::credentialProvider.  You have not specified a credential provider in your Hmmac options.  This is the default being called right now.');
};

var DEFAULTS = {
  algorithm: 'sha256',
  acceptableDateSkew: 900, // in seconds, def 15 minutes. only done if date is signed
  credentialProvider: defCredentialProvider,
  credentialProviderTimeout: 15, // in seconds. time to wait for credentialProvider to return
  signatureEncoding: 'hex', // signature encoding. valid = null (binary), hex or base64
  signedHeaders: [ 'host', 'content-type', 'date' ],
  wwwAuthenticateRealm: 'API',
  scheme: schemeLoader.load('plain'),
  debug: process.env.NODE_ENV == 'development' ? 1 : 0
};

function Hmmac(opts) {
  opts = opts || {};
  this.config = {};

  // load defaults
  for (var i in DEFAULTS) {
    this.config[i] = DEFAULTS[i];
  }

  // load passed
  for (var i in opts) {
    this.config[i] = opts[i];
  }

  if (!this.config.scheme) throw new Error('Hmmac: The configured scheme is invalid.');
}

Hmmac.prototype.log = function() {
  if (!this.config.debug || this.config.debug < 2) return;
  if (arguments.length == 1) console.log(arguments[0]);
  else console.log('Hmmac', arguments);
};

Hmmac.prototype.isRequestish = function(req) {
  if (!req || typeof req != 'object') return false;
  if (req._hmmac) req = req.original; // unwrap
  return !!req && !!req.headers;
};

Hmmac.prototype.isCredentials = function(credentials) {
  if (!credentials || typeof credentials != 'object') return false;
  return !!credentials.key && !!credentials.secret;
};

Hmmac.prototype.isParsedAuth = function(parsedAuth) {
  if (!parsedAuth || typeof parsedAuth != 'object') return false;
  return !!parsedAuth.key && !!parsedAuth.signature && !!parsedAuth.serviceLabel;
};

Hmmac.prototype.validateSync = function(req, credentials) {
  req = this._wrap(req);

  if (!this.isRequestish(req) || !req.original.headers['authorization']) {
    this.log('Hmmac::validateSync: Invalid Request Object')
    return false;
  }

  if (!this.isCredentials(credentials)) {
    this.log('Hmmac::validateSync: Invalid Credentials Object')
    return false;
  }

  var parsedAuth = this.config.scheme.parseAuthorization.call(this, req);
  if (!this.isParsedAuth(parsedAuth)) return false;

  return this._validate(req, credentials, parsedAuth);
};

Hmmac.prototype.validate = function(req, callback) {
  req = this._wrap(req);

  if (!this.isRequestish(req) || !req.original.headers['authorization']) {
    this.log('Hmmac::validateSync: Invalid Request Object')
    return callback(false);
  }

  if (typeof callback != 'function') throw new Error('Hmmac::validate: Callback is not a function');

  var self = this
    , parsedAuth = this.config.scheme.parseAuthorization.call(self, req)
    , cbDestruct = function(res, key) {
        callback(res, key);
        callback = null;
        if (cpTimeout) clearTimeout(cpTimeout);
      }
    , cpTimeout = setTimeout(function() {
        cbDestruct(null);
      }, self.config.credentialProviderTimeout * 1000);

  if (!this.isParsedAuth(parsedAuth)) return cbDestruct(null, null);

  var _credentialProviderHandler = function(credentials) {
    if (!callback) return; // callback destructed
    var key = (credentials || {}).key;
    if (!self.isCredentials(credentials)) return cbDestruct(null, key);
    return cbDestruct(self._validate(req, credentials, parsedAuth), key);
  };

  if (self.config.credentialProvider.length === 3) {
    self.config.credentialProvider(req.original, parsedAuth.key, _credentialProviderHandler);
  }
  else {
    self.config.credentialProvider(parsedAuth.key, _credentialProviderHandler);
  }
};

Hmmac.prototype.sign = function(req, credentials, returnSignature) {
  req = this._wrap(req);
  if (!this.isRequestish(req)) throw new Error('Hmmac::sign: Not a valid request object');

  var signature = this._sign(req, credentials)
    , auth = this.config.scheme.buildAuthorization.call(this, req, credentials.key, signature);

  if (returnSignature) return auth.value;
  else req.original.headers[auth.key] = auth.value;
};

Hmmac.prototype.why = function() {
  if (!this.config.debug) return;
  console.log('Canonical Request (START)\n"%s"\n(END)', this._lastCanonicalRequest);
  console.log('Request Body (START)\n"%s"\n(END)', this._lastRequestBody);
  console.log('String to Sign (START)\n"%s"\n(END)', this._lastStringToSign);
};

Hmmac.prototype._validate = function(req, credentials, parsedAuth) {
  this._normalizedHeaders(req);
  if (!this.isRequestish || !this.isCredentials || !this.isParsedAuth(parsedAuth)) return false;

  var passedSignature = parsedAuth.signature
    , compareSignature;

  // failed signatures immediately fail
  try {
    compareSignature = this._sign(req, credentials);
  }
  catch(err) {
    this.log(err);
    return false;
  }

  // if date and x-date aren't signed headers, then we don't do skew check
  if (~req.signedHeaders.indexOf('date')) {
    if (!req.original.headers['date'] || !this._checkSkew(req)) {
      this.log('Date Skew Expired', req.original.headers['date']);
      return false;
    }
  } else if (~req.signedHeaders.indexOf('x-date')) {
    if (!req.original.headers['x-date'] || !this._checkSkew(req)) {
      this.log('Date Skew Expired', req.original.headers['x-date']);
      return false;
    }
  }


  this.log('Comparing', passedSignature, compareSignature);

  // slow equals
  var diff = passedSignature.length ^ compareSignature.length;
  for (var i = 0; i < passedSignature.length && i < compareSignature.length; i++) {
    diff |= passedSignature[i] ^ compareSignature[i];
  }

  return diff === 0;
};

Hmmac.prototype._sign = function(req, credentials) {
  this._normalizedHeaders(req);
  req.signedHeaders = req.signedHeaders || this.config.signedHeaders;
  if (!this.isRequestish || !this.isCredentials) throw new Error('Hmmac::_sign: Cannot sign invalid request');

  try {
    return this.config.scheme.sign.call(this, req, credentials);
  }
  catch(err) {
    this.log(err);
    throw new Error('Hmmac::_sign: Unable to sign the request because: ' + err.message);
  }
};

Hmmac.prototype._hash = function(message, encoding) {
  encoding = encoding || null;
  var hash = crypto.createHash(this.config.algorithm);
  hash.update(message);
  return hash.digest(encoding);
};

Hmmac.prototype._hmac = function(message, key, encoding) {
  encoding = encoding || null;
  var hmac = crypto.createHmac(this.config.algorithm, key);
  hmac.update(message);
  return hmac.digest(encoding);
};

Hmmac.prototype._wrap = function(obj) {
  return {
    _hmmac: true,
    original: obj
  };
};

Hmmac.prototype._normalizedHeaders = function(req) {
  if (!this.isRequestish(req)) return;

  var headerKeys = []
    , normal = {};

  if (!req.original.headers.hasOwnProperty('host')) req.original.headers['host'] = req.original.host + (req.original.hasOwnProperty('port') ? ':' + req.original.port : '');

  for (var k in req.original.headers) headerKeys.push(k);
  headerKeys.sort();

  headerKeys.forEach(function(headerKey) {
    normal[headerKey.toLowerCase()] = req.original.headers[headerKey];
  });

  req.original.headers = normal;
};

// body can be in multiple places, and there is no guarantee it exists
Hmmac.prototype._body = function(req) {
  var body;
  if ('body' in req.original) {
    body = req.original.body;
  }
  else if ('_body' in req.original) {
    body = req.original._body;
  }
  else {
    body = '';
  }

  if (typeof body !== 'string') {
    // XXX: some version of express always set req.body to an empty object.  this isn't perfect,
    //      but a GET request shouldn't contain a body (.net doesn't allow it at all in WebClient IIRC)
    //      so we detect an empty object GET and replace with an empty string
    if (req.original.method === 'GET' && Object.keys(body).length === 0) {
      body = '';
    }
    else {
      body = JSON.stringify(body);
    }
  }
  return body;
};

Hmmac.prototype._checkSkew = function(req) {
  if (!this.config.acceptableDateSkew) return true;
  if (!this.isRequestish(req) || (!req.original.headers['date'] && !req.original.headers['x-date'])) return false;
  
  var myDate = req.original.headers['date'] ? req.original.headers['date'] : req.original.headers['x-date'];
  try {
    var msskew = (this.config.acceptableDateSkew * 1000)
      , now = new Date()
      , then = new Date(myDate)
      , diff = Math.abs(now.getTime() - then.getTime());

    if (isNaN(diff)) diff = Infinity;

    return diff < msskew;
  }
  catch (err) {
    this.log(err);
    return false;
  }
};

/////////

Hmmac.schemes = schemeLoader;

Hmmac.middleware = function(opts, customResponder) {
  var hmmac = !!opts && opts instanceof Hmmac ? opts : new Hmmac(opts);
  if (hmmac.config.credentialProvider === defCredentialProvider) throw new Error('Hmmac::middleware requires a credentialProvider to work');

  customResponder = customResponder || function(valid, req, res, next) {
    if (true === valid) {
      return next();
    }
    else {
      res.statusCode = 401;
      if (hmmac.config.wwwAuthenticateRealm) {
        res.setHeader('WWW-Authenticate', hmmac.config.scheme.getServiceLabel.call(hmmac) + ' realm="' + hmmac.config.wwwAuthenticateRealm.replace(/"/g, '\'') + '"');
      }
      return next(new Error('Unauthorized'));
    }
  };

  return function (req, res, next) {

    hmmac.validate(req, function(valid, key) {
      if (customResponder.length === 5) {
        return customResponder.apply(this, [valid, key, req, res, next]);
      }
      else {
        return customResponder.apply(this, [valid, req, res, next]);
      }
    });
  };
};

//////////

module.exports = Hmmac;
