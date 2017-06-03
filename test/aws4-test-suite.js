'use strict';

const fs          = require('fs');
const assert      = require('assert');
const querystring = require('querystring');

const HMMAC       = require('../src/main.js');
const Hmmac       = HMMAC.Hmmac;

const aws_tests   = fs.readdirSync(__dirname + '/aws')
const credentials = { key: 'AKIDEXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' }

let testkeys = [];

const normalizeLineEndings = (str) => {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const loadFile = (f) => {
  return normalizeLineEndings(fs.readFileSync(__dirname + '/aws/' + f).toString());
};

const buildRequestObj = (strRequest) => {
  // POST / http/1.1
  // Content-Type:application/x-www-form-urlencoded
  // Date:Mon, 09 Sep 2011 23:36:00 GMT
  // Host:host.foo.com
  //
  // foo=bar

  let req = {};

  let lines = strRequest.split('\n');
  let [method,fullPath] = lines[0].split(/\s/);

  req.headers = {};
  req.method  = method;
  req.protocol = 'http:';

  let path, query
  if (fullPath.indexOf('?') > -1) {
    [path,query] = fullPath.split('?');
  }
  else {
    path = fullPath;
    query = '';
  }
  // request.version = line1[2].trim();

  req.pathname = path;
  req.query   = querystring.parse(query);

  req.body    = '';
  let startBody = false;
  for (let i=1; i < lines.length; i++) {
    let line = lines[i];
    if (!startBody) {
      if (line.trim().length === 0) {
        startBody = true;
      }
      else {
        let parts       = line.split(':', 2);
        let headerKey   = parts[0].trim().toLowerCase();
        let headerValue = line.substr(line.indexOf(':') + 1);
        req.headers[headerKey] = headerValue;
      }
    }
    else {
      req.body += line + '\n';
    }
  }

  if (req.body.length > 0) req.body = req.body.substring(0, req.body.length - 1); // trim trailing newline

  req.hostname  = req.headers['host'];
  let hostparts = req.hostname.split(':');
  req.host = hostparts[0];
  req.port = hostparts[1] || 80;

  return req;
};


const compareStrings = (aws, hmmac, enforce) => {
  let matches = aws === hmmac;
  console.log('Match? ', matches);
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
      for (let i=0; i < aws.length; i++) {
        let fchar = aws[i], fcharcode = fchar.charCodeAt(0);
        let hchar = hmmac[i], hcharcode = hchar.charCodeAt(0);
        // keep new lines from fucking shit up
        if (fcharcode === 10 || fcharcode === 13) fchar = ' ';
        if (hcharcode === 10 || hcharcode === 13) hchar = ' ';
        console.log(fchar, ' (' + fcharcode + ')', hchar, ' (' + hcharcode + ')');
        if (aws[i] != hmmac[i]) {
          console.log('Mismatch at position ', i);
          process.exit();
        }
      }
    }
  }
};


aws_tests.forEach(f => {
  if (f === 'README' || f[0] === '.') return; // ignore readme and dot files
  let k = f.split('.')[0];
  if (testkeys.indexOf(k) < 0) {
    testkeys.push(k);
  }
});

describe('Hmmac', function() {
  describe('AWS4 Test Suite', function() {
    testkeys
    // .slice(0,1)
    .forEach(fKey => {
      it('should match the signature in ' + fKey, function() {
        // <file-name>.req—the web request to be signed.
        // <file-name>.creq—the resulting canonical request.
        // <file-name>.sts—the resulting string to sign.
        // <file-name>.authz—the authorization header.
        // <file-name>.sreq— the signed request.
        let httpReq                 = buildRequestObj(loadFile(fKey + '.req'))
        let expectedCanonicalLines  = loadFile(fKey + '.creq').split('\n');
        let expectedMessage         = loadFile(fKey + '.sts');
        let expectedHeaderValue     = loadFile(fKey + '.authz');

        // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/host/aws4_request, SignedHeaders=content-type;date;host, Signature=5a15b22cf462f047318703b92e6f4f38884e4a7ab7b1d6426ca46a8bd1c26cbc
        let credentialChunks      = expectedHeaderValue.split('/');
        let [,dt,region,service]  = credentialChunks;
        let signedHeaders         = expectedCanonicalLines[expectedCanonicalLines.length - 2].split(';');

        // console.log('hmmac.signedHeaders', signedHeaders);

        let aws4Scheme = new HMMAC.Aws4Scheme({ region, service });
        let hmmac = new Hmmac(aws4Scheme, (key, callback) => callback(null, credentials.key, credentials.secret), {
          signedHeaders,
        });

        let normalizeHttpRequest = hmmac.normalizeHttpRequest(httpReq);

        hmmac.signHttpRequest(httpReq, credentials.key, credentials.secret);

        let canonicalRequest = aws4Scheme._canonicalRequest(normalizeHttpRequest, hmmac.options.signedHeaders);
        // console.log(JSON.stringify({ canonicalRequest, expectedCanonicalLines }, null, 2));
        expect(canonicalRequest).toEqual(expectedCanonicalLines, 'canonical lines did not match');
        expect(aws4Scheme.buildMessage(normalizeHttpRequest, hmmac.options.signedHeaders).toString()).toEqual(expectedMessage, 'message to sign did not match');
        expect(httpReq.headers['authorization']).toEqual(expectedHeaderValue, 'auth header result did not match');
      });
    });

  });
});
