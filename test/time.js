'use strict';

const time = require('../src/lib/time.js');

describe('Time', function() {
  describe('#tryParseDate', function() {
    it('should return null for invalid dates', function() {
      expect(time.tryParseDate()).toEqual(null);
    });
    it('should return a date object if valid', function() {
      let now = Date.now();
      let gmt = new Date(now).toGMTString();
      expect(time.tryParseDate(now).toGMTString()).toEqual(gmt);
    });
  });
  describe('#parseDateToTimestamp', function() {
    it('should return defaultValue for invalid dates', function() {
      let now = new Date().getTime();
      expect(time.parseDateToTimestamp(undefined, now)).toEqual(now);
    });
    it('should not return defaultValue for valid dates', function() {
      let past = new Date().getTime() - 10000;
      let future = new Date(Date.now() + 1000);
      expect(time.parseDateToTimestamp(future.toGMTString(), past)).toNotEqual(past);
    });
  });
  describe('#isNotExpired', function() {
    it('should always return true if skew disabled', function() {
      expect(time.isNotExpired('', false)).toEqual(true);
      expect(time.isNotExpired('', -1)).toEqual(true);
      expect(time.isNotExpired('', 0)).toEqual(false);
    });
    it('should support zero skew', function() {
      let now = Date.now();
      expect(time.isNotExpired(new Date(now).toGMTString(), 0, now)).toEqual(true);
    });
    it('should detect valid and invalid dates', function() {
      let pastFail        = 'Fri, 02 Jun 2017 21:36:46 GMT';
      let pastSuccess     = 'Fri, 02 Jun 2017 21:36:47 GMT';
      let current         = 'Fri, 02 Jun 2017 21:36:48 GMT';
      let futureSuccess   = 'Fri, 02 Jun 2017 21:36:49 GMT';
      let futureFail      = 'Fri, 02 Jun 2017 21:36:50 GMT';
      expect(time.isNotExpired(current, 1, new Date(pastFail).getTime())).toEqual(false, 'pastFail');
      expect(time.isNotExpired(current, 1, new Date(pastSuccess).getTime())).toEqual(true, 'pastSuccess');
      expect(time.isNotExpired(current, 1, new Date(current).getTime())).toEqual(true, 'current');
      expect(time.isNotExpired(current, 1, new Date(futureFail).getTime())).toEqual(false, 'futureFail');
      expect(time.isNotExpired(current, 1, new Date(futureSuccess).getTime())).toEqual(true, 'futureSuccess');
    });
  });
});
