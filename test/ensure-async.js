'use strict';

const ensureAsync = require('../src/lib/ensure-async.js').default;

describe('ensureAsync', function() {
  it('should pass through all args', function(done) {
    let callback = (err, a, b, c) => {
      assert.ifError(err);
      expect(a).toEqual('a');
      expect(b).toEqual('b');
      expect(c).toEqual('c');
      done();
    };
    ensureAsync(callback, null, 'a', 'b', 'c');
  });
  it('should pass through err', function(done) {
    let callback = (err) => {
      expect(err.message).toEqual('hello');
      done();
    };
    ensureAsync(callback, new Error('hello'));
  });
});
