/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable jest/expect-expect */
// Pulled from https://github.com/cmawhorter/hmmac/issues/10

const express = require('express');
const AWS = require('aws-sdk');
const Hmmac = require('../lib/hmmac.js');

const accessKeyId = 's3box';
const secretAccessKey = 's3box';

describe('node aws-sdk', () => {
  it('should authenticate against hmmac aws v4 scheme', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        scheme: Hmmac.schemes.load('aws4'),
        acceptableDateSkew: false,
        // debug: 3,
        schemeConfig: {
          region: 's3box',
          service: 's3',
        },
        credentialProvider(key, callback) {
          if (key !== accessKeyId) {
            return callback(null);
          }

          return callback({ key: accessKeyId, secret: secretAccessKey });
        },
      });

      // eslint-disable-next-line no-unused-vars
      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          const err =
            valid === true
              ? null
              : new Error('request was VALID when it should have been INVALID');

          if (err) {
            hmmac.why();
          }
          done(err);
        });
      });

      app.listen(12300, () => {
        AWS.config.update({
          accessKeyId,
          secretAccessKey,
          region: 's3box',
          endpoint: '127.0.0.1:12300',
          maxRetries: 0,
          s3ForcePathStyle: true,
          sslEnabled: false,
          signatureVersion: 'v4',
        });

        const s3bucket = new AWS.S3({ params: { Bucket: 'fooobar' } });
        // eslint-disable-next-line no-unused-vars
        s3bucket.createBucket((err) => {
          // ignore error
        });
      });
    }));

  it('should not authenticate invalid hmmac aws v4 scheme', () =>
    new Promise((done) => {
      const app = express();
      const hmmac = new Hmmac({
        scheme: Hmmac.schemes.load('aws4'),
        acceptableDateSkew: 600,
        // debug: 3,
        schemeConfig: {
          region: 's3box',
          service: 's3',
        },
        credentialProvider(key, callback) {
          if (key !== accessKeyId) {
            return callback(null);
          }

          return callback({ key: accessKeyId, secret: 'invalid' });
        },
      });

      // eslint-disable-next-line no-unused-vars
      app.use((req, res, next) => {
        hmmac.validate(req, (valid) => {
          const err =
            valid === false
              ? null
              : new Error('request was INVALID when it should have been VALID');

          if (err) {
            hmmac.why();
          }
          done(err);
        });
      });

      app.listen(12301, () => {
        AWS.config.update({
          accessKeyId,
          secretAccessKey,
          region: 's3box',
          endpoint: '127.0.0.1:12301',
          maxRetries: 0,
          s3ForcePathStyle: true,
          sslEnabled: false,
          signatureVersion: 'v4',
        });

        const s3bucket = new AWS.S3({ params: { Bucket: 'fooobar' } });
        // eslint-disable-next-line no-unused-vars
        s3bucket.createBucket((err) => {
          // ignore error
        });
      });
    }));
});
