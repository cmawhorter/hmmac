# hmmac (pronounced hammock) [![Build Status](https://secure.travis-ci.org/cmawhorter/hmmac.png)](http://travis-ci.org/cmawhorter/hmmac)

HMAC authentication module and middleware for express/connect and node.

## Getting Started
`npm install hmmac`

## Examples

### Express/Connect Middleware

```javascript
var	express = require('express')
	, hmmac = require('hmmac');

var app = express();

app.configure(function(){
	// If fails, dies with a 401
	var hmmacOptions = {headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: true};
	app.use(hmmac.middleware(hmmacOptions, function(reqAccessKeyId, callback) {
		asyncGetUserByApiKey(reqAccessKeyId, function(user) {
	  	callback({
	  			accessKeyId: user.apikey
	  		, accessKeySecret: user.apisecret
	  	});
		});
	}));
});
```

### Signing restler client requests

Can be used to sign requests made with restler or restify (not shown) clients.

```javascript
var crypto = require('crypto')
	, restler = require('restler')
	, hmmac = require('hmmac')
	, moment = require('moment');

var hmmac = new Hmmac({
	  	headerPrefix: 'Amz'
	  , hash: 'sha256'
	  , serviceLabel: 'AWS'
	  , debug: true
	});

function signRestlerRequest(path, method, data, headers) {
	var req = {
    	method: method || 'GET'
    , path: path
    , headers: {
    	// Insert default headers here
    }
	};

	if (typeof data != 'undefined') req.data = data;
	if (headers)
	{
		for (var name in headers)
		{
			headers[name.toLowerCase()] = headers[name];
		}
	}

	if (!req.headers['content-type']) req.headers['content-type'] = 'application/json';
	if (!req.headers['content-md5']) req.headers['content-md5'] = crypto.createHash('md5').update(req.data || '').digest('hex');
	if (!req.headers['date']) req.headers['date'] = moment().utc().format('ddd, DD MMM YYYY HH:mm:ss ZZ');

  req = hmmac.signHttpRequest(credentials, req);

	return restler[req.method.toLowerCase()]('http://localhost:8081'+req.path, req);
}

var rest = signRestlerRequest('/test/ping');

rest.on('success', function(data, response) {
	console.log('success', data);
}).on('fail', function(data, response) {
	console.log('fail');
}).on('error', function(err, response) {
	console.log('error');
});
```

### Vanilla

```javascript
var http = require('http')
	, Hmmac = require('hmmac');

var hmmac = new Hmmac({headerPrefix:'Amz', hash: 'sha1', serviceLabel: 'AWS', debug: true})
	, credentials = {accessKeyId: '44CF9590006BF252F707', accessKeySecret: 'OtxrzxIsfpFjA7SwPzILwy8Bw21TLhquhboDYROV'};
	, request = {
		  	host: 'localhost'
		  , port: 8080
		  , path: '/notify'
		  , method: 'PUT'
		  , headers: {
		    	'Content-Type': 'application/json'
		    , 'Content-MD5': 'ee930827ccb58cd846ca31af5faa3634'
		  }
		};

var signedRequest = hmmac.signHttpRequest(credentials, request);
console.log(signedRequest);
```

## Quick Docs

### Http Request

An HTTP request object must have the following:
```javascript
{
		path: '/some/path'
	, method: 'GET or POST etc.'
	, headers: {
				'Content-Type': ''
			, 'Content-MD5': 'md5 hash representing the content'
			, 'Date': moment().utc().format('ddd, DD MMM YYYY HH:mm:ss ZZ')
		}
}
```

### Credentials

Credentials must be provided in this form:
```javascript
{
		accessKeyId: '[...]'
	, accessKeySecret: '[...]'
}
```

__Note: In the future, credentials will be replaced by a Credentials class.__

## License
Copyright (c) 2014 Cory Mawhorter
Licensed under the MIT license.


TODO: Include comparison of req/s with passport, etc.
