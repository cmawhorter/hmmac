
var assert = require('assert');
var http = require('http');

var express = require('express');
var bodyParser = require('body-parser');
var Hmmac = require('../lib/hmmac.js');

var validCreds = { key: 'a', secret: '1' };
var invalidCreds = { key: 'a', secret: '2' };

describe('node express', function() {

  it('should authenticate GET without body parser', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      credentialProvider: function(key, callback) {
        callback(validCreds);
      }
    });

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(true === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12400, function () {
      var signedRequest = {
        host: '127.0.0.1',
        port: 12400,
        path: '/',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Date': new Date().toUTCString()
        }
      };
      hmmac.sign(signedRequest, validCreds);
      var req = http.request(signedRequest, function(res) {

      });

      req.end();
    });
  });


  it('should authenticate GET with body parser', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      credentialProvider: function(key, callback) {
        callback(validCreds);
      }
    });

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(true === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12405, function () {
      var signedRequest = {
        host: '127.0.0.1',
        port: 12405,
        path: '/',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Date': new Date().toUTCString()
        }
      };
      hmmac.sign(signedRequest, validCreds);
      var req = http.request(signedRequest, function(res) {

      });

      req.end();
    });
  });

  it('should authenticate PUT', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      credentialProvider: function(key, callback) {
        callback(validCreds);
      }
    });

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(true === valid ? null : new Error('did not validate'));
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
      hmmac.sign(signedRequest, validCreds);
      var req = http.request(signedRequest, function(res) {

      });

      req.write(payload);
      req.end();
    });
  });


  it('should not authenticate invalid', function(done) {
    var app = express();
    var hmmac = new Hmmac({
      credentialProvider: function(key, callback) {
        callback(validCreds);
      }
    });

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      hmmac.validate(req, function(valid) {
        done(false === valid ? null : new Error('did not validate'));
      });
    });

    var server = app.listen(12402, function () {
      var payload = JSON.stringify({ some: 'thing' });
      var signedRequest = {
        host: '127.0.0.1',
        port: 12402,
        path: '/',
        method: 'PUT',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'Date': new Date().toUTCString()
        }
      };
      hmmac.sign(signedRequest, invalidCreds);
      var req = http.request(signedRequest, function(res) {

      });

      req.write(payload);
      req.end();
    });
  });

});
