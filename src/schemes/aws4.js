import BaseScheme from './_base.js';

// AWS Signature Version 4: http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

export default class Aws4Scheme extends BaseScheme {
  constructor(options) {
    super();
    options = options || {};
    this.algorithm  = options.algorithm;
    this.region     = options.region;
    this.service    = options.service;
  }

  get serviceLabel() {
    return `AWS4-HMAC-${this.algorithm}`;
  }

  getAwsISO8601Date(dt) {
    var d = new Date(dt);
    var s = d.toISOString().replace(/[^\dT]/g, '');
    return s.substr(0, s.length - 3) + 'Z'; // trim milliseconds because it's not supported
  }

  getCredentialDate(dt) {
    return this.getAwsISO8601Date(dt).split('T')[0];
  }

  convertAwsISO8601DateToStd(dt) {
    // 20111014T235959Z
    var parts = dt.split('Z')[0].split('T')
      , d = parts[0]
      , t = parts[1]
      , dYear = d.substr(0, 4)
      , dMonth = d.substr(4, 2)
      , dDay = d.substr(6, 2)
      , tHour = t.substr(0, 2)
      , tMinute = t.substr(2, 2)
      , tSecond = t.substr(4, 2)
      , fixedDate = [ dYear, dMonth, dDay ].join('-')
      , fixedTime = [ tHour, tMinute, tSecond ].join(':')
      , fixedDateTime = [ fixedDate, 'T', fixedTime, 'Z' ].join('');

    return new Date(fixedDateTime).toISOString();
  }

  getHeaderDate(req) {
    return req.getHeader('x-amz-date') ? this.convertAwsISO8601DateToStd(req.getHeader('x-amz-date')) : req.getHeader('date');
  }

  message() {
    req.signedHeaders.sort();

    var CanonicalHeaders = '';
    for (var i=0; i < req.signedHeaders.length; i++) {
      var headerKey = req.signedHeaders[i]
        , v = req.original.headers.hasOwnProperty(headerKey) ? req.original.headers[headerKey] : '';
      CanonicalHeaders += headerKey.toLowerCase() + ':' + v.trim() + '\n';
    }

    var body = this._body(req);
    var path = typeof req.original.path == 'function' ? req.original.path() : req.original.path || req.original.url;
    var query = typeof req.original.query == 'function' ? req.original.query() : req.original.query || {};
    if (typeof query == 'object') query = querystringStringify(query);

    var CanonicalRequest =
        req.original.method.toUpperCase() + '\n' +
        path + '\n' +
        query + '\n' +
        CanonicalHeaders + '\n' +
        req.signedHeaders.join(';') + '\n' +
        this._hash(body, 'hex');

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    var suppliedDate = getHeaderDate(req.original.headers);
    var CredentialScope = [this.getCredentialDate(suppliedDate), this.region, this.service, 'aws4_request'].join('/');
    var HashedCanonicalRequest = this._hash(CanonicalRequest, 'hex');
    var StringToSign  =  [
        'AWS4-HMAC-' + this.config.algorithm.toUpperCase(),
        getAwsISO8601Date(suppliedDate),
        CredentialScope,
        HashedCanonicalRequest
      ].join('\n');

    if (this.config.debug) {
      this._lastStringToSign = StringToSign;
    }

    return StringToSign;
  }

  parse(authorizationHeaderValue, options) {
    // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=ced6826de92d2bdeed8f846f0bf508e8559e98e4b0199114b84c54174deb456c
    let [serviceLabel,]         = authorizationHeaderValue.split(/\s+/, 1);
    let rawSignatureProperties  = authorizationHeaderValue.substr(serviceLabel.length).split(/,\s*/).map(signatureProperty => {
      return signatureProperty.split('=');
    });
    let signatureProperties     = {};
    for (let [propertyName,propertyValue] of rawSignatureProperties) {
      signatureProperties[propertyName.toLowerCase().trim()] = propertyValue.trim();
    }
    let key                     = signatureProperties['credential'].split('/')[0];
    let signature               = signatureProperties['signature'];
    return { serviceLabel, key, signature };
  }

  build(req, key, secret, options) {
    var suppliedDate = this.getHeaderDate(req);
    var signedHeaders = [];
    var credential = [
      key,
      this.getCredentialDate(suppliedDate),
      this.region,
      this.service,
      'aws4_request'
    ].join('/');
    var signature = 'TODO:';
    return `${this.serviceLabelPrefixed} Credential=${credential}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  }
}

  // sign: function(req, credentials) {
  //   if (this.config.debug) this._lastRequest = req;
  //   if (typeof this.config.schemeConfig == 'undefined') this.config.schemeConfig = {};

  //   var headerDate = getHeaderDate(req.original.headers);
  //   var query = typeof req.original.query === 'function' ? req.original.query() : req.original.query || {};
  //   if (typeof query === 'string') {
  //     query = querystringParse(query);
  //   }


  //   // if both query date and header date are supplied they should match exactly
  //   if ('x-amz-date' in query && headerDate && query['x-amz-date'] !== headerDate) {
  //     return null;
  //   }

  //   var suppliedDate = query['x-amz-date'] || headerDate;
  //   var kDate = this._hmac(getCredentialDate(suppliedDate), 'AWS4' + credentials.secret, 'binary')
  //     , kRegion = this._hmac(this.config.schemeConfig.region || _defRegion, kDate, 'binary')
  //     , kService = this._hmac(this.config.schemeConfig.service || _defService, kRegion, 'binary')
  //     , kSigning = this._hmac('aws4_request', kService, 'binary');

  //   var message = this.config.scheme.buildMessageToSign.call(this, req);
  //   return this._hmac(message, kSigning, this.config.signatureEncoding);
  // }
