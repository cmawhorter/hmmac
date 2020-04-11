/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable jest/expect-expect */
/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const fs = require('fs');
const assert = require('assert');
const querystring = require('querystring');

const Hmmac = require('../lib/hmmac');

const awsTests = fs.readdirSync(`${__dirname}/aws`);
const credentials = {
  key: 'AKIDEXAMPLE',
  secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
};
const testkeys = [];

function normalizeLineEndings(str) {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function loadFile(f) {
  return normalizeLineEndings(
    fs.readFileSync(`${__dirname}/aws/${f}`).toString(),
  );
}

function buildRequestObj(strRequest) {
  // POST / http/1.1
  // Content-Type:application/x-www-form-urlencoded
  // Date:Mon, 09 Sep 2011 23:36:00 GMT
  // Host:host.foo.com
  //
  // foo=bar

  const req = {};
  const lines = strRequest.split('\n');
  const line1 = lines.shift().split(/\s+/);

  req.headers = {};
  req.method = line1[0].trim();

  const tmppath = line1[1].trim();
  let query = '';
  let path;
  // eslint-disable-next-line no-bitwise
  if (~tmppath.indexOf('?')) {
    [path, query] = tmppath.split('?');
  } else path = tmppath;
  // request.version = line1[2].trim();

  req.path = path;
  req.query = querystring.parse(query);

  req.body = '';

  let startBody = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!startBody) {
      if (line.trim().length === 0) {
        startBody = true;
      } else {
        const parts = line.split(':', 2);
        const headerKey = parts[0].trim().toLowerCase();
        const headerValue = line.substring(headerKey.length + 1).trim();

        req.headers[headerKey] = headerValue;
      }
    } else {
      req.body += `${line}\n`;
    }
  }

  if (req.body.length > 0) {
    req.body = req.body.substring(0, req.body.length - 1);
  } // trim trailing newline

  req.hostname = req.headers.host;
  const hostparts = req.hostname.split(':');
  [req.host] = hostparts;
  req.port = hostparts[1] || 80;

  return req;
}

function parseAuthorization(hmmac, req, strAuth) {
  // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/host/aws4_request, SignedHeaders=content-type;date;host, Signature=5a15b22cf462f047318703b92e6f4f38884e4a7ab7b1d6426ca46a8bd1c26cbc
  req.headers.authorization = strAuth;
  const parsedAuth = hmmac.config.scheme.parseAuthorization.call(
    hmmac,
    hmmac._wrap(req),
  );

  return parsedAuth;
}

function loadTest(hmmac, k) {
  // <file-name>.req—the web request to be signed.
  // <file-name>.creq—the resulting canonical request.
  // <file-name>.sts—the resulting string to sign.
  // <file-name>.authz—the authorization header.
  // <file-name>.sreq— the signed request.

  const req = buildRequestObj(loadFile(`${k}.req`));
  const parsedAuth = parseAuthorization(hmmac, req, loadFile(`${k}.authz`));
  const canonical = loadFile(`${k}.creq`);
  const canonicalLines = canonical.split('\n');

  return {
    request: req,
    canonical,
    signedHeaders: canonicalLines[canonicalLines.length - 2].split(';'),
    sign: loadFile(`${k}.sts`),
    auth: parsedAuth,
    signed: loadFile(`${k}.sreq`),
    scope: {
      region: parsedAuth.schemeConfig[1],
      service: parsedAuth.schemeConfig[2],
    },
  };
}

awsTests.forEach((f) => {
  if (f === 'README' || f[0] === '.') return; // ignore readme and dot files
  const k = f.split('.')[0];
  // eslint-disable-next-line no-bitwise
  if (!~testkeys.indexOf(k)) testkeys.push(k);
});

describe('Hmmac', () => {
  describe('AWS4 Test Suite', () => {
    testkeys.forEach((fKey) => {
      it(`should match the signature in ${fKey}`, () => {
        const hmmac = new Hmmac({
          scheme: Hmmac.schemes.load('aws4'),
          debug: 1,
        }); // debug > 0 required for test suite
        const test = loadTest(hmmac, fKey);

        hmmac.config.signedHeaders = test.signedHeaders;
        // console.log(test.request.headers);

        const expectedAuthorizationHeader = test.request.headers.authorization;
        test.request.headers.authorization = null;

        // verify test request no longer contains an auth header
        assert.strictEqual(test.request.headers.authorization, null);

        hmmac.config.schemeConfig = test.scope;
        hmmac.sign(test.request, credentials);

        // console.log(hmmac._lastCanonicalRequest);

        assert.equal(hmmac._lastCanonicalRequest, test.canonical);
        assert.equal(hmmac._lastStringToSign, test.sign);
        assert.equal(
          test.request.headers.authorization,
          expectedAuthorizationHeader,
        );
      });
    });
  });
});
