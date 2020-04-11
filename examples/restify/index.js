// This DOES NOT WORK.  Something is wrong here.  Seems to be with restify's signRequest stuff maybe?

// Need to npm install before it'll work

const app = require('express')();
const restify = require('restify');
const Hmmac = require('../../lib/hmmac');

const accessKeyId = 'abcd';
const secretAccessKey = '1234';

const hmmac = new Hmmac({
  scheme: Hmmac.schemes.load('aws4'),
  debug: 2,
  credentialProvider(key, callback) {
    if (key !== accessKeyId) {
      return callback(null);
    }

    return callback({ key: accessKeyId, secret: secretAccessKey });
  },
});

app.use(Hmmac.middleware(hmmac));

app.listen(3000, () => {
  // restify signRequest is sync and passes a writable stream so we can't access the body and have to fudge it a bit
  const data = { hello: 'world' };
  const client = restify.createJsonClient({
    url: 'http://localhost:3000',
    signRequest(req) {
      req.headers = req._headers;
      if (req.method !== 'GET') req.body = JSON.stringify(data);

      const auth = hmmac.sign(
        req,
        {
          key: accessKeyId,
          secret: secretAccessKey,
        },
        true,
      );

      req.setHeader('authorization', auth);
    },
  });

  client.post('/foo', data, (err, req, res, obj) => {
    // eslint-disable-next-line no-console
    console.log('%d -> %j', res.statusCode, res.headers);
    // eslint-disable-next-line no-console
    console.log('%j', obj);
  });
});
