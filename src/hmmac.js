import { normalizeRequest as normalizeHttpRequest } from './lib/http.js';
import { isNotExpired } from './lib/time.js';
import slowEquals from './lib/slow-equals.js';
import ensureAsync from './lib/ensure-async.js';

export default class Hmmac {
  constructor(scheme, provider, options) {
    if (!scheme) throw new Error('scheme is required');
    if (!provider) throw new Error('provider is required');
    this.scheme   = scheme;
    this.provider = provider;
    this.options  = Object.assign({
      authorizationHeaderName:        'authorization',
      // in seconds, def 15 minutes. only done if date is signed
      acceptableDateSkew:             900,
      signedHeaders:                  [ 'host', 'content-type', 'date' ],
    }, options || {});
    this.options.signedHeaders.sort();
  }

  get _AHN() {
    return this.options.authorizationHeaderName;
  }

  // for use with non-standard scenarios to create
  // an object that can be used with hmmac as if
  // it were a regular http request
  createRequest(method, url, headers, body) {
    return this.normalizeHttpRequest({ method, headers, url }, body);
  }

  normalizeHttpRequest(httpReq, body) {
    return normalizeHttpRequest(httpReq, body);
  }

  requestHasValidDate(req) {
    let isDateEnforced = this.options.signedHeaders.indexOf('date') > -1;
    return isDateEnforced ? isNotExpired(req.getHeader('date'), this.options.acceptableDateSkew) : true;
  }

  _verify(req, providedSignature, key, secret) {
    let validCompareSignature = this.getSignature(req, key, secret);
    let isValid = slowEquals(providedSignature, validCompareSignature);
    return isValid;
  }

  verify(req, callback) {
    let authorizationHeaderValue = req.getHeader(this._AHN);
    if (!this.scheme.validHeader(authorizationHeaderValue)) {
      return ensureAsync(callback, new Error('authorization error; header missing or could not be parsed'));
    }
    let auth = this.scheme.parseHeader(authorizationHeaderValue);
    if (!this.requestHasValidDate(req)) {
      return ensureAsync(callback, new Error(`invalid date; outside acceptable skew of ${this.options.acceptableDateSkew}s`));
    }
    let validationError = this.scheme.validate(req, this.options.signedHeaders);
    if (validationError) {
      return ensureAsync(callback, validationError);
    }
    this.provider(auth.key, (err, key, secret) => {
      if (err) return callback(err);
      if (!key || !secret) return callback(new Error('credentials not provided'));
      callback(null, this._verify(req, auth, key, secret));
    });
  }

  verifyHttpRequest(httpReq, callback) {
    let req = this.normalizeHttpRequest(httpReq);
    this.verify(req, callback);
  }

  getSignature(req, key, secret) {
    return this.scheme.format(req, this.options.signedHeaders, key, secret);
  }

  getSignatureForHttpRequest(httpReq, key, secret) {
    let req = this.normalizeHttpRequest(httpReq);
    return this.getSignature(req, key, secret);
  }

  sign(req, key, secret) {
    let authorizationValue = this.getSignature(req, key, secret);
    req.setHeader(this._AHN, authorizationValue);
  }

  signHttpRequest(httpReq, key, secret) {
    let req = this.normalizeHttpRequest(httpReq);
    this.sign(req, key, secret);
    httpReq.headers[this._AHN] = req.getHeader(this._AHN);
  }
}
