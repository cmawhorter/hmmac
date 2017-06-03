require('source-map-support').install();

require('babel-register')({
  only: /\b(src|lodash\-es|async\-es)\b/,
});

global.assert = require('assert');
global.expect = require('expect');
