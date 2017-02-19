
var assert = require('assert');
var http = require('http');

var express = require('express');
var bodyParser = require('body-parser');
var HMMAC = require('../src/main.js');
var Hmmac = HMMAC.Hmmac;

var validCreds = { key: 'a', secret: '1' };
var invalidCreds = { key: 'a', secret: '2' };

describe('node express', function() {

  it('should authenticate', function(done) {
    var app = express();
    var hmmac = new Hmmac(new HMMAC.PlainScheme(), function(key, callback) {
      callback(null, validCreds);
    });

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      hmmac.verifyHttpRequest(req, function(err, valid) {
        assert.ifError(err);
        done(true === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12400, function () {
      var payload = JSON.stringify({ some: 'thing' });
      var signedRequest = {
        host: '127.0.0.1',
        port: 12400,
        path: '/',
        method: 'PUT',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'Date': new Date().toUTCString()
        }
      };
      hmmac.signHttpRequest(signedRequest, validCreds.key, validCreds.secret);
      var req = http.request(signedRequest, function(res) {

      });

      req.write(payload);
      req.end();
    });
  });


  it('should not authenticate invalid', function(done) {
    var app = express();
    var hmmac = new Hmmac(new HMMAC.PlainScheme(), function(key, callback) {
      callback(null, validCreds);
    });

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      hmmac.verifyHttpRequest(req, function(err, valid) {
        assert.ifError(err);
        done(false === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12401, function () {
      var payload = JSON.stringify({ some: 'thing' });
      var signedRequest = {
        host: '127.0.0.1',
        port: 12401,
        path: '/',
        method: 'PUT',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'Date': new Date().toUTCString()
        }
      };
      hmmac.signHttpRequest(signedRequest, invalidCreds.key, invalidCreds.secret);
      var req = http.request(signedRequest, function(res) {

      });

      req.write(payload);
      req.end();
    });
  });

});
