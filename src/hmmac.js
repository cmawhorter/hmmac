import { normalizeRequest as normalizeHttpRequest } from './lib/http.js';
import { isNotExpired } from './lib/time.js';
import slowEquals from './lib/slow-equals.js';
import ensureAsync from './lib/ensure-async.js';
import defaults from './defaults.js';

export default class Hmmac {
  constructor(scheme, provider, options) {
    this.provider = provider;
    this.scheme   = scheme;
    this.options  = Object.assign({}, defaults, options || {});
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

  requestContainsAllSignedHeaders(req) {
    let allThere = true;
    for (let headerName of this.options.signedHeaders) {
      allThere = allThere && req.hasHeader(headerName);
    }
    return allThere;
  }

  requestHasValidDate(req) {
    let isDateEnforced = this.options.signedHeaders.indexOf('date') > -1;
    return isDateEnforced ? isNotExpired(req.getHeader('date'), this.options.acceptableDateSkew) : true;
  }

  // requestIsNotExpired(req) {
  //   let isDateEnforced = this.options.signedHeaders.indexOf('date') > -1;
  //   return isDateEnforced ? isNotExpired(req.getHeader('date'), this.options.acceptableDateSkew) : true;
  // }

  _validate(req) {
    let validationErrors = [];
    // TODO: do we want this?  it results in failed tests.  but is that the correct behavior?
    // if (!this.requestContainsAllSignedHeaders(req)) {
    //   validationErrors.push(`invalid request; these headers must be signed: ${this.options.signedHeaders.join(', ')}`);
    // }
    if (!this.requestHasValidDate(req)) {
      validationErrors.push(`invalid date; outside acceptable skew of ${this.options.acceptableDateSkew}s`);
    }
    let err = null;
    if (validationErrors.length) {
      err = new Error('validation failed');
      err.validationErrors = validationErrors;
    }
    return err;
  }

  _verify(req, providedSignature, key, secret) {
    let validCompareSignature = this.getSignature(req, key, secret);
    let isValid = slowEquals(providedSignature, validCompareSignature);
    return isValid;
  }

  verify(req, callback) {
    let validationError = this._validate(req);
    if (validationError) return ensureAsync(callback, validationError);
    let auth = this.scheme.parse(req.getHeader(this._AHN), this.options);
    if (!auth) return ensureAsync(callback, new Error('authorization error; header missing or could not be parsed'));
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
    return this.scheme.build(req, key, secret, this.options);
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
