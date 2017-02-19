
var restify = require('restify');

var server = restify.createServer();
server.pre(restify.pre.pause());

// timeout requests
server.use(function(req, res, next) {
  next();

  res.timeoutFn = setTimeout(function() {
    if (!res.finished) res.end();
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

module.exports = server;
