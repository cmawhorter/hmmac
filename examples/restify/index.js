// This DOES NOT WORK.  Something is wrong here.  Seems to be with restify's signRequest stuff maybe?

// Need to npm install before it'll work


var app = require('express')();
var restify = require('restify');
var Hmmac = require('../../lib/hmmac');

var accessKeyId = 'abcd';
var secretAccessKey = '1234';

var hmmac = new Hmmac({
  scheme: Hmmac.schemes.load('aws4'),
  debug: 2,
  credentialProvider: function(key, callback) {
    if(key !== accessKeyId) {
      return callback(null)
    } else {
      callback({ key: accessKeyId, secret: secretAccessKey});
    }
  }
});

app.use(Hmmac.middleware(hmmac));

var server = app.listen(3000, function () {
  // restify signRequest is sync and passes a writable stream so we can't access the body and have to fudge it a bit
  var data = { hello: 'world' };
  var client = restify.createJsonClient({
    url: 'http://localhost:3000',
    signRequest: function(req) {
      req.headers = req._headers;
      if (req.method != 'GET') req.body = JSON.stringify(data);

      var auth = hmmac.sign(req, {
            key: accessKeyId
          , secret: secretAccessKey
        }, true);

      req.setHeader('authorization', auth);
    }
  });

  client.post('/foo', data, function(err, req, res, obj) {
    console.log('%d -> %j', res.statusCode, res.headers);
    console.log('%j', obj);
  });
});


