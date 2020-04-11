/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-mixed-operators */
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

describe('Hmmac', () => {
  it('should instantiate a new Hmmac object', () => {
    const hmmac = new Hmmac();
    assert.strictEqual(true, hmmac instanceof Hmmac);
  });

  it('should accept config options', () => {
    const hmmac = new Hmmac({ algorithm: 'not-real' });
    assert.equal(hmmac.config.algorithm, 'not-real');
  });

  describe('#_hash', () => {
    it('should return a hash', () => {
      const hmmac = new Hmmac();
      const hash = hmmac._hash('abcd1234', 'hex');
      assert.equal(
        hash,
        'e9cee71ab932fde863338d08be4de9dfe39ea049bdafb342ce659ec5450b69ae',
      );
    });

    it('should accept multiple encodings and return a hash', () => {
      const hmmac = new Hmmac();
      const hash = hmmac._hash('abcd1234', 'base64');
      assert.equal(hash, '6c7nGrky/ehjM40Ivk3p3+OeoEm9r7NCzmWexUULaa4=');
    });

    it('should return a hash based on the config algo', () => {
      const hmmac = new Hmmac({ algorithm: 'sha1' });
      const hash = hmmac._hash('abcd1234', 'hex');
      assert.equal(hash, '7ce0359f12857f2a90c7de465f40a95f01cb5da9');
    });
  });

  describe('#_hmac', () => {
    it('should return a signature', () => {
      const hmmac = new Hmmac();
      const hash = hmmac._hmac('abcd1234', 'a', 'hex');
      assert.equal(
        hash,
        'dd63b1e101da6657f79bfe354cfcabb3235ac1d7e2417c1d981a0792625586e2',
      );
    });

    it('should accept multiple encodings and return a signature', () => {
      const hmmac = new Hmmac();
      const hash = hmmac._hmac('abcd1234', 'a', 'base64');
      assert.equal(hash, '3WOx4QHaZlf3m/41TPyrsyNawdfiQXwdmBoHkmJVhuI=');
    });

    it('should return a signature based on the config algo', () => {
      const hmmac = new Hmmac({ algorithm: 'sha1' });
      const hash = hmmac._hmac('abcd1234', 'a', 'hex');
      assert.equal(hash, '3bed4777b738bd1157fe10215e00eab23e8916ec');
    });
  });

  describe('#_normalizedHeaders', () => {
    it('should accept a request-ish object', () => {
      const hmmac = new Hmmac();
      hmmac._normalizedHeaders(hmmac._wrap(mocks.unsignedRequestFrozen));
    });

    it('should fail gracefully for bad input', () => {
      const hmmac = new Hmmac();
      hmmac._normalizedHeaders();
    });

    it('should add a host header if one does not exist', () => {
      const hmmac = new Hmmac();
      const req = {
        host: 'localhost',
        port: '8080',
        headers: {},
      };

      hmmac._normalizedHeaders(hmmac._wrap(req));
      assert.equal(req.headers.host, 'localhost:8080');
    });

    it('should add a host header even without a port', () => {
      const hmmac = new Hmmac();
      const req = {
        host: 'localhost',
        headers: {},
      };

      hmmac._normalizedHeaders(hmmac._wrap(req));
      assert.equal(req.headers.host, 'localhost');
    });

    it('should alphabetize headers', () => {
      const hmmac = new Hmmac();
      const req = {
        host: 'localhost',
        port: '8080',
        headers: {
          x: '3',
          a: '1',
          b: '2',
          y: '4',
          z: '5',
        },
      };

      // FIXME: This doesn't work... need to grab the keys and test those?

      hmmac._normalizedHeaders(hmmac._wrap(req));
      assert.deepEqual(req.headers, {
        a: '1',
        b: '2',
        host: 'localhost:8080',
        x: '3',
        y: '4',
        z: '5',
      });
    });

    it('should lowercase all header keys but not values', () => {
      const hmmac = new Hmmac();
      const req = {
        host: 'localhost',
        port: '8080',
        headers: {
          THiS: 'AbCd',
          iS: 'AbCd',
          HoW: 'AbCd',
          CooL: 'AbCd',
          KiDs: 'AbCd',
          TyPe: 'AbCd',
        },
      };

      hmmac._normalizedHeaders(hmmac._wrap(req));
      assert.deepEqual(req.headers, {
        this: 'AbCd',
        is: 'AbCd',
        host: 'localhost:8080',
        how: 'AbCd',
        cool: 'AbCd',
        kids: 'AbCd',
        type: 'AbCd',
      });
    });
  });

  describe('#_checkSkew', () => {
    it('should accept a request-ish object', () => {
      const hmmac = new Hmmac();
      hmmac._checkSkew(hmmac._wrap(mocks.unsignedRequestFrozen));
    });

    it('should fail gracefully for bad input', () => {
      const hmmac = new Hmmac();
      assert.strictEqual(false, hmmac._checkSkew());
    });

    it('should always return true if skew disabled', () => {
      const hmmac = new Hmmac({ acceptableDateSkew: false });
      assert.strictEqual(true, hmmac._checkSkew());
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: 'Mon, 30 Jul 2012 14:40:30 GMT', // far in the past
            },
          }),
        ),
      );
    });

    it('should always return true if skew disabled and date header does not exist or is invalid', () => {
      const hmmac = new Hmmac({ acceptableDateSkew: false });
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {},
          }),
        ),
      );
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: 'this is not a valid date',
            },
          }),
        ),
      );
    });

    it('should always return false if date header does not exist or is invalid', () => {
      const hmmac = new Hmmac({ acceptableDateSkew: 1 });
      assert.strictEqual(
        false,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {},
          }),
        ),
      );
      assert.strictEqual(
        false,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: 'this is not a valid date',
            },
          }),
        ),
      );
    });

    it('should fail based on acceptableDateSkew config', () => {
      const hmmac = new Hmmac({ acceptableDateSkew: 30 });
      const now = new Date();
      const futurefail = new Date();
      const futurepass = new Date();
      const pastfail = new Date();
      const pastpass = new Date();

      futurefail.setTime(
        now.getTime() + hmmac.config.acceptableDateSkew * 2 * 1000,
      );
      futurepass.setTime(
        now.getTime() + (hmmac.config.acceptableDateSkew / 2) * 1000,
      );
      pastfail.setTime(
        now.getTime() - hmmac.config.acceptableDateSkew * 2 * 1000,
      );
      pastpass.setTime(
        now.getTime() - (hmmac.config.acceptableDateSkew / 2) * 1000,
      );

      assert.strictEqual(
        false,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: futurefail.toUTCString(),
            },
          }),
        ),
      );
      assert.strictEqual(
        false,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: pastfail.toUTCString(),
            },
          }),
        ),
      );
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: now.toUTCString(),
            },
          }),
        ),
      );
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: futurepass.toUTCString(),
            },
          }),
        ),
      );
      assert.strictEqual(
        true,
        hmmac._checkSkew(
          hmmac._wrap({
            headers: {
              date: pastpass.toUTCString(),
            },
          }),
        ),
      );
    });
  });
});
