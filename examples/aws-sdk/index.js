// Need to npm install before it'll work

const app = require('express')();
const AWS = require('aws-sdk');
const Hmmac = require('../../lib/hmmac');

// Came from https://github.com/cmawhorter/hmmac/issues/10

const accessKeyId = 'abcd';
const secretAccessKey = '1234';
const region = 'doh';

const hmmac = new Hmmac({
  scheme: Hmmac.schemes.load('aws4'),
  debug: 2,
  schemeConfig: {
    region,
    service: 's3',
  },
  credentialProvider(key, callback) {
    if (key !== accessKeyId) {
      return callback(null);
    }

    return callback({ key: accessKeyId, secret: secretAccessKey });
  },
});

app.use(Hmmac.middleware(hmmac));

app.listen(3000, () => {
  AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region,
    endpoint: '127.0.0.1:3000',
    maxRetries: 0,
    s3ForcePathStyle: true,
    sslEnabled: false,
    signatureVersion: 'v4',
  });

  const s3bucket = new AWS.S3({ params: { Bucket: 'fooobar' } });
  s3bucket.createBucket((err) => {
    // eslint-disable-next-line no-console
    console.log(err);
  });
});
