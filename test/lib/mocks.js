var jsonPayload = '{"some":"thing"}'
  , formPayload = 'some=thing';

function randomString(n) {
  var s = '';
  for (var i=0; i < n; i++) {
    s += String.fromCharCode(Math.floor(Math.random() * 500000));
  }
  return s;
}

module.exports = {
  signedCredentials: {
    key: '1',
    secret: 'a'
  },

  invalidCredentials: {
    key: '1',
    secret: 'not-correct'
  },

  acidParsedAuth: {
    serviceLabel: randomString(1048577),
    key: randomString(1048577),
    signature: randomString(1048577)
  },

  acidRequest: {
    host: randomString(1048577),
    port: 99999,
    path: randomString(1048577),
    method: 'INVALID',
    body: JSON.stringify({
        "glossary": {
            "title": "example glossary",
        "GlossDiv": {
                "title": "S",
          "GlossList": {
                    "GlossEntry": {
                        "ID": "SGML",
              "SortAs": "SGML",
              "GlossTerm": "Standard Generalized Markup Language",
              "Acronym": "SGML",
              "Abbrev": "ISO 8879:1986",
              "GlossDef": {
                            "para": "A meta-markup language, used to create markup languages such as DocBook.",
                "GlossSeeAlso": ["GML", "XML"]
                        },
              "GlossSee": "markup"
                    }
                }
            }
        }
    }),
    headers: {
      'Content-Type': 'not valid',
      'Date': 'not valid',
      'Authorization': randomString(1048577)
    }
  },

  aws4: {
    unsignedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: jsonPayload,
      headers: {
        'Content-Type': 'application/json',
        'Date': 'Sat, 01 Mar 2014 06:18:58 GMT'
      }
    },

    unsignedRequestCurrent: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: jsonPayload,
      headers: {
        'Content-Type': 'application/json',
        'Date': new Date().toUTCString()
      }
    },

    signedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: '{"some":"thing"}',
      headers: {
        'content-type': 'application/json',
        date: 'Sat, 01 Mar 2014 06:53:50 GMT',
        host: 'localhost:8080',
        authorization: 'AWS4-HMAC-SHA256 Credential=1/20140228/no-region/no-service/aws4_request, SignedHeaders=content-type;date;host, Signature=3329a90931ab42ed328e9b8a1fb233a8668506d3d7c360259ad4d067c8d29c82'
      }
    },

    invalidSignedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: '{"some":"thing"}',
      headers:
       {
          'content-type': 'application/json',
          date: 'Sat, 01 Mar 2014 06:27:06 GMT',
          host: 'localhost:8080',
          authorization: 'AWS4-HMAC-SHA256 Credential=1/20140228/no-region/no-service/aws4_request, SignedHeaders=content-type;date;host, Signature=notcorrect'
        }
    }
  },

  plain: {
    unsignedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: jsonPayload,
      headers: {
        'Content-Type': 'application/json',
        'Date': 'Sat, 01 Mar 2014 06:18:58 GMT'
      }
    },

    unsignedRequestCurrent: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: jsonPayload,
      headers: {
        'Content-Type': 'application/json',
        'Date': new Date().toUTCString()
      }
    },

    signedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: '{"some":"thing"}',
      headers: {
        'content-type': 'application/json',
        date: 'Sat, 01 Mar 2014 06:53:50 GMT',
        host: 'localhost:8080',
        authorization: 'HMAC 1:7640579425817317c132f4a2feb54907d6a90083cd01a8d7221e29803c32b418',
        'x-auth-signedheaders': 'content-type;date;host'
      }
    },

    invalidSignedRequestFrozen: {
      host: 'localhost',
      port: 8080,
      path: '/fuckyeah',
      method: 'PUT',
      body: '{"some":"thing"}',
      headers:
       {
          'content-type': 'application/json',
          date: 'Sat, 01 Mar 2014 06:27:06 GMT',
          host: 'localhost:8080',
          authorization: 'HMAC 1:notcorrect',
          'x-auth-signedheaders': 'content-type;date;host'
        }
    }
  },

  responseEmpty: function() {
    var res = {
      statusCode: null,
      headers: {},
      setHeader: function(k, v) {
        res.headers[k.toLowerCase().trim()] = v;
      }
    };

    return res;
  },

  responseOk: {
    statusCode: 200
  },

  responseUnauthorized: {
    statusCode: 401
  },

  responseForbidden: {
    statusCode: 403
  }
};
