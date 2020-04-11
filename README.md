# hmmac (pronounced hammock) [![Build Status](https://travis-ci.org/cmawhorter/hmmac.svg?branch=master)](http://travis-ci.org/cmawhorter/hmmac)

Flexible HMAC authentication module for express/connect and beyond -- with no external (to nodejs) dependencies.

It is modeled on AWS request signing and has all the pros/cons of their method.  
  * Pro: Stateless, fast and established
  * Con: [Subject to replay attacks](http://stackoverflow.com/a/12267408)  (See note at bottom)

What is this useful for? Building arbitrary stateless authentication schemes and authorizing against them (usually for use with an API).  i.e. not OAuth or anything else that requires session state.

## Getting Started

`npm install hmmac`

### Components

Hmmac ships with two main components.  The first is the Hmmac object, which you can instantiate and use to sign on your own.

```javascript
var Hmmac = require('hmmac-es6');
var hmmac = new Hmmac();
```

The second is the middleware for use with any connect-based thingy.

```javascript
var Hmmac = require('hmmac-es6');
server.use(Hmmac.middleware()); // middleware requires a credentialProvider, but we'll get to that later
```

They are both built around signing and validating node's standard http objects.

```javascript
// directly
var hmmac = new Hmmac();
hmmac.validate(req, function(valid) {
  // parses req.headers['authorization']
  // valid is true/false (like.fs.exists)
});

// middleware
var verifySigned = Hmmac.middleware({
  credentialProvider: function(key, callback) { /* ... */ }
});
server.post('/message', verifySigned, function(req, res, next) {
  // if we're here, the request was authenticated
});
```

### Config Options

These are the current defaults.  Most are self-explanatory. You specify them like so:

```javascript
var Hmmac = require('hmmac-es6');
var hmmac = new Hmmac({ algorithm: 'sha1' }); // normal
server.use(Hmmac.middleware({ credentialProvider: function(key, callback){} })); // middleware
// btw: you can pass an existing instance directly to the middleware
server.use(Hmmac.middleware(hmmac)); // and pass an existing hmmac object
```

Until the Hmmac API is stable, you should not rely on defaults as they may change.

```javascript
var DEFAULTS = {
  algorithm: 'sha256',
  acceptableDateSkew: 900, // in seconds, def 15 minutes. only done if date is signed
  credentialProvider: defCredentialProvider,
  credentialProviderTimeout: 15, // in seconds. time to wait for credentialProvider to return
  signatureEncoding: 'hex', // signature encoding. valid = binary, hex or base64
  signedHeaders: [ 'host', 'content-type', 'date' ],
  wwwAuthenticateRealm: 'API',
  scheme: Hmmac.schemes.load('plain'),
  debug: process.env.NODE_ENV == 'development' ? 1 : 0 // use 2 for more verbose
};
```

**acceptableDateSkew:** This is how much difference there can be between server time and a client request, in seconds. Disable by setting to falsey.  _Date is required in signedHeaders for this to work._

**credentialProvider:** Hmmac::validate async calls credentialProvider to retrieve the key/secret for a given key (so you can retrieve it from a database).  **Required** by middleware.  Expects a function like so:

```javascript
function credentialProvider(key, callback) {
  process.nextTick(function() {
    // callback(null) if user is not found
    callback({
      key: '[user api key from db]',
      secret: '[user api secret from db']'
    });
  });
}
```

**credentialProviderTimeout:** If credentialProvider() doesn't return within this time, it'll mark the request as invalid.

**signedHeaders:** Only the headers here will be used in the message to sign.  All others will be ignored and could be modified enroute without invalidating the request.  

**wwwAuthenticateRealm:** See [this RFC](https://www.ietf.org/rfc/rfc2617.txt) for more information about WWW-Authenticate.  The goal is to help the client automatically negotiate the correct authorization.  You can disable by setting to falsey.  

_Breaking change warning: Defaults to the string 'API' in 0.2.x.  In 0.3.0, it will default to false.  No one seeems to use this._

**scheme:** See Schemes below.  This will load the scheme module, which will make sure your authorization header conforms to the desired format.  Use Hmmac.schemes.load('[scheme]') to load a scheme.  Currently aws4 and plain are the only two supported.

### Schemes

As advertised, Hmmac is flexible.  It gains this flexibility through "schemes".

Hmmac does most of the work, but then hands-off to a scheme to ensure the authorization credential conforms to your desired standard.  Hmmac ships with two schemes; plain and aws4.

Schemes may do more than just customize the authorization header, but that is their main purpose; customizing the request object to make it match your authentication standard.

#### AWS4

AWS4 is pretty self-explanatory.  It aims to follow the [AWS Signature Version 4](http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html) spec outlined by Amazon exactly.  I've done this so that existing Amazon clients can authenticate against your API without much customization.

Returns a request object with a header like this:

```
Authorization: AWS4-HMAC-SHA256 Credential=1/20140228/no-region/no-service/aws4_request, SignedHeaders=content-type;date;host, Signature=3329a90931ab42ed328e9b8a1fb233a8668506d3d7c360259ad4d067c8d29c82
```

"AWS4-HMAC-SHA256" is what's known as a service label.  It aims to allow clients to automatically negotiate authentication.  Basic authentication in the browser is an example of this automatic negotiation.

#### Plain

Normal API message signing stuff.  Builds a string based on an HTTP request and then signs it with the user's secret key.  Only the signedHeaders are included in the string to be signed.

Plain will return a request object with these headers:

```
Authorization: HMAC 7c132f4...the user api key...4907d6a9:7640579425817317c132f4a2feb54907d6a90083cd01a8d7221e29803c32b418
X-Auth-SignedHeaders: content-type;date;host
```

#### Custom Schemes

You can also create your own custom scheme and plug it into Hmmac.  Just make sure it follows the format of the other schemes and then do: `new Hmmac({ scheme: require('my-custom-scheme') })`

See below for details on how to implement your own scheme.


## Examples

Check examples/*.js for some quick-and-dirty examples.  client.js can make requests to either middlware.js or server.js.

Any object that is request-like can be signed.  This means the normal bits... like host, port, path, headers.

## Debugging / Troubleshooting

To get more information about what's going on internally, enable `debug: 2` in the options.  With debugging enabled, you can call `hmmac.why()` to have details about the last request output to the console.

```javascript
var hmmac = new Hmmac({ debug: 1 });
hmmac.validate(req, function(valid) {
  hmmac.why();
});
```

## Custom Schemes

Hmmac ships with [two built-in schemes](https://github.com/cmawhorter/hmmac/tree/master/lib/schemes).  If you're interested in implementing your own scheme, copying and modifying `plain` is probably a good place to start.

### Required Properties

A scheme must be an object literal with the following properies.   These properties are used by the core hmmac lib to validate and sign requests with your scheme.  

  - `parseAuthorization: function(req)` - Single argument is something that looks like node's http.ClientRequest.  Returns a Parsed Auth object literal (defined below).
  - `buildAuthorization: function(req, key, signature)` - Returns the key/value header. e.g. `return { key: 'x-my-custom-authorization-header', value: 'HMAC af:1def' }`
  - `sign: function(req, credentials)` - Modifies the request with all the necessary bits ot make your scheme work and returns the signature.
  - `getServiceLabel: function()` - Returns a string service label representing your auth scheme.  e.g. `return 'MYAPI';`

### Parsed Auth

An object literal with three required string properties.  

Example:  `HMAC 7c132f4:7640579425817317c132f4a2feb54`

  - `serviceLabel` = `'HMAC'`
  - `key` = `'7c132f4'`
  - `signature` = `'7640579425817317c132f4a2feb54'`

You can extend the object with any additional properties to make your scheme work.  e.g. the aws4 scheme includes an additional `schemeConfig` property which parses all that `Credential=..., SignedHeaders=..., Signature=...` stuff.

## Express 4.x

As of Express 4.0 (and maybe earlier) [req.body will be undefined by default](http://expressjs.com/api.html#req.body) and you must include body-parser to have req.body be populated.  req.body is required for hmmac to work so be sure to include the body-parser middleware *prior* to hmmac's middleware otherwise validation will fail.

## Replay Attacks

Since hmmac (and AWS) is stateless, there is no way to guard against [replay attacks](http://en.wikipedia.org/wiki/Replay_attack).  The risk is mitigated by enforcing an automatic expiration of all requests.  It will be further reduced with implementation of the Expires header (planned very soon).

It's conceivably possible to slap an [nonce](http://en.wikipedia.org/wiki/Cryptographic_nonce) on requests, but that's outside the scope of Hmmac at this time.  

## License
Copyright (c) 2015 Cory Mawhorter
Licensed under the MIT license.
