'use strict';

const http = require('../src/lib/http.js');

describe('Http', function() {
  describe('#normalizeRequest', function() {
    let options = {
      method:   'GET',
      url:      'http://example.com/',
      headers: {
        authorization: 'hello',
      },
    };
    let body = '1234';
    let result = http.normalizeRequest(options, body);
    expect(result.method).toEqual(options.method);
    expect(result.url).toEqual(options.url);
    expect(result.hasHeader('authorization')).toEqual(true);
    expect(result.getHeader('authorization')).toEqual(options.headers.authorization);
    result.setHeader('authorization', 'world');
    expect(result.getHeader('authorization')).toEqual('world');
    expect(result.body).toEqual(body);
  });
  // this mostly tested in http-header-collection
  describe('#parseHeaders', function(req) {
    it('should take valid input', function() {
      let raw, hash;
      assert.doesNotThrow(() => {
        raw = http.parseHeaders({
          rawHeaders: [
            'header-name1',
            'header-value1',
            'header-name2',
            'header-value2',
          ],
        });
      });
      assert.doesNotThrow(() => {
        hash = http.parseHeaders({
          headers: {
            'header-name1': 'header-value1',
            'header-name2': 'header-value2',
          }
        });
      });
      expect(JSON.stringify(raw)).toEqual(JSON.stringify(hash));
    });
  });
  describe('#parseBody', function() {
    it('should do nothing if body is string', function() {
      expect(http.parseBody({ body: 'hello' })).toEqual('hello');
    });
    it('should JSON.stringify if not', function() {
      expect(http.parseBody({ body: {hello:'world'} })).toEqual('{"hello":"world"}');
    });
  });
});
