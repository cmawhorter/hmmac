/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-console */
/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// run node examples/client.js scheme [fail]
// examples:
//   node examples/client.js            # http 200, aws4 scheme
//   node examples/client.js aws4       # http 200
//   node examples/client.js aws4 fail  # http 401
//   node examples/client.js plain      # http 200
//   node examples/client.js plain fail # http 401
// You must run examples/server.js or examples/middleware.js prior to running client.js

const http = require('http');

const Hmmac = require('../lib/hmmac');

const scheme = process.argv[2] || 'aws4';

const hmmac = new Hmmac({ scheme: Hmmac.schemes.load(scheme) });
const ourValidApiCredentials = { key: '1', secret: 'a' };
const ourInvalidApiCredentials = { key: '1', secret: 'not the correct secret' };
const payload = JSON.stringify({ some: 'thing' });
const httpRequest = {
  host: 'localhost',
  port: 8080,
  path: '/fuckyeah',
  method: 'PUT',
  body: payload,
  headers: {
    'Content-Type': 'application/json',
    Date: new Date().toUTCString(),
  },
};

function triggerRequest(signedRequest) {
  console.log(signedRequest);
  console.log('\tmaking request...');
  const req = http.request(signedRequest, (res) => {
    console.log('\tdone.');
    console.log('\thandling response...');

    if (res.statusCode === 200) {
      console.log('Success!');
    } else {
      console.log(res.statusCode, res.headers);
    }

    process.exit();
  });

  console.log('\twriting payload...');
  req.write(payload);
  req.end();
  console.log('\tdone.');
}

// specify an arg to trigger a failing req
if (typeof process.argv[3] !== 'undefined') {
  console.log('Signing Request with INVALID credentials');
  hmmac.sign(httpRequest, ourInvalidApiCredentials); // fail
} else {
  console.log('Signing Request with valid credentials');
  hmmac.sign(httpRequest, ourValidApiCredentials); // success
}

console.log(
  `Triggering ${
    process.argv[3] ? '401' : '200'
  } ${scheme} request in 1 second...`,
);
setTimeout(() => {
  triggerRequest(httpRequest);
}, 1000);
