# hmmac (pronounced hammock) [![Build Status](https://secure.travis-ci.org/cmawhorter/hmmac.png)](http://travis-ci.org/cmawhorter/hmmac)

Flexible HMAC authentication module for express/connect and beyond -- with no external dependencies.

It is modeled on AWS request signing and has all the pros/cons of their method.  
  * Pro: Stateless, fast and established
  * Con: [Subject to replay attacks](http://stackoverflow.com/a/12267408)  (See note at bottom)

What is this useful for? Building arbitrary authentication schemes and authorizing against them (usually for use with an API).

## About

Version 0.2.0 is 100% new, and no code from v0.1.0 remains.  Despite the 0.2.0 version, this should be considered 0.1.0 in terms of stability.

As of right now, the API should be considered experimental.  I'm hoping to have it stable by 0.2.1.

## Getting Started

`npm install hmmac`

### Components

Hmmac ships with two main components.  The first is the Hmmac object, which you can instantiate and use to sign on your own.

```javascript
var Hmmac = require('hmmac');
var hmmac = new Hmmac();
```

The second is the middleware for use with any connect-based thingy.

```javascript
var Hmmac = require('hmmac');
server.use(Hmmac.middleware()); // middleware requires a credentialProvider, but we'll get to that later
```

### Config Options

These are the current defaults.  Most are self-explanatory. You specify them like so:

```javascript
var Hmmac = require('hmmac');
var hmmac = new Hmmac({ algorithm: 'sha1' }); // normal
server.use(Hmmac.middleware({ credentialProvider: function(key, callback){} })); // middleware
// and you could also do this with middleware:
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
  debug: process.env.NODE_ENV == 'development' ? 1 : 0
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

#### Custom

You can also create your own custom scheme and plug it into Hmmac.  Just make sure it follows the format of the other schemes and then do: `new Hmmac({ scheme: require('my-custom-scheme') })`


## Examples

Check examples/*.js for some quick-and-dirty examples.  client.js can make requests to either middlware.js or server.js.

Any object that is request-like can be signed.  This means the normal bits... like host, port, path, headers.

## Replay Attacks

Since hmmac (and AWS) is stateless, there is no way to guard against [replay attacks](http://en.wikipedia.org/wiki/Replay_attack).  The risk is mitigated by enforcing an automatic expiration of all requests.  It will be further reduced with implementation of the Expires header (planned very soon).

In theory, it would be possible to slap an [nounce](http://en.wikipedia.org/wiki/Cryptographic_nonce) on requests and tie it into redis -- which would nullify this attack vector -- but that's outside the scope of Hmmac at this time.  _If you want to build something like this, open an issue and I'd be happy to share my thoughts._

## License
Copyright (c) 2014 Cory Mawhorter
Licensed under the MIT license.
