/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

var fs = require('fs')
  , assert = require('assert');

var Hmmac = require('../lib/hmmac')
  , mocks = require('./lib/mocks');

var noop = function(){};
var scheme = 'aws4';

describe('Middleware scheme('+scheme+')', function() {

  it('should succeed for authorized requests', function(done) {
    var credentialProvider = function(key, callback) { callback(mocks.signedCredentials); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load(scheme), credentialProvider: credentialProvider, acceptableDateSkew: false })
      , res = mocks.responseEmpty();

    middleware(mocks.aws4.signedRequestFrozen, res, function(err) {
      assert.ifError(err);
      assert.equal(res.statusCode, null);
      done();
    });
  });

  it('should fail with a 401 status code for unauthorized requests', function(done) {
    var credentialProvider = function(key, callback) { callback(mocks.signedCredentials); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load(scheme), credentialProvider: credentialProvider, acceptableDateSkew: false })
      , res = mocks.responseEmpty();

    middleware(mocks.aws4.invalidSignedRequestFrozen, res, function(err) {
      assert.strictEqual(true, err instanceof Error);
      assert.strictEqual(res.statusCode, 401);
      done();
    });
  });

  it('should fail with a 401 status code for forbidden requests', function(done) {
    var credentialProvider = function(key, callback) { callback(null); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load(scheme), credentialProvider: credentialProvider, acceptableDateSkew: false })
      , res = mocks.responseEmpty();

    middleware(mocks.aws4.invalidSignedRequestFrozen, res, function(err) {
      assert.strictEqual(true, err instanceof Error);
      assert.strictEqual(res.statusCode, 401);
      done();
    });
  });

  it('should fail with a 401 status code for requests without any authorization', function(done) {
    var credentialProvider = function(key, callback) { callback(null); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load(scheme), credentialProvider: credentialProvider, acceptableDateSkew: false })
      , res = mocks.responseEmpty();

    middleware(mocks.aws4.unsignedRequestFrozen, res, function(err) {
      assert.strictEqual(true, err instanceof Error);
      assert.strictEqual(res.statusCode, 401);
      done();
    });
  });

  it('should include WWW-Authenticate header when 401', function(done) {
    var credentialProvider = function(key, callback) { callback(null); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load(scheme), credentialProvider: credentialProvider, acceptableDateSkew: false })
      , res = mocks.responseEmpty();

    middleware(mocks.aws4.unsignedRequestFrozen, res, function(err) {
      assert.strictEqual(true, err instanceof Error);
      assert.strictEqual(res.statusCode, 401);
      assert.ok(res.headers['www-authenticate']);
      done();
    });
  });

});
