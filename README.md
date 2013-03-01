# hmmac (pronounced hammock) [![Build Status](https://secure.travis-ci.org/cmawhorter/hmmac.png)](http://travis-ci.org/cmawhorter/hmmac)

HMAC authentication module and middleware for express/connect and node.

hmmac was forked from [ofuda](http://github.com/wolfeidau/ofuda).

## Getting Started
`npm install hmmac`

```javascript
var Hmmac = require('hmmac');

var hmmac = new Hmmac({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', accessKeyId: '44CF9590006BF252F707', accessKeySecret: 'OtxrzxIsfpFjA7SwPzILwy8Bw21TLhquhboDYROV'});

hmmac.signHttpRequest(request); // appends a hmac authorisation header to the request
```

## Examples

Use as a client is illustrated below.

```javascript
var http = require('http');
var Hmmac = require('hmmac');

var hmmac = new Hmmac({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: true});

var credentials = {accessKeyId: '44CF9590006BF252F707', accessKeySecret: 'OtxrzxIsfpFjA7SwPzILwy8Bw21TLhquhboDYROV'};

http_options = {
    host: 'localhost',
    port: 8080,
    path: '/notify',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-MD5': 'ee930827ccb58cd846ca31af5faa3634'
    }
};

signedOptions = hmmac.signHttpRequest(credentials, http_options);

var req = http.request(signedOptions, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
});

req.write('{"some":"thing"}');
req.end();
```

Use as a server is as follows.

```javascript
var http = require('http'),
    Hmmac = require('hmmac');


var hmmac = new Hmmac({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: true});

var validateCredentials = function(requestAccessKeyId){
    return {accessKeyId: requestAccessKeyId, accessKeySecret: 'OtxrzxIsfpFjA7SwPzILwy8Bw21TLhquhboDYROV'};
}

http.createServer(function (request, response) {

    if(hmmac.validateHttpRequest(request, validateCredentials)){
        response.writeHead(200);
        response.end('Success!');
    } else {
        response.writeHead(401)
        response.end('Authorization failed!');
    }

}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');
```

## License
Copyright (c) 2012 Mark Wolfe
Licensed under the MIT license.

Copyright (c) 2013 Cory Mawhorter
Licensed under the MIT license.
