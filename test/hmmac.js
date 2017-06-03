'use strict';

const Hmmac = require('../src/hmmac.js').default;

const mocks = require('./lib/mocks.js');

const noop = function(){};

const fakeProviderSuccess = (key, callback) => {
  process.nextTick(() => callback(null, 'key', 'secret'));
};

const fakeProviderError = (key, callback) => {
  process.nextTick(() => callback(new Error()));
};

describe('Hmmac', function() {
  describe('#ctor', function() {
    it('should throw if scheme and provider missing', function() {
      assert.throws(() => new Hmmac());
      assert.doesNotThrow(() => new Hmmac({}, {}));
    });
  });
  describe('#_AHN', function() {
    it('should return options.authorizationHeaderName', function() {
      expect(new Hmmac({}, {})._AHN).toEqual('authorization');
      expect(new Hmmac({}, {}, { authorizationHeaderName: 'hello' })._AHN).toEqual('hello');
    });
  });
  describe('#createRequest', function() {
    it('should return options.authorizationHeaderName', function() {
      let hmmac = new Hmmac({}, {});
      let result = hmmac.createRequest('GET', 'http://example.com/', { authorization: 'hello' }, '1234');
      expect(result.method).toEqual('GET');
      expect(result.url).toEqual('http://example.com/');
      expect(result.getHeader('authorization')).toEqual('hello');
      expect(result.body).toEqual('1234');
    });
  });
  describe('#requestContainsAllSignedHeaders', function() {
    it('should return true if all required headers are present', function() {
      let hmmac = new Hmmac({}, {}, {
        signedHeaders: [ 'one', 'two', 'three' ],
      });
      let req = hmmac.createRequest('GET', 'http://example.com/', {
        one:    '1',
        two:    '2',
        three:  '3',
        extra: 'is ok',
      });
      expect(hmmac.requestContainsAllSignedHeaders(req)).toEqual(true);
    });
    it('should return false if some required headers are missing', function() {
      let hmmac = new Hmmac({}, {}, {
        signedHeaders: [ 'one', 'two', 'three' ],
      });
      let req = hmmac.createRequest('GET', 'http://example.com/', {
        one:    '1',
        three:  '3',
        extra: 'is ok',
      });
      expect(hmmac.requestContainsAllSignedHeaders(req)).toEqual(false);
    });
  });
  describe('#requestHasValidDate', function() {
    it('should should ignore date if not a signed header', function() {
      let hmmac = new Hmmac({}, {}, {
        acceptableDateSkew:   1,
        signedHeaders:        []
      });
      expect(hmmac.requestHasValidDate(hmmac.createRequest('GET', 'http://example.com/', {
        date: new Date(Date.now() + 1000000).toGMTString(),
      }))).toEqual(true);
    });
    it('should detect valid dates', function() {
      let hmmac = new Hmmac({}, {}, {
        acceptableDateSkew:   1,
        signedHeaders:        [ 'date' ]
      });
      expect(hmmac.requestHasValidDate(hmmac.createRequest('GET', 'http://example.com/', {
        date: new Date().toGMTString(),
      }))).toEqual(true);
    });
    it('should detect expired dates', function() {
      let hmmac = new Hmmac({}, {}, {
        acceptableDateSkew:   1,
        signedHeaders:        [ 'date' ]
      });
      expect(hmmac.requestHasValidDate(hmmac.createRequest('GET', 'http://example.com/', {
        date: new Date(Date.now() + 2000).toGMTString(),
      }))).toEqual(false);
      expect(hmmac.requestHasValidDate(hmmac.createRequest('GET', 'http://example.com/', {
        date: new Date(Date.now() - 2000).toGMTString(),
      }))).toEqual(false);
    });
  });
  describe('#sign', function() {
    it('should sign a request', function() {
      let hmmac = new Hmmac({
        format: () => 'hello-signature',
      }, {});
      let req = hmmac.createRequest('GET', 'http://example.com/', {});
      hmmac.sign(req, 'key', 'secret');
      expect(req.getHeader('authorization')).toEqual('hello-signature');
    });
  });
});
