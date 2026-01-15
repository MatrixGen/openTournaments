const ClickPesaService = require("./clickPesaService");
const { WalletError } = require("../errors/WalletError");

const SupportedCurrencies = {
  TZS: "TZS",
  USD: "USD",
};

const buildConversion = ({
  amount,
  from,
  to,
  rate,
  pair,
  source,
  timestamp,
}) => ({
  amount,
  from,
  to,
  rate,
  pair,
  source,
  timestamp,
});

const usdToTzs = async (usdAmount) => {
  try {
    const numericAmount =
      typeof usdAmount === "string"
        ? parseFloat(usdAmount.replace(/[^\d.-]/g, ""))
        : usdAmount;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid USD amount: ${usdAmount}`);
    }

    const conversion = await ClickPesaService.convertUSDToTZS(numericAmount);
    return buildConversion({
      amount: conversion.convertedAmount,
      from: "USD",
      to: "TZS",
      rate: conversion.rate,
      pair: "USD/TZS",
      source: "clickpesa",
      timestamp: conversion.timestamp,
    });
  } catch (error) {
    console.error("[CURRENCY_CONVERSION] USD to TZS failed:", error.message);
    const fallbackRate = 2500;

    let numericAmount = usdAmount;
    if (typeof usdAmount === "string") {
      numericAmount = parseFloat(usdAmount.replace(/[^\d.-]/g, "")) || 0;
    }

    return buildConversion({
      amount: Math.round(numericAmount * fallbackRate),
      from: "USD",
      to: "TZS",
      rate: fallbackRate,
      pair: "USD/TZS",
      source: "fallback",
      timestamp: new Date().toISOString(),
    });
  }
};

const tzsToUsd = async (tzsAmount) => {
  try {
    const numericAmount =
      typeof tzsAmount === "string"
        ? parseFloat(tzsAmount.replace(/[^\d.-]/g, ""))
        : tzsAmount;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error(`Invalid TZS amount: ${tzsAmount}`);
    }

    const conversion = await ClickPesaService.convertTZSToUSD(numericAmount);
    return buildConversion({
      amount: conversion.convertedAmount,
      from: "TZS",
      to: "USD",
      rate: conversion.rate,
      pair: "TZS/USD",
      source: "clickpesa",
      timestamp: conversion.timestamp,
    });
  } catch (error) {
    console.error("[CURRENCY_CONVERSION] TZS to USD failed:", error.message);
    const fallbackRate = 0.0004;

    let numericAmount = tzsAmount;
    if (typeof tzsAmount === "string") {
      numericAmount = parseFloat(tzsAmount.replace(/[^\d.-]/g, "")) || 0;
    }

    return buildConversion({
      amount: parseFloat((numericAmount * fallbackRate).toFixed(6)),
      from: "TZS",
      to: "USD",
      rate: fallbackRate,
      pair: "TZS/USD",
      source: "fallback",
      timestamp: new Date().toISOString(),
    });
  }
};

const convertAmount = async (amount, fromCurrency, toCurrency) => {
  const from = String(fromCurrency).toUpperCase();
  const to = String(toCurrency).toUpperCase();

  if (from === to) {
    return buildConversion({
      amount,
      from,
      to,
      rate: 1,
      pair: `${from}/${to}`,
      source: "same_currency",
      timestamp: new Date().toISOString(),
    });
  }

  if (from === "USD" && to === "TZS") {
    return usdToTzs(amount);
  }

  if (from === "TZS" && to === "USD") {
    return tzsToUsd(amount);
  }

  throw new WalletError(
    "UNSUPPORTED_CONVERSION",
    `Unsupported conversion: ${from} to ${to}`
  );
};

const validateCurrencyCode = (currency) => {
  if (!currency || typeof currency !== "string") {
    return {
      valid: false,
      error: "Currency code is required and must be a string",
    };
  }

  const normalizedCurrency = currency.toUpperCase().trim();

  if (!Object.values(SupportedCurrencies).includes(normalizedCurrency)) {
    return {
      valid: false,
      error: `Unsupported currency: ${currency}. Supported: ${Object.values(SupportedCurrencies).join(", ")}`,
    };
  }

  return {
    valid: true,
    currency: normalizedCurrency,
  };
};

const validateAmount = (amount) => {
  const numericAmount =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[^\d.-]/g, ""))
      : amount;

  if (isNaN(numericAmount)) {
    return {
      valid: false,
      error: "Amount must be a valid number",
    };
  }

  if (numericAmount <= 0) {
    return {
      valid: false,
      error: "Amount must be greater than 0",
    };
  }

  return {
    valid: true,
    amount: numericAmount,
  };
};

module.exports = {
  usdToTzs,
  tzsToUsd,
  convertAmount,
  validateCurrencyCode,
  validateAmount,
};
