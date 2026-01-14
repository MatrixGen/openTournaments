const canonicalizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort();
    return sortedKeys.reduce((acc, key) => {
      acc[key] = canonicalizeValue(value[key]);
      return acc;
    }, {});
  }
  return value;
};

const buildClickPesaChecksumPayload = (payload) => {
  const payloadClone = { ...payload };
  delete payloadClone.checksum;
  delete payloadClone.checksumMethod;

  const canonicalPayload = canonicalizeValue(payloadClone);
  return JSON.stringify(canonicalPayload);
};

module.exports = buildClickPesaChecksumPayload;
