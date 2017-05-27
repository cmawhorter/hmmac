import { parse as querystringParse } from 'querystring';
import BaseScheme from './_base.js';

// AWS Signature Version 4: http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

const BINARY = 'binary';

export default class Aws4Scheme extends BaseScheme {
  constructor(algorithm, encoding, options) {
    super(algorithm, encoding);
    options = options || {};
    this.region     = options.region;
    this.service    = options.service;
  }

  get serviceLabel() {
    return `AWS4-HMAC-${this.algorithm.toUpperCase()}`;
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

  _headersSignedInRequest(req) {
    return (req.getHeader('x-auth-signedheaders') || '').toLowerCase().split(/\s*\;\s*/);
  }

  _signedHeaders(req) {
    let requestSignedHeaders  = this._headersSignedInRequest(req);
    let signedHeaders         = req.getSignedHeaders();
    signedHeaders.sort();
    return signedHeaders;
  }

  _canonicalHeadersForRequest(req, signedHeaders) {
    return signedHeaders.map(headerName => {
      headerName = headerName.toLowerCase();
      let headerValue = (req.getHeader(headerName) || '').trim();
      return `${headerName}:${headerValue}`;
    });
  }

  buildMessage(req) {
    let signedHeaders           = this._signedHeaders(req);
    let canonicalHeaders        = this._canonicalHeadersForRequest(req, signedHeaders);
    let canonicalRequest        = [
      req.method,
      req.path,
      req.query,
      ...canonicalHeaders,
      '', // new line after headers
      signedHeaders.join(';'),
      this.hash(req.body, 'hex'),
    ].join('\n');
    let suppliedDate            = this.getHeaderDate(req);
    let credentialScope         = [this.getCredentialDate(suppliedDate), this.region, this.service, 'aws4_request'].join('/');
    let hashedCanonicalRequest  = this.hash(canonicalRequest, 'hex');
    return [
      this.serviceLabel,
      this.getAwsISO8601Date(suppliedDate),
      credentialScope,
      hashedCanonicalRequest
    ].join('\n');
  }

  signMessage(message, key, secret) {
    let headerDate        = this.getHeaderDate(req);
    let query             = querystringParse(req.query || '');
    // if both query date and header date are supplied they should match exactly
    if ('x-amz-date' in query && headerDate && query['x-amz-date'] !== headerDate) {
      return null;
    }
    let suppliedDate      = query['x-amz-date'] || headerDate;
    let kDate             = this.hmac(this.getCredentialDate(suppliedDate), 'AWS4' + credentials.secret, BINARY)
    let kRegion           = this.hmac(this.config.schemeConfig.region || _defRegion, kDate, BINARY)
    let kService          = this.hmac(this.config.schemeConfig.service || _defService, kRegion, BINARY)
    let kSigning          = this.hmac('aws4_request', kService, BINARY);
    return this.hmac(kSigning, message);
  }

  parse(authorizationHeaderValue) {
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
    return { serviceLabel, key, signature, aws: signatureProperties };
  }

  format(req, key, secret) {
    let suppliedDate      = this.getHeaderDate(req);
    let signedHeaders     = [];
    let credential        = [
      key,
      this.getCredentialDate(suppliedDate),
      this.region,
      this.service,
      'aws4_request'
    ].join('/');
    let signature         = this.signMessage(credential, secret);
    return `${this.serviceLabelPrefixed} Credential=${credential}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  }
}
