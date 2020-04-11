/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const crypto = require('crypto');

const schemeLoader = {
  load(schemeParam) {
    let scheme = schemeParam;
    scheme = scheme.toLowerCase();
    const includedSchemes = ['plain', 'aws4'];

    if (includedSchemes.indexOf(scheme) === false) {
      throw new Error(
        `Invalid hmmac scheme.  Included schemes are ${includedSchemes.join(
          ', ',
        )}`,
      );
    }

    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(`./schemes/${scheme}`);
  },
};

// eslint-disable-next-line no-unused-vars
const defCredentialProvider = (key, callback) => {
  throw new Error(
    'Hmmac::credentialProvider.  You have not specified a credential provider in your Hmmac options.  This is the default being called right now.',
  );
};

const DEFAULTS = {
  algorithm: 'sha256',
  acceptableDateSkew: 900, // in seconds, def 15 minutes. only done if date is signed
  credentialProvider: defCredentialProvider,
  credentialProviderTimeout: 15, // in seconds. time to wait for credentialProvider to return
  signatureEncoding: 'hex', // signature encoding. valid = null (binary), hex or base64
  signedHeaders: ['host', 'content-type', 'date'],
  wwwAuthenticateRealm: 'API',
  scheme: schemeLoader.load('plain'),
  debug: process.env.NODE_ENV === 'development' ? 1 : 0,
};

class Hmmac {
  constructor(opts = {}) {
    this.config = { ...DEFAULTS, ...opts };

    if (!this.config.scheme) {
      throw new Error('Hmmac: The configured scheme is invalid.');
    }
  }

  isRequestish(req) {
    let thisReq = { ...req };
    if (!thisReq || typeof thisReq !== 'object') return false;
    if (thisReq._hmmac) thisReq = thisReq.original; // unwrap

    return !!thisReq && !!thisReq.headers;
  }

  isCredentials(credentials) {
    if (!credentials || typeof credentials !== 'object') return false;

    return !!credentials.key && !!credentials.secret;
  }

  isParsedAuth(parsedAuth) {
    if (!parsedAuth || typeof parsedAuth !== 'object') return false;

    return (
      !!parsedAuth.key && !!parsedAuth.signature && !!parsedAuth.serviceLabel
    );
  }

  _wrap(obj) {
    return {
      _hmmac: true,
      original: obj,
    };
  }

  // body can be in multiple places, and there is no guarantee it exists
  _body(req) {
    let body;

    if ('body' in req.original) {
      body = req.original.body;
    } else if ('_body' in req.original) {
      body = req.original._body;
    } else {
      body = '';
    }

    if (typeof body !== 'string') {
      // XXX: some version of express always set req.body to an empty object.  this isn't perfect,
      //      but a GET request shouldn't contain a body (.net doesn't allow it at all in WebClient IIRC)
      //      so we detect an empty object GET and replace with an empty string
      if (req.original.method === 'GET' && Object.keys(body).length === 0) {
        body = '';
      } else {
        body = JSON.stringify(body);
      }
    }

    return body;
  }

  log(...args) {
    if (!this.config.debug || this.config.debug < 2) {
      return;
    }

    if (args.length === 1) {
      // eslint-disable-next-line no-console
      console.log(args[0]);
      // eslint-disable-next-line no-console
    } else console.log('Hmmac', args);
  }

  validateSync(req, credentials) {
    const wrappedReq = this._wrap(req);

    if (
      !this.isRequestish(wrappedReq) ||
      !wrappedReq.original.headers.authorization
    ) {
      this.log('Hmmac::validateSync: Invalid Request Object');

      return false;
    }

    if (!this.isCredentials(credentials)) {
      this.log('Hmmac::validateSync: Invalid Credentials Object');

      return false;
    }

    const parsedAuth = this.config.scheme.parseAuthorization.call(
      this,
      wrappedReq,
    );
    if (!this.isParsedAuth(parsedAuth)) return false;

    return this._validate(wrappedReq, credentials, parsedAuth);
  }

  validate(req, callback) {
    const wrappedReq = this._wrap(req);

    if (
      !this.isRequestish(wrappedReq) ||
      !wrappedReq.original.headers.authorization
    ) {
      this.log('Hmmac::validateSync: Invalid Request Object');

      return callback(false);
    }

    if (typeof callback !== 'function') {
      throw new Error('Hmmac::validate: Callback is not a function');
    }

    const self = this;
    const parsedAuth = this.config.scheme.parseAuthorization.call(
      self,
      wrappedReq,
    );

    let cpTimeout;

    const cbDestruct = (res, key) => {
      callback(res, key);
      // eslint-disable-next-line no-param-reassign
      callback = null;
      if (cpTimeout) clearTimeout(cpTimeout);
    };
    cpTimeout = setTimeout(() => {
      cbDestruct(null);
    }, self.config.credentialProviderTimeout * 1000);

    if (!this.isParsedAuth(parsedAuth)) return cbDestruct(null, null);

    const _credentialProviderHandler = (credentials) => {
      if (!callback) return undefined; // callback destructed
      const { key } = credentials || {};
      if (!self.isCredentials(credentials)) return cbDestruct(null, key);

      return cbDestruct(
        self._validate(wrappedReq, credentials, parsedAuth),
        key,
      );
    };

    if (self.config.credentialProvider.length === 3) {
      self.config.credentialProvider(
        wrappedReq.original,
        parsedAuth.key,
        _credentialProviderHandler,
      );
    } else {
      self.config.credentialProvider(
        parsedAuth.key,
        _credentialProviderHandler,
      );
    }

    return undefined;
  }

