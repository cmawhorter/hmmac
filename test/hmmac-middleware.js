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

describe('Middleware', function() {

  it('should require a credentialProvider', function() {
    assert.throws(function() {
      Hmmac.middleware()
    }, 'requires a credentialProvider');
    assert.throws(function() {
      Hmmac.middleware(new Hmmac())
    }, 'requires a credentialProvider');
  });

  it('should return a function', function() {
    assert.equal(typeof Hmmac.middleware({ credentialProvider: noop }), 'function');
  });

  it('should accept config options', function(done) {
    var credentialProvider = function() { done(); }
      , middleware = Hmmac.middleware({ scheme: Hmmac.schemes.load('aws4'), credentialProvider: credentialProvider })
      , res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, function(err) {
        assert.ifError(err);
      });
  });

  it('should accept an Hmmac object', function(done) {
    var credentialProvider = function() { done(); }
      , hmmac = new Hmmac({ scheme: Hmmac.schemes.load('aws4'), credentialProvider: credentialProvider })
      , middleware = Hmmac.middleware(hmmac)
      , res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, function(err) {
        assert.ifError(err);
      });
  });

  it('should optionally supply the original request object to credentialProvider (with)', function(done) {
    var credentialProvider = function(req, key, callback) {
      assert.strictEqual(3, arguments.length);
      assert.ok(typeof req === 'object');
      assert.ok(typeof callback === 'function');
      done();
    };
    var hmmac = new Hmmac({ scheme: Hmmac.schemes.load('aws4'), credentialProvider: credentialProvider })
      , middleware = Hmmac.middleware(hmmac)
      , res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, function(err) {
        assert.ifError(err);
      });
  });

  it('should optionally supply the original request object to credentialProvider (without)', function(done) {
    var credentialProvider = function(key, callback) {
      assert.strictEqual(2, arguments.length);
      assert.ok(typeof callback === 'function');
      done();
    };
    var hmmac = new Hmmac({ scheme: Hmmac.schemes.load('aws4'), credentialProvider: credentialProvider })
      , middleware = Hmmac.middleware(hmmac)
      , res = mocks.responseEmpty();

      middleware(mocks.aws4.signedRequestFrozen, res, function(err) {
        assert.ifError(err);
      });
  });

  it('should take a customResponder and pass it as validate callback');
});

