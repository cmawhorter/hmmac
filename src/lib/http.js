import { parse as parseUrl } from 'url';
import { replace as replaceHeaderInCollection, find as findHeaderByName, has as hasHeaderName, fromHash as toHeaderCollection, append as appendHeaderToCollection } from 'http-header-collection';

export function normalizeRequest(req, body) {
  let headers = parseHeaders(req);
  let url = 'url' in req ? req.url : `${req.protocol}//${req.hostname}${req.path}`;
  return Object.assign({
    method:         req.method.toUpperCase(),
    url:            url,
    body:           void 0 !== body ? body : parseBody(req),
    getHeader: (name) => {
      let values = findHeaderByName(headers, name);
      return values ? values[0] : null;
    },
    setHeader: (name, value) => {
      replaceHeaderInCollection(headers, name, [value]);
    },
    hasHeader: (name) => hasHeaderName(headers, name),
  }, parseUrl(url));
}

export function parseHeaders(req) {
  let headers     = toHeaderCollection({});
  let rawHeaders  = req.rawHeaders;
  if (rawHeaders) {
    let appendHeader    = appendHeaderToCollection.bind(null, headers);
    let lastHeaderIndex = rawHeaders.length - 1;
    for (let i=0; i < lastHeaderIndex; i += 2) {
      let headerName  = rawHeaders[i];
      let headerValue = rawHeaders[i + 1];
      appendHeader(headerName, headerValue);
    }
  }
  else {
    headers = toHeaderCollection(req.headers);
  }
  return headers;
}

export function parseBody(req) {
  let body = 'body' in req ? req.body : '';
  return typeof body === 'string' ? body : JSON.stringify(body);
}

