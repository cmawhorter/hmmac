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

const noop = () => {};

describe('Middleware', () => {
  it('should require a credentialProvider', () => {
    assert.throws(() => {
      Hmmac.middleware();
    }, 'requires a credentialProvider');
    assert.throws(() => {
      Hmmac.middleware(new Hmmac());
    }, 'requires a credentialProvider');
  });

  it('should return a function', () => {
    assert.equal(
      typeof Hmmac.middleware({ credentialProvider: noop }),
      'function',
    );
  });

  it('should accept config options', () =>
    new Promise((done) => {
      const credentialProvider = () => {
        done();
      };
      const middleware = Hmmac.middleware({
        scheme: Hmmac.schemes.load('aws4'),
        credentialProvider,
      });
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, (err) => {
        assert.ifError(err);
      });
    }));

  it('should accept an Hmmac object', () =>
    new Promise((done) => {
      const credentialProvider = () => {
        done();
      };
      const hmmac = new Hmmac({
        scheme: Hmmac.schemes.load('aws4'),
        credentialProvider,
      });
      const middleware = Hmmac.middleware(hmmac);
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, (err) => {
        assert.ifError(err);
      });
    }));

  it('should optionally supply the original request object to credentialProvider (with)', () =>
    new Promise((done) => {
      const credentialProvider = (req, key, callback) => {
        assert.ok(typeof req === 'object');
        assert.ok(typeof callback === 'function');
        done();
      };
      const hmmac = new Hmmac({
        scheme: Hmmac.schemes.load('aws4'),
        credentialProvider,
      });
      const middleware = Hmmac.middleware(hmmac);
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, (err) => {
        assert.ifError(err);
      });
    }));

  it('should optionally supply the original request object to credentialProvider (without)', () =>
    new Promise((done) => {
      const credentialProvider = (key, callback) => {
        assert.ok(typeof callback === 'function');
        done();
      };
      const hmmac = new Hmmac({
        scheme: Hmmac.schemes.load('aws4'),
        credentialProvider,
      });
      const middleware = Hmmac.middleware(hmmac);
      const res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, (err) => {
        assert.ifError(err);
      });
    }));

  // eslint-disable-next-line jest/no-disabled-tests
  it('should take a customResponder and pass it as validate callback');
});
