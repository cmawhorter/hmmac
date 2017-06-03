export function tryParseDate(dateString) {
  try {
    let date = new Date(dateString);
    if (isNaN(date)) return null;
    return date;
  }
  catch (err) {
    return null;
  }
}

export function parseDateToTimestamp(dateString, defaultValue) {
  let dt = tryParseDate(dateString);
  return dt ? dt.getTime() : defaultValue;
}

export function isNotExpired(headerDateValue, acceptableDateSkew, relativeTime) {
  if (false === acceptableDateSkew || acceptableDateSkew < 0) {
    return true;
  }
  let skewInMilli = 0 === acceptableDateSkew ? 1000 : acceptableDateSkew * 1000;
  let now         = relativeTime || Date.now();
  let then        = parseDateToTimestamp(headerDateValue, 0);
  let diff        = Math.abs(now - then); // Math.abs because skew is +/- and not an expiration
  return diff <= skewInMilli;
};

