// Pulled from https://github.com/cmawhorter/hmmac/issues/10


var assert = require('assert');

var express = require('express');
var Hmmac = require('../lib/hmmac.js');
var AWS = require('aws-sdk');

var accessKeyId = 's3box';
var secretAccessKey = 's3box';


describe('node aws-sdk', function() {

  it('should authenticate against hmmac aws v4 scheme', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      scheme: Hmmac.schemes.load('aws4'),
      acceptableDateSkew: false,
      // debug: 3,
      schemeConfig: {
        region: 's3box',
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

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(true === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12300, function () {
      AWS.config.update({
        "accessKeyId": accessKeyId,
        "secretAccessKey": secretAccessKey,
        "region": "s3box",
        "endpoint": "127.0.0.1:12300",
        "maxRetries": 0,
        "s3ForcePathStyle": true,
        "sslEnabled": false,
        "signatureVersion": "v4"
      });

      var s3bucket = new AWS.S3({params: {Bucket: 'fooobar'}});
      s3bucket.createBucket(function(err) {
        // ignore error
      });

    });

  });

  it('should not authenticate invalid hmmac aws v4 scheme', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      scheme: Hmmac.schemes.load('aws4'),
      acceptableDateSkew: 600,
      // debug: 3,
      schemeConfig: {
        region: 's3box',
        service: 's3'
      },
      credentialProvider: function(key, callback) {
        if(key !== accessKeyId) {
          return callback(null)
        } else {
          callback({ key: accessKeyId, secret: 'invalid'});
        }
      }
    });

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(false === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12301, function () {
      AWS.config.update({
        "accessKeyId": accessKeyId,
        "secretAccessKey": secretAccessKey,
        "region": "s3box",
        "endpoint": "127.0.0.1:12301",
        "maxRetries": 0,
        "s3ForcePathStyle": true,
        "sslEnabled": false,
        "signatureVersion": "v4"
      });

      var s3bucket = new AWS.S3({params: {Bucket: 'fooobar'}});
      s3bucket.createBucket(function(err) {
        // ignore error
      });

    });

  });

});
