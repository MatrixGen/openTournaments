import * as z from "zod";

// Import currency configuration
import { 
  getCurrencyConfig, 
  getCurrentCurrency, 
  formatCurrency as configFormatCurrency,
  isMobileMoneySupported 
} from "../config/currencyConfig";

const CURRENT_CURRENCY = getCurrentCurrency();
const CURRENCY_SETTINGS = getCurrencyConfig();

// Dynamic deposit schema based on currency
export const createDepositSchema = () => {
  return z.object({
    amount: z
      .number()
      .min(
        CURRENCY_SETTINGS.minDeposit, 
        `Minimum deposit is ${configFormatCurrency(CURRENCY_SETTINGS.minDeposit)}`
      )
      .max(
        CURRENCY_SETTINGS.maxDeposit, 
        `Maximum deposit is ${configFormatCurrency(CURRENCY_SETTINGS.maxDeposit)}`
      )
      .refine((val) => val % CURRENCY_SETTINGS.step === 0, {
        message: `Amount must be in multiples of ${CURRENCY_SETTINGS.step}`,
      }),
    ...(isMobileMoneySupported() ? {
      phoneNumber: z
        .string()
        .min(9, "Phone number must be at least 9 digits")
        .max(12, "Phone number is too long")
        .regex(/^[0-9]+$/, "Phone number must contain only digits")
        .transform((val) => {
          // Add country code based on currency/region
          if (CURRENT_CURRENCY.code === 'TZS') {
            if (!val.startsWith("255")) {
              if (val.startsWith("0")) {
                return `255${val.slice(1)}`;
              }
              return `255${val}`;
            }
          } else if (CURRENT_CURRENCY.code === 'KES') {
            if (!val.startsWith("254")) {
              if (val.startsWith("0")) {
                return `254${val.slice(1)}`;
              }
              return `254${val}`;
            }
          }
          return val;
        }),
    } : {}),
  });
};