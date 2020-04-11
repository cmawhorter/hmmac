/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-unused-vars */
/* eslint-disable jest/expect-expect */
const http = require('http');

const express = require('express');
const bodyParser = require('body-parser');
const Hmmac = require('../lib/hmmac.js');

const validCreds = { key: 'a', secret: '1' };
const invalidCreds = { key: 'a', secret: '2' };

describe('node express', () => {
  it('should authenticate GET without body parser', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        credentialProvider(key, callback) {
          callback(validCreds);
        },
      });

      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          done(valid === true ? null : new Error('did not validate'));
        });
      });

      app.listen(12400, () => {
        const signedRequest = {
          host: '127.0.0.1',
          port: 12400,
          path: '/',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Date: new Date().toUTCString(),
          },
        };
        hmmac.sign(signedRequest, validCreds);
        const req = http.request(signedRequest, (res) => {});

        req.end();
      });
    }));

  it('should authenticate GET with body parser', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        credentialProvider(key, callback) {
          callback(validCreds);
        },
      });

      app.use(bodyParser.json());

      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          done(valid === true ? null : new Error('did not validate'));
        });
      });

      const server = app.listen(12405, () => {
        const signedRequest = {
          host: '127.0.0.1',
          port: 12405,
          path: '/',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Date: new Date().toUTCString(),
          },
        };
        hmmac.sign(signedRequest, validCreds);
        const req = http.request(signedRequest, (res) => {});

        req.end();
      });
    }));

  it('should authenticate PUT', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        credentialProvider(key, callback) {
          callback(validCreds);
        },
      });

      app.use(bodyParser.json());

      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          done(valid === true ? null : new Error('did not validate'));
        });
      });

      const server = app.listen(12401, () => {
        const payload = JSON.stringify({ some: 'thing' });
        const signedRequest = {
          host: '127.0.0.1',
          port: 12401,
          path: '/',
          method: 'PUT',
          body: payload,
          headers: {
            'Content-Type': 'application/json',
            Date: new Date().toUTCString(),
          },
        };
        hmmac.sign(signedRequest, validCreds);
        const req = http.request(signedRequest, (res) => {});

        req.write(payload);
        req.end();
      });
    }));

  it('should not authenticate invalid', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        credentialProvider(key, callback) {
          callback(validCreds);
        },
      });

      app.use(bodyParser.json());

      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          done(valid === false ? null : new Error('did not validate'));
        });
      });

      const server = app.listen(12402, () => {
        const payload = JSON.stringify({ some: 'thing' });
        const signedRequest = {
          host: '127.0.0.1',
          port: 12402,
          path: '/',
          method: 'PUT',
          body: payload,
          headers: {
            'Content-Type': 'application/json',
            Date: new Date().toUTCString(),
          },
        };
        hmmac.sign(signedRequest, invalidCreds);
        const req = http.request(signedRequest, (res) => {});

        req.write(payload);
        req.end();
      });
    }));
});
