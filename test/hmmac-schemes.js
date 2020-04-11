/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable jest/no-disabled-tests */
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

['plain', 'aws4'].forEach((scheme) => {
  describe(`Hmmac scheme(${scheme})`, () => {
    describe('#_validate', () => {
      it('should not check date skew if date not a signed header');
      it('should return false if date skew checked, but header missing');
      it('should return false if signature mismatch');
      it('should return true if request is properly signed');
      it('should validate only the signed headers');

      it('should handle malformed user-supplied data', () => {
        const hmmac = new Hmmac({
          scheme: Hmmac.schemes.load(scheme),
          acceptableDateSkew: false,
        });
        const badreq = hmmac._wrap(mocks.acidRequest);
        const goodreq = hmmac._wrap(mocks[scheme].signedRequestFrozen);

        assert.strictEqual(
          false,
          hmmac._validate(badreq, mocks.signedCredentials, null),
        );
        assert.strictEqual(
          false,
          hmmac._validate(badreq, mocks.signedCredentials, {
            serviceLabel: '',
            key: '',
            signature: '',
          }),
        );
        assert.strictEqual(
          false,
          hmmac._validate(badreq, mocks.signedCredentials, {}),
        );
        assert.strictEqual(
          false,
          hmmac._validate(
            goodreq,
            mocks.signedCredentials,
            mocks.acidParsedAuth,
          ),
        );
      });
    });

    describe('#validateSync', () => {
      it('should handle bad input');
      it('should handle incorrectly formatted credentials');
      it('should return false if signature mismatch');
      it('should return true if request is properly signed');
      it('should error if no scheme is provided');
    });

    describe('#validate', () => {
      it('should handle bad input');
      it('should handle missing callback');
      it('should error if credentialProvider not supplied');
      it('should call credentialProvider for credentials');
      it(
        'should call credentialProvider for credentials and timeout long running requests',
      );
      it('should handle bad response from callbackProvider');
      it('should callback null if credentials not found');
      it('should callback false if signature mismatch');
      it('should callback true if request is properly signed');
      it('should error if no scheme is provided');
    });

    describe('#_sign', () => {
      it('should handle bad input');
      it('should handle missing signedHeaders');
      it('should return a signature');
      it('should error if no scheme is provided');
      it('should call sign in the scheme');
      it('should sign only the signed headers');
    });

    describe('#sign', () => {
      it('should handle bad input');
      it('should handle incorrectly formatted credentials');
      it('should handle missing signedHeaders');
      it('should add an authorization header to the request');
      it('should error if no scheme is provided');
    });
  });
});
