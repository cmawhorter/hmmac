/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

const restify = require('restify');

const server = restify.createServer();
server.pre(restify.pre.pause());

// timeout requests
server.use((req, res, next) => {
  next();

  res.timeoutFn = setTimeout(() => {
    if (!res.finished) res.end();
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

module.exports = server;
