export function tryParseDate(dateString) {
  try {
    return new Date(dateString);
  }
  catch (err) {
    return null;
  }
}

export function parseDateToTimestamp(dateString, defaultValue) {
  let dt = tryParseDate(dateString);
  return dt ? dt.getTime() : defaultValue;
}

export function isNotExpired(headerDateValue, acceptableDateSkew) {
  if (!acceptableDateSkew) {
    return true;
  }
  let skewInMilli = acceptableDateSkew * 1000;
  let now         = Date.now();
  let then        = parseDateToTimestamp(headerDateValue, 0);
  let diff        = Math.abs(now - then); // Math.abs because skew is +/- and not an expiration
  return diff < skewInMilli;
};

