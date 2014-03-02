/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

var fs = require('fs')
  , assert = require('assert')
  , querystring = require('querystring');

var Hmmac = require('../lib/hmmac');

var aws_tests = fs.readdirSync(__dirname + '/aws')
  , credentials = { key: 'AKIDEXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' }
  , testkeys = [];

function normalizeLineEndings(str) {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function loadFile(f) {
  return normalizeLineEndings(fs.readFileSync(__dirname + '/aws/' + f).toString());
}

function loadTest(hmmac, k) {
  // <file-name>.req—the web request to be signed.
  // <file-name>.creq—the resulting canonical request.
  // <file-name>.sts—the resulting string to sign.
  // <file-name>.authz—the authorization header.
  // <file-name>.sreq— the signed request.

  var req = buildRequestObj(loadFile(k + '.req'))
    , parsedAuth = parseAuthorization(hmmac, req, loadFile(k + '.authz'))
    , canonical = loadFile(k + '.creq')
    , canonicalLines = canonical.split('\n');

  return {
    request: req,
    canonical: canonical,
    signedHeaders: canonicalLines[canonicalLines.length - 2].split(';'),
    sign: loadFile(k + '.sts'),
    auth: parsedAuth,
    signed: loadFile(k + '.sreq'),
    scope: {
      region: parsedAuth.schemeConfig[1],
      service: parsedAuth.schemeConfig[2]
    }
  };
}

function buildRequestObj(strRequest) {
  // POST / http/1.1
  // Content-Type:application/x-www-form-urlencoded
  // Date:Mon, 09 Sep 2011 23:36:00 GMT
  // Host:host.foo.com
  //
  // foo=bar

  var req = {}
    , lines = strRequest.split('\n')
    , line1 = lines.shift().split(/\s+/);

  req.headers = {};
  req.method = line1[0].trim();

  var tmppath = line1[1].trim()
    , query = ''
    , path;
  if (~tmppath.indexOf('?')) {
    path = tmppath.split('?')[0];
    query = tmppath.split('?')[1];
  }
  else path = tmppath;
  // request.version = line1[2].trim();

  req.path = path;
  req.query = querystring.parse(query);

  req.body = '';

  var startBody = false;
  for (var i=0; i < lines.length; i++) {
    var line = lines[i];

    if (!startBody) {
      if (line.trim().length == 0) {
        startBody = true;
      }
      else {
        var parts = line.split(':', 2)
          , headerKey = parts[0].trim().toLowerCase()
          , headerValue = line.substring(headerKey.length + 1).trim();

        req.headers[headerKey] = headerValue;
      }
    }
    else {
      req.body += line + '\n';
    }
  }

  if (req.body.length > 0) req.body = req.body.substring(0, req.body.length - 1); // trim trailing newline

  req.hostname = req.headers['host'];
  var hostparts = req.hostname.split(':');
  req.host = hostparts[0];
  req.port = hostparts[1] || 80;

  return req;
}

function parseAuthorization(hmmac, req, strAuth) {
  // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/host/aws4_request, SignedHeaders=content-type;date;host, Signature=5a15b22cf462f047318703b92e6f4f38884e4a7ab7b1d6426ca46a8bd1c26cbc
  req.headers['authorization'] = strAuth;
  var parsedAuth = hmmac.config.scheme.parseAuthorization.call(hmmac, hmmac._wrap(req));
  return parsedAuth;
}

function compareStrings(aws, hmmac, enforce) {
  var matches = aws == hmmac;
  // console.log('Match? ', matches);

  if (!matches && enforce) {
    console.log('HMMAC:');
    console.log(hmmac);
    console.log(new Array(50).join('='));
    console.log('FILE:')
    console.log(aws);
    console.log(new Array(50).join('='));
    console.log('\n');

    if (!matches) {
      console.log('FILE\tHMMAC');
      console.log(new Array(20).join('='));
      for (var i=0; i < aws.length; i++) {
        var fchar = aws[i], fcharcode = fchar.charCodeAt(0);
        var hchar = hmmac[i], hcharcode = hchar.charCodeAt(0);

        // keep new lines from fucking shit up
        if (fcharcode == 10 || fcharcode == 13) fchar = ' ';
        if (hcharcode == 10 || hcharcode == 13) hchar = ' ';

        console.log(fchar, ' (' + fcharcode + ')', hchar, ' (' + hcharcode + ')');
        if (aws[i] != hmmac[i]) {
          console.log('Mismatch at position ', i);
          process.exit();
        }
      }
    }
  }
}


aws_tests.forEach(function(f) {
  if (f == 'README' || f[0] == '.') return; // ignore readme and dot files
  var k = f.split('.')[0];
  if (!~testkeys.indexOf(k)) testkeys.push(k);
});

describe('Hmmac', function() {

  describe('AWS4 Test Suite', function() {

    testkeys.forEach(function(fKey) {

      it('should match the signature in ' + fKey, function() {
        var hmmac = new Hmmac({ scheme: Hmmac.schemes.load('aws4'), debug: 1 }); // debug > 0 required for test suite
        var test = loadTest(hmmac, fKey);

        hmmac.config.signedHeaders = test.signedHeaders;
        // console.log(test.request.headers);

        var expectedAuthorizationHeader = test.request.headers['authorization'];
        test.request.headers['authorization'] = null;

        // verify test request no longer contains an auth header
        assert.strictEqual(test.request.headers['authorization'], null);

        hmmac.config.schemeConfig = test.scope;
        hmmac.sign(test.request, credentials);

        // console.log(hmmac._lastCanonicalRequest);

        assert.equal(hmmac._lastCanonicalRequest, test.canonical);
        assert.equal(hmmac._lastStringToSign, test.sign);
        assert.equal(test.request.headers['authorization'], expectedAuthorizationHeader);
      });
    });

  });
});
