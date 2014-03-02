/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// run node examples/server.js scheme
// examples:
//   node examples/server.js        # defaults to aws4
//   node examples/server.js aws4
//   node examples/server.js plain
// After running server, run examples/client.js to authenticate against it


var http = require('http'),
    Hmmac = require('../lib/hmmac');

var ourFakeDb = require('./lib/credentials');
var scheme = process.argv[2] || 'aws4';

// since we're the server, we need to specify a credentialProvider (something that is going to lookup the correct key/secret)
var hmmac = new Hmmac({
  scheme: Hmmac.schemes.load(scheme),
  credentialProvider: function(key, callback) {
    // the fake db just simulates async, you don't need a credentialProvider (see Hmmac::validateSync)
    // lookup returns the record of null, so we can pass our callback directly
    ourFakeDb.lookup(key, function(record) {
      if (!record) return callback(null);
      // pass it to the callback, don't return it
      callback({
        key: record.key,
        secret: record.secret
      });
    });
  }
});

// works the same with express/restify
http.createServer(function (req, res) {
  console.log('received request...');

  // the major difference with using http vs express is we have to assemble the body ourselves

  req.body = '';
  req.on('data', function(chunk) {
    console.log('received data...');
    req.body += chunk.toString();
  });

  req.on('end', function() {
    console.log('done receiving data. validating request');

    // now that we have everything.  we'll pass the request on to hmmac to validate the the signature

    hmmac.validate(req, function(valid) {
      // always check valid for strict true and error everything else
      // the middleware does this for you.  see examples/middleware.js for details
      if (true === valid) {
        res.writeHead(200);
        res.end('Success');
      }
      else {
        // the signature didn't match or the user wasn't found.  we don't want to respond with 403
        // for User Not Found so that people can't brute force keys
        res.writeHead(401);
        res.end('Authorization failed!');
      }
    });
  });
}).listen(8080);

console.log('HTTP listening on 8080 for ' + scheme + ' requests...');
