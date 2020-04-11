/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable jest/expect-expect */
/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const assert = require('assert');

const Hmmac = require('../lib/hmmac');
const mocks = require('./lib/mocks');

const scheme = 'aws4';

describe(`Middleware scheme(${scheme})`, () => {
  it('should succeed for authorized requests', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        callback(mocks.signedCredentials);
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load(scheme),
        credentialProvider,
        acceptableDateSkew: false,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, (err) => {
        assert.ifError(err);
        assert.equal(res.statusCode, null);
        done();
      });
    }));

  it('should fail with a 401 status code for unauthorized requests', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        callback(mocks.signedCredentials);
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load(scheme),
        credentialProvider,
        acceptableDateSkew: false,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.invalidSignedRequestFrozen, res, (err) => {
        assert.strictEqual(true, err instanceof Error);
        assert.strictEqual(res.statusCode, 401);
        done();
      });
    }));

  it('should fail with a 401 status code for forbidden requests', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        callback(null);
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load(scheme),
        credentialProvider,
        acceptableDateSkew: false,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.invalidSignedRequestFrozen, res, (err) => {
        assert.strictEqual(true, err instanceof Error);
        assert.strictEqual(res.statusCode, 401);
        done();
      });
    }));

  it('should fail with a 401 status code for requests without any authorization', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        callback(null);
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load(scheme),
        credentialProvider,
        acceptableDateSkew: false,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.unsignedRequestFrozen, res, (err) => {
        assert.strictEqual(true, err instanceof Error);
        assert.strictEqual(res.statusCode, 401);
        done();
      });
    }));

  it('should include WWW-Authenticate header when 401', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        callback(null);
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load(scheme),
        credentialProvider,
        acceptableDateSkew: false,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.unsignedRequestFrozen, res, (err) => {
        assert.strictEqual(true, err instanceof Error);
        assert.strictEqual(res.statusCode, 401);
        assert.ok(res.headers['www-authenticate']);
        done();
      });
    }));
});
