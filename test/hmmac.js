var fs = require('fs')
  , assert = require('assert');

var HMMAC = require('../src/main.js');
var Hmmac = HMMAC.Hmmac;

var mocks = require('./lib/mocks');

var noop = function(){};

describe('Hmmac', function() {

  it('should instantiate a new Hmmac object', function() {
    var hmmac = new Hmmac();
    assert.strictEqual(true, hmmac instanceof Hmmac);
  });

  it('should accept config options', function() {
    var hmmac = new Hmmac(null, null, { algorithm: 'not-real' });
    assert.equal(hmmac.options.algorithm, 'not-real');
  });

  // TODO: this is getting moved to scheme base

  // describe('#_hash', function() {
  //   it('should return a hash', function() {
  //     var hmmac = new Hmmac()
  //       , hash = hmmac._hash('abcd1234', 'hex');
  //     assert.equal(hash, 'e9cee71ab932fde863338d08be4de9dfe39ea049bdafb342ce659ec5450b69ae');
  //   });

  //   it('should accept multiple encodings and return a hash', function() {
  //     var hmmac = new Hmmac()
  //       , hash = hmmac._hash('abcd1234', 'base64');
  //     assert.equal(hash, '6c7nGrky/ehjM40Ivk3p3+OeoEm9r7NCzmWexUULaa4=');
  //   });

  //   it('should return a hash based on the config algo', function() {
  //     var hmmac = new Hmmac({ algorithm: 'sha1' })
  //       , hash = hmmac._hash('abcd1234', 'hex');
  //     assert.equal(hash, '7ce0359f12857f2a90c7de465f40a95f01cb5da9');
  //   });
  // });


  // describe('#_hmac', function() {
  //   it('should return a signature', function() {
  //     var hmmac = new Hmmac()
  //       , hash = hmmac._hmac('abcd1234', 'a', 'hex');
  //     assert.equal(hash, 'dd63b1e101da6657f79bfe354cfcabb3235ac1d7e2417c1d981a0792625586e2');
  //   });

  //   it('should accept multiple encodings and return a signature', function() {
  //     var hmmac = new Hmmac()
  //       , hash = hmmac._hmac('abcd1234', 'a', 'base64');
  //     assert.equal(hash, '3WOx4QHaZlf3m/41TPyrsyNawdfiQXwdmBoHkmJVhuI=');
  //   });

  //   it('should return a signature based on the config algo', function() {
  //     var hmmac = new Hmmac({ algorithm: 'sha1' })
  //       , hash = hmmac._hmac('abcd1234', 'a', 'hex');
  //     assert.equal(hash, '3bed4777b738bd1157fe10215e00eab23e8916ec');
  //   });
  // });


  // TODO: this renamed and signature changed

  // describe('#_checkSkew', function() {
  //   it('should accept a request-ish object', function() {
  //     var hmmac = new Hmmac();
  //     hmmac._checkSkew(hmmac._wrap(mocks.unsignedRequestFrozen));
  //   });

  //   it('should fail gracefully for bad input', function() {
  //     var hmmac = new Hmmac();
  //     assert.strictEqual(false, hmmac._checkSkew());
  //   });

  //   it('should always return true if skew disabled', function() {
  //     var hmmac = new Hmmac({ acceptableDateSkew: false });
  //     assert.strictEqual(true, hmmac._checkSkew());
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: 'Mon, 30 Jul 2012 14:40:30 GMT' // far in the past
  //       }
  //     })));
  //   });

  //   it('should always return true if skew disabled and date header does not exist or is invalid', function() {
  //     var hmmac = new Hmmac({ acceptableDateSkew: false });
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {}
  //     })));
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: 'this is not a valid date'
  //       }
  //     })));
  //   });

  //   it('should always return false if date header does not exist or is invalid', function() {
  //     var hmmac = new Hmmac({ acceptableDateSkew: 1 });
  //     assert.strictEqual(false, hmmac._checkSkew(hmmac._wrap({
  //       headers: {}
  //     })));
  //     assert.strictEqual(false, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: 'this is not a valid date'
  //       }
  //     })));
  //   });

  //   it('should fail based on acceptableDateSkew config', function() {
  //     var hmmac = new Hmmac({ acceptableDateSkew: 30 })
  //       , now = new Date()
  //       , futurefail = new Date()
  //       , futurepass = new Date()
  //       , pastfail = new Date()
  //       , pastpass = new Date();

  //     futurefail.setTime(now.getTime() + (hmmac.config.acceptableDateSkew*2*1000));
  //     futurepass.setTime(now.getTime() + (hmmac.config.acceptableDateSkew/2*1000));
  //     pastfail.setTime(now.getTime() - (hmmac.config.acceptableDateSkew*2*1000));
  //     pastpass.setTime(now.getTime() - (hmmac.config.acceptableDateSkew/2*1000));

  //     assert.strictEqual(false, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: futurefail.toUTCString()
  //       }
  //     })));
  //     assert.strictEqual(false, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: pastfail.toUTCString()
  //       }
  //     })));
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: now.toUTCString()
  //       }
  //     })));
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: futurepass.toUTCString()
  //       }
  //     })));
  //     assert.strictEqual(true, hmmac._checkSkew(hmmac._wrap({
  //       headers: {
  //         date: pastpass.toUTCString()
  //       }
  //     })));
  //   });
  // });

});
