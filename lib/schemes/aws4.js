/*
 * hmmac
 * https://github.com/cmawhorter/hmmac
 *
 * Copyright (c) 2014 Cory Mawhorter
 * Licensed under the MIT license.
 */

// AWS Signature Version 4: http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

const querystring = require('querystring');

function getAwsISO8601Date(dt) {
  const d = new Date(dt);
  const s = d.toISOString().replace(/[^\dT]/g, '');

  return `${s.substr(0, s.length - 3)}Z`; // trim milli
}

function getCredentialDate(dt) {
  return getAwsISO8601Date(dt).split('T')[0];
}

function convertAwsISO8601DateToStd(dt) {
  // 20111014T235959Z
  const parts = dt.split('Z')[0].split('T');
  const d = parts[0];
  const t = parts[1];
  const dYear = d.substr(0, 4);
  const dMonth = d.substr(4, 2);
  const dDay = d.substr(6, 2);
  const tHour = t.substr(0, 2);
  const tMinute = t.substr(2, 2);
  const tSecond = t.substr(4, 2);
  const fixedDate = [dYear, dMonth, dDay].join('-');
  const fixedTime = [tHour, tMinute, tSecond].join(':');
  const fixedDateTime = [fixedDate, 'T', fixedTime, 'Z'].join('');

  return new Date(fixedDateTime).toISOString();
}

function getHeaderDate(headers) {
  if ('x-amz-date' in headers) {
    return convertAwsISO8601DateToStd(headers['x-amz-date']);
  }

  return headers.date;
}

const _defRegion = 'no-region';
const _defService = 'no-service';

const scheme = {
  authorizationHeader: 'authorization',

  getServiceLabel() {
    return `AWS4-HMAC-${this.config.algorithm.toUpperCase()}`;
  },

  buildMessageToSign(req) {
    req.signedHeaders.sort();

    let CanonicalHeaders = '';

    for (let i = 0; i < req.signedHeaders.length; i += 1) {
      const headerKey = req.signedHeaders[i];
      const v = Object.prototype.hasOwnProperty.call(
        req.original.headers,
        headerKey,
      )
        ? req.original.headers[headerKey]
        : '';
      CanonicalHeaders += `${headerKey.toLowerCase()}:${v.trim()}\n`;
    }

    const body = this._body(req);
    const path =
      typeof req.original.path === 'function'
        ? req.original.path()
        : req.original.path || req.original.url;
    let query =
      typeof req.original.query === 'function'
        ? req.original.query()
        : req.original.query || {};
    if (typeof query === 'object') query = querystring.stringify(query);

    let bodyHash;

    if (req.original.headers['x-amz-content-sha256']) {
      // See this https://github.com/cmawhorter/hmmac/issues/18
      // and this https://github.com/aws/aws-sdk-js/blob/5fcf374193e4922f30d1720de8fc84986d309a62/lib/signers/v4.js#L177
      // for details.
      bodyHash = req.original.headers['x-amz-content-sha256'];
    } else {
      bodyHash = this._hash(body, 'hex');
    }

    const CanonicalRequest = `${req.original.method.toUpperCase()}\n${path}\n${query}\n${CanonicalHeaders}\n${req.signedHeaders.join(
      ';',
    )}\n${bodyHash}`;

    if (this.config.debug) {
      this._lastCanonicalRequest = CanonicalRequest;
      this._lastRequestBody = body;
    }

    const suppliedDate = getHeaderDate(req.original.headers);
    const CredentialScope = [
      getCredentialDate(suppliedDate),
      this.config.schemeConfig.region || _defRegion,
      this.config.schemeConfig.service || _defService,
      'aws4_request',
    ].join('/');
    const HashedCanonicalRequest = this._hash(CanonicalRequest, 'hex');
    const StringToSign = [
      `AWS4-HMAC-${this.config.algorithm.toUpperCase()}`,
      getAwsISO8601Date(suppliedDate),
      CredentialScope,
      HashedCanonicalRequest,
    ].join('\n');

    if (this.config.debug) {
      this._lastStringToSign = StringToSign;
    }

    return StringToSign;
  },

  parseAuthorization(req) {
    try {
      // AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20110909/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=ced6826de92d2bdeed8f846f0bf508e8559e98e4b0199114b84c54174deb456c
      const sl = req.original.headers[this.config.scheme.authorizationHeader]
        .split(' ', 1)[0]
        .trim();
      const rawprops = req.original.headers[
        this.config.scheme.authorizationHeader
      ]
        .substr(sl.length)
        .split(',');
      const props = {};

      for (let i = 0; i < rawprops.length; i += 1) {
        const parts = rawprops[i].split('=');
        props[parts[0].toLowerCase().trim()] = parts[1].trim();
      }

      const credparts = props.credential.split('/');
      const key = credparts.shift();

      req.signedHeaders = props.signedheaders.toLowerCase().split(/\s*;\s*/);

      return {
        serviceLabel: sl,
        key,
        signature: props.signature,
        schemeConfig: credparts,
      };
    } catch (err) {
      this.log(err);

      return null;
    }
  },

  buildAuthorization(req, key, signature) {
    if (typeof this.config.schemeConfig === 'undefined') {
      this.config.schemeConfig = {};
    }
    const suppliedDate = getHeaderDate(req.original.headers);
    const credential = [
      key,
      getCredentialDate(suppliedDate),
      this.config.schemeConfig.region || _defRegion,
      this.config.schemeConfig.service || _defService,
      'aws4_request',
    ].join('/');

    return {
      key: this.config.scheme.authorizationHeader,
      value: `${this.config.scheme.getServiceLabel.call(
        this,
      )} Credential=${credential}, SignedHeaders=${req.signedHeaders.join(
        ';',
      )}, Signature=${signature}`,
    };
  },

  sign(req, credentials) {
    if (this.config.debug) this._lastRequest = req;

    if (typeof this.config.schemeConfig === 'undefined') {
      this.config.schemeConfig = {};
    }

    const headerDate = getHeaderDate(req.original.headers);
    let query =
      typeof req.original.query === 'function'
        ? req.original.query()
        : req.original.query || {};

    if (typeof query === 'string') {
      query = querystring.parse(query);
    }

    // if both query date and header date are supplied they should match exactly
    if (
      'x-amz-date' in query &&
      headerDate &&
      query['x-amz-date'] !== headerDate
    ) {
      return null;
    }

    const suppliedDate = query['x-amz-date'] || headerDate;
    const kDate = this._hmac(
      getCredentialDate(suppliedDate),
      `AWS4${credentials.secret}`,
    );
    const kRegion = this._hmac(
      this.config.schemeConfig.region || _defRegion,
      kDate,
    );
    const kService = this._hmac(
      this.config.schemeConfig.service || _defService,
      kRegion,
    );
    const kSigning = this._hmac('aws4_request', kService);
    const message = this.config.scheme.buildMessageToSign.call(this, req);

    return this._hmac(message, kSigning, this.config.signatureEncoding);
  },
};

module.exports = scheme;