  sign(req, credentials, returnSignature) {
    const wrappedReq = this._wrap(req);

    if (!this.isRequestish(wrappedReq)) {
      throw new Error('Hmmac::sign: Not a valid request object');
    }

    const signature = this._sign(wrappedReq, credentials);
    const auth = this.config.scheme.buildAuthorization.call(
      this,
      wrappedReq,
      credentials.key,
      signature,
    );

    if (returnSignature) return auth.value;
    wrappedReq.original.headers[auth.key] = auth.value;

    return undefined;
  }

  why() {
    if (!this.config.debug) return;
    // eslint-disable-next-line no-console
    console.log(
      'Canonical Request (START)\n"%s"\n(END)',
      this._lastCanonicalRequest,
    );
    // eslint-disable-next-line no-console
    console.log('Request Body (START)\n"%s"\n(END)', this._lastRequestBody);
    // eslint-disable-next-line no-console
    console.log('String to Sign (START)\n"%s"\n(END)', this._lastStringToSign);
  }

  _validate(req, credentials, parsedAuth) {
    this._normalizedHeaders(req);

    if (
      !this.isRequestish ||
      !this.isCredentials ||
      !this.isParsedAuth(parsedAuth)
    ) {
      return false;
    }

    const passedSignature = parsedAuth.signature;
    let compareSignature;

    // failed signatures immediately fail
    try {
      compareSignature = this._sign(req, credentials);
    } catch (err) {
      this.log(err);

      return false;
    }

    // if date isn't a signed header, then we don't do skew check
    // eslint-disable-next-line no-bitwise
    if (~req.signedHeaders.indexOf('date')) {
      if (!req.original.headers.date || !this._checkSkew(req)) {
        this.log('Date Skew Expired', req.original.headers.date);

        return false;
      }
    }

    this.log('Comparing', passedSignature, compareSignature);

    // slow equals
    // eslint-disable-next-line no-bitwise
    let diff = passedSignature.length ^ compareSignature.length;

    for (
      let i = 0;
      i < passedSignature.length && i < compareSignature.length;
      i += 1
    ) {
      // eslint-disable-next-line no-bitwise
      diff |= passedSignature[i] ^ compareSignature[i];
    }

    return diff === 0;
  }

  _sign(req, credentials) {
    this._normalizedHeaders(req);
    req.signedHeaders = req.signedHeaders || this.config.signedHeaders;

    if (!this.isRequestish || !this.isCredentials) {
      throw new Error('Hmmac::_sign: Cannot sign invalid request');
    }

    try {
      return this.config.scheme.sign.call(this, req, credentials);
    } catch (err) {
      this.log(err);
      throw new Error(
        `Hmmac::_sign: Unable to sign the request because: ${err.message}`,
      );
    }
  }

  _hash(message, encoding = null) {
    const hash = crypto.createHash(this.config.algorithm);
    hash.update(message);

    return hash.digest(encoding);
  }

  _hmac(message, key, encoding = null) {
    const hmac = crypto.createHmac(this.config.algorithm, key);
    hmac.update(message);

    return hmac.digest(encoding);
  }

  _normalizedHeaders(req) {
    if (!this.isRequestish(req)) return;

    const normal = {};

    if (!Object.prototype.hasOwnProperty.call(req.original.headers, 'host')) {
      req.original.headers.host =
        req.original.host +
        (Object.prototype.hasOwnProperty.call(req.original, 'port')
          ? `:${req.original.port}`
          : '');
    }

    const headerKeys = Object.keys(req.original.headers);
    headerKeys.sort();

    headerKeys.forEach((headerKey) => {
      normal[headerKey.toLowerCase()] = req.original.headers[headerKey];
    });

    req.original.headers = normal;
  }

  _checkSkew(req) {
    if (!this.config.acceptableDateSkew) return true;
    if (!this.isRequestish(req) || !req.original.headers.date) return false;

    try {
      const msskew = this.config.acceptableDateSkew * 1000;
      const now = new Date();
      const then = new Date(req.original.headers.date);
      let diff = Math.abs(now.getTime() - then.getTime());

      if (isNaN(diff)) diff = Infinity;

      return diff < msskew;
    } catch (err) {
      this.log(err);

      return false;
    }
  }
}

Hmmac.schemes = schemeLoader;

Hmmac.middleware = (opts, customResponder) => {
  const hmmac = !!opts && opts instanceof Hmmac ? opts : new Hmmac(opts);

  if (hmmac.config.credentialProvider === defCredentialProvider) {
    throw new Error('Hmmac::middleware requires a credentialProvider to work');
  }

  const thisCustomResponder =
    customResponder ||
    ((valid, req, res, next) => {
      if (valid === true) {
        return next();
      }

      res.statusCode = 401;

      if (hmmac.config.wwwAuthenticateRealm) {
        res.setHeader(
          'WWW-Authenticate',
          `${hmmac.config.scheme.getServiceLabel.call(
            hmmac,
          )} realm="${hmmac.config.wwwAuthenticateRealm.replace(/"/g, "'")}"`,
        );
      }

      return next(new Error('Unauthorized'));
    });

  return (req, res, next) => {
    hmmac.validate(req, (valid, key) => {
      if (thisCustomResponder.length === 5) {
        return thisCustomResponder.apply(this, [valid, key, req, res, next]);
      }

      return thisCustomResponder.apply(this, [valid, req, res, next]);
    });
  };
};

module.exports = Hmmac;
