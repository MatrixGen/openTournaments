const normalizeName = (value) => (typeof value === 'string' ? value.trim() : '');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidUrl = (value) => {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

module.exports = {
  normalizeName,
  isNonEmptyString,
  isValidUrl,
};
