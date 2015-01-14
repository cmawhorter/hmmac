

// Need to npm install before it'll work


var app = require('express')();
var Hmmac = require('../../lib/hmmac');
var AWS = require('aws-sdk');

// Came from https://github.com/cmawhorter/hmmac/issues/10

var accessKeyId = 'abcd';
var secretAccessKey = '1234';
var region = 'doh';

var hmmac = new Hmmac({
  scheme: Hmmac.schemes.load('aws4'),
  debug: 2,
  schemeConfig: {
    region: region,
    service: 's3'
  },
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
  AWS.config.update({
    "accessKeyId": accessKeyId,
    "secretAccessKey": secretAccessKey,
    "region": region,
    "endpoint": "127.0.0.1:3000",
    "maxRetries": 0,
    "s3ForcePathStyle": true,
    "sslEnabled": false,
    "signatureVersion": "v4"
  });

  var s3bucket = new AWS.S3({params: {Bucket: 'fooobar'}});
  s3bucket.createBucket(function(err) {
    console.log(err);
  });

});
