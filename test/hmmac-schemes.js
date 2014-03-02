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

['plain','aws4'].forEach(function(scheme) {

  describe('Hmmac scheme('+scheme+')', function() {

    describe('#_validate', function() {
      it('should not check date skew if date not a signed header');
      it('should return false if date skew checked, but header missing');
      it('should return false if signature mismatch');
      it('should return true if request is properly signed');
      it('should validate only the signed headers');

      it('should handle malformed user-supplied data', function() {
        var hmmac = new Hmmac({ scheme: Hmmac.schemes.load(scheme), acceptableDateSkew: false })
          , badreq = hmmac._wrap(mocks.acidRequest)
          , goodreq = hmmac._wrap(mocks[scheme].signedRequestFrozen);

        assert.strictEqual(false, hmmac._validate(badreq, mocks.signedCredentials, null));
        assert.strictEqual(false, hmmac._validate(badreq, mocks.signedCredentials, {
          serviceLabel: '',
          key: '',
          signature: ''
        }));
        assert.strictEqual(false, hmmac._validate(badreq, mocks.signedCredentials, {}));
        assert.strictEqual(false, hmmac._validate(goodreq, mocks.signedCredentials, mocks.acidParsedAuth));
      });
    });

    describe('#validateSync', function() {
      it('should handle bad input');
      it('should handle incorrectly formatted credentials');
      it('should return false if signature mismatch');
      it('should return true if request is properly signed');
      it('should error if no scheme is provided');
    });

    describe('#validate', function() {
      it('should handle bad input');
      it('should handle missing callback');
      it('should error if credentialProvider not supplied');
      it('should call credentialProvider for credentials');
      it('should call credentialProvider for credentials and timeout long running requests');
      it('should handle bad response from callbackProvider');
      it('should callback null if credentials not found');
      it('should callback false if signature mismatch');
      it('should callback true if request is properly signed');
      it('should error if no scheme is provided');
    });

    describe('#_sign', function() {
      it('should handle bad input');
      it('should handle missing signedHeaders');
      it('should return a signature');
      it('should error if no scheme is provided');
      it('should call sign in the scheme');
      it('should sign only the signed headers');
    });

    describe('#sign', function() {
      it('should handle bad input');
      it('should handle incorrectly formatted credentials');
      it('should handle missing signedHeaders');
      it('should add an authorization header to the request');
      it('should error if no scheme is provided');
    });
  });


});
