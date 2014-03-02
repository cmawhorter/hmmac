/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// Requires `npm install restify`

// run node examples/middleware.js

var restify = require('restify');

var Hmmac = require('../lib/hmmac')
  , ourFakeDb = require('./lib/credentials');


var server = restify.createServer();
server.pre(restify.pre.pause());

// timeout requests
server.use(function(req, res, next) {
  next();

  res.timeoutFn = setTimeout(function() {
    if (!res.finished) {
      console.log('A request timed out');
      res.end();
      return;
    }
  }, 30000);
});

// we're done. clear timeout.
server.on('after', function(req, res, route, err) {
  if (res.timeoutFn) clearTimeout(res.timeoutFn);
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));


// the hmmac middleware needs to come after date and body have been parsed

// this is identical to the default responder, except it also includes a console.log
var customResponder = function(valid, req, res, next) { 
  console.log('external');
  if (true === valid) {
    return next();
  }
  else {
    console.log('FAIL!', req.headers['authorization']);
    if (typeof res.send == 'function') {
      res.send(401, 'Unauthorizated');
      return res.end();
    }
    else return next(401);
  }
};

// credentialProvider is required for middleware. it's just a function that looks up the key
// and returns the secret in the format: { key:'', secret: '' }
var hmmacOpts = {
  credentialProvider: function(key, callback) {
    ourFakeDb.lookup(key, function(record) {
      if (!record) return callback(null);

      // pass it to the callback, don't return it
      callback({
        key: record.key,
        secret: record.secret
      });
    });
  }
};

server.use(Hmmac.middleware(hmmacOpts, customResponder));


server.get('/fuckyeah', function(req, res, next) {
  return res.end();
});

server.put('/fuckyeah', function(req, res, next) {
  return res.end();
});

server.post('/fuckyeah/:id', function(req, res, next) {
  return res.end();
});

server.del('/fuckyeah/:id', function(req, res, next) {
  return res.end();
});

server.listen(8080);

console.log('Restify listening on 8080...');