export default {
  authorizationHeaderName:        'authorization',
  algorithm:                      'sha256',
  // in seconds, def 15 minutes. only done if date is signed
  acceptableDateSkew:             900,
  // signature encoding. valid = binary, hex or base64
  signatureEncoding:              'hex',
  signedHeaders:                  [ 'host', 'content-type', 'date' ],
  wwwAuthenticateRealm:           'API',
}
