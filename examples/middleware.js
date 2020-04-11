/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// Requires `npm install restify`

// run node examples/middleware.js

// eslint-disable-next-line import/no-extraneous-dependencies
const restify = require('restify');

const Hmmac = require('../lib/hmmac');
const ourFakeDb = require('./lib/credentials');

const server = restify.createServer();
server.pre(restify.pre.pause());

// timeout requests
server.use((req, res, next) => {
  next();

  res.timeoutFn = setTimeout(() => {
    if (!res.finished) {
      // eslint-disable-next-line no-console
      console.log('A request timed out');
      res.end();
    }
  }, 30000);
});

// we're done. clear timeout.
// eslint-disable-next-line no-unused-vars
server.on('after', (req, res, route, err) => {
  if (res.timeoutFn) clearTimeout(res.timeoutFn);
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));

// the hmmac middleware needs to come after date and body have been parsed

// this is identical to the default responder, except it also includes a console.log
const customResponder = (valid, req, res, next) => {
  // eslint-disable-next-line no-console
  console.log('external');

  if (valid === true) {
    return next();
  }

  // eslint-disable-next-line no-console
  console.log('FAIL!', req.headers.authorization);

  if (typeof res.send === 'function') {
    res.send(401, 'Unauthorized');

    return res.end();
  }

  return next(401);
};

// credentialProvider is required for middleware. it's just a function that looks up the key
// and returns the secret in the format: { key:'', secret: '' }
const hmmacOpts = {
  credentialProvider(key, callback) {
    ourFakeDb.lookup(key, (record) => {
      if (!record) return callback(null);

      // pass it to the callback, don't return it
      return callback({
        key: record.key,
        secret: record.secret,
      });
    });
  },
};

server.use(Hmmac.middleware(hmmacOpts, customResponder));

// eslint-disable-next-line no-unused-vars
server.get('/fuckyeah', (req, res, next) => res.end());

// eslint-disable-next-line no-unused-vars
server.put('/fuckyeah', (req, res, next) => res.end());

// eslint-disable-next-line no-unused-vars
server.post('/fuckyeah/:id', (req, res, next) => res.end());

// eslint-disable-next-line no-unused-vars
server.del('/fuckyeah/:id', (req, res, next) => res.end());

server.listen(8080);

// eslint-disable-next-line no-console
console.log('Restify listening on 8080...');
