import crypto from 'crypto';
import { parse as querystringParse } from 'querystring';

import HmmacSigningScheme from './_base.js';
import Message from '../lib/message.js';

// AWS Signature Version 4: http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

const BINARY = 'binary';

export default class Aws4Scheme extends HmmacSigningScheme {
  constructor(options) {
    options = options || {};
    super('sha256', Message.HEX);
    this.region     = options.region;
    this.service    = options.service;
  }

  _validate(req, signedHeaders) {
    let containsAllSignedHeaders = true;
    for (let headerName of signedHeaders) {
      containsAllSignedHeaders = containsAllSignedHeaders && req.hasHeader(headerName);
    }
    let validationErrors = [];
    if (!containsAllSignedHeaders) {
      validationErrors.push(`invalid request; these headers must be signed: ${signedHeaders.join(', ')}`);
    }
    if (validationErrors.length) {
      return new Error('validation failed; ' + validationErrors.join('\n'));
    }
    else {
      return null;
    }
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

  _canonicalHeadersForRequest(req, signedHeaders) {
    return signedHeaders.map(headerName => {
      headerName = headerName.toLowerCase();
      let headerValue = (req.getHeader(headerName) || '').trim();
      return `${headerName}:${headerValue}`;
    });
  }

  _canonicalRequest(req, signedHeaders) {
    // console.log('_canonicalRequest', {req, signedHeaders});
    let canonicalHeaders = this._canonicalHeadersForRequest(req, signedHeaders);
    return [
      req.method,
      req.pathname,
      req.query || '',
      ...canonicalHeaders,
      '', // new line after headers
      signedHeaders.join(';'),
      new Message(this.algorithm, Message.HEX, req.body).hash(),
    ];
  }

  _buildMessage(req, signedHeaders) {
    // console.log('_buildMessage', {req, signedHeaders})
    let canonicalRequest        = this._canonicalRequest(req, signedHeaders).join('\n');
    let headerDate              = this.getHeaderDate(req);
    let credentialScope         = [this.getCredentialDate(headerDate), this.region, this.service, 'aws4_request'].join('/');
    let hashedCanonicalRequest  = new Message(this.algorithm, Message.HEX, canonicalRequest).hash();
    let query = querystringParse(req.query || '');
    // if both query date and header date are supplied they should match exactly
    if ('x-amz-date' in query && headerDate && query['x-amz-date'] !== headerDate) {
      return null;
    }
    let message = new Message(this.algorithm, this.encoding, [
      this.serviceLabel,
      this.getAwsISO8601Date(headerDate),
      credentialScope,
      hashedCanonicalRequest
    ].join('\n'));
    message.meta.headerDate     = headerDate;
    return message;
  }

  _signMessage(message, key, secret) {
    let credDate          = this.getCredentialDate(message.meta.headerDate);
    let kDate             = new Message(this.algorithm, Message.BINARY, credDate).sign('AWS4' + secret);
    let kRegion           = new Message(this.algorithm, Message.BINARY, this.region).sign(kDate);
    let kService          = new Message(this.algorithm, Message.BINARY, this.service).sign(kRegion);
    let kSigning          = new Message(this.algorithm, Message.BINARY, 'aws4_request').sign(kService);
    console.log('_signMessage', {
      message,
      key,
      secret,
      credDate,
      headerDate: message.meta.headerDate,
      region:     this.region,
      service:    this.service,
      kDate,
      kRegion,
      kService,
      kSigning,
    })
    return new Message(this.algorithm, this.encoding, message.toString()).sign(kSigning);
  }

  _parseHeader(authorizationHeaderValue) {
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

  _buildCredentialString(key, headerDate) {
    return [
      key,
      this.getCredentialDate(headerDate),
      this.region,
      this.service,
      'aws4_request'
    ].join('/');
  }

  _format(req, signedHeaders, key, secret) {
    let message           = this.buildMessage(req, signedHeaders);
    let headerDate        = message.meta.headerDate;
    let credential        = this._buildCredentialString(key, headerDate);
    let signature         = this.signMessage(message, key, secret);
    return `${this.prefix}Credential=${credential}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  }
}
