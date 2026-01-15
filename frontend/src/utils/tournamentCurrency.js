import { getCurrencyConfig, getCurrentCurrencyCode } from '../config/currencyConfig';

export const MIN_ENTRY_FEE = {
  TZS: 0,
  USD: 0,
};

export const FALLBACK_MIN_ENTRY_FEE = 1;
// For unsupported currencies, fall back to a generic minimum while surfacing the currency code in UI.

export const resolveTournamentCurrency = (currencyCode) =>
  currencyCode || getCurrentCurrencyCode();

export const getMinEntryFee = (currencyCode) =>
  MIN_ENTRY_FEE[currencyCode] ?? FALLBACK_MIN_ENTRY_FEE;

export const getCurrencyDecimals = (currencyCode) => {
  const config = getCurrencyConfig(currencyCode);
  if (typeof config?.decimals === 'number') {
    return config.decimals;
  }
  return 2;
};

export const isWholeNumberCurrency = (currencyCode) =>
  getCurrencyDecimals(currencyCode) === 0;

export const getCurrencyInputStep = (currencyCode) => {
  const decimals = getCurrencyDecimals(currencyCode);
  if (decimals <= 0) {
    return 1;
  }
  return Number((1 / 10 ** decimals).toFixed(decimals));
};
