const SERVICE_LABEL           = 'HMAC';
const SERVICE_LABEL_SEPARATOR = ' ';

export default class BaseScheme {
  constructor() {
  }

  get serviceLabel() {
    return SERVICE_LABEL;
  }

  get serviceLabelSeparator() {
    return SERVICE_LABEL_SEPARATOR;
  }

  get serviceLabelPrefixed() {
    return `${this.serviceLabel}${this.serviceLabelSeparator}`;
  }

  message(req) {
    throw new Error('must inherit');
  }

  parse(headerValue) {
    throw new Error('must inherit');
  }

  build() {
    throw new Error('must inherit');
  }
}
