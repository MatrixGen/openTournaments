// src/pages/settings/Settings.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CurrencyDollarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  WalletIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Banner from "../../components/common/Banner";
import { userService } from "../../services/userService";
import {
  getCurrentCurrency,
  getAllCurrencies,
  switchCurrency,
  getCurrencyByCode,
  getCurrencyConfig,
  getDepositSettings,
  getWithdrawalSettings,
  getMobileMoneyProviders,
  getSupportedBanks,
  formatCurrency,
  isMobileMoneySupported,
 
  getProcessingTime,
  getWithdrawalFee,
  getMinDeposit,
  getMaxDeposit,
  getMinMobileMoneyWithdrawal,
  getMaxMobileMoneyWithdrawal,
  getMinBankWithdrawal,
  getMaxBankWithdrawal,
  calculateDepositFee,
  
} from "../../config/currencyConfig";

// Currency Card Component
const CurrencyCard = ({ currency, isSelected, onSelect, isSwitching }) => {
  const config = getCurrencyConfig(currency.code);
  
  return (
    <button
      onClick={() => onSelect(currency.code)}
      disabled={isSwitching}
      className={`relative w-full p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all duration-300 text-left group ${
        isSelected
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg"
          : "border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 hover:shadow-md"
      } ${isSwitching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl md:rounded-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 bg-opacity-10">
              <CurrencyDollarIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                {currency.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currency.code} • {currency.countryCode}
              </p>
            </div>
          </div>
          
          {isSelected && (
            <div className="flex items-center space-x-1 bg-green-500/20 text-green-600 dark:text-green-400 px-2 md:px-3 py-1 rounded-full">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-xs md:text-sm font-medium">Active</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-900 dark:text-white">
              {currency.symbol}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Phone Prefix:</span>
            <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
              {currency.phonePrefix}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Mobile Money:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              config.mobileMoneySupported
                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                : "bg-gray-500/20 text-gray-600 dark:text-gray-400"
            }`}>
              {config.mobileMoneySupported ? "Supported" : "Not Supported"}
            </span>
          </div>
        </div>
        
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
          </div>
        )}
      </div>
    </button>
  );
};

// Currency Details Panel
const CurrencyDetailsPanel = ({ currency }) => {
  const config = getCurrencyConfig(currency.code);
  const depositSettings = getDepositSettings(currency.code);
  const withdrawalSettings = getWithdrawalSettings(currency.code);
  
  const formatFee = (amount) => {
    if (amount === 0) return "No fee";
    return formatCurrency(amount, currency.code);
  };
  
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <CurrencyDollarIcon className="h-5 w-5 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              {currency.name} Details
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuration and limits for {currency.code}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Deposit Information */}
        <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4 md:p-5">
          <div className="flex items-center space-x-2 mb-4">
            <WalletIcon className="h-5 w-5 text-green-500" />
            <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Deposit Settings
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Minimum</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                {formatCurrency(depositSettings.minDeposit, currency.code)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Maximum</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                {formatCurrency(depositSettings.maxDeposit, currency.code)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Step Amount</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                {formatCurrency(depositSettings.step, currency.code)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Deposit Fee</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                {depositSettings.depositFeeType === 'percentage' 
                  ? `${depositSettings.depositFee}%` 
                  : formatFee(depositSettings.depositFee)}
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Example: A deposit of {formatCurrency(100, currency.code)} would have a fee of {formatCurrency(calculateDepositFee(100, currency.code), currency.code)}
            </p>
          </div>
        </div>
        
        {/* Withdrawal Information */}
        <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4 md:p-5">
          <div className="flex items-center space-x-2 mb-4">
            <ArrowPathIcon className="h-5 w-5 text-blue-500" />
            <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Withdrawal Settings
            </h4>
          </div>
          
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mobile Money
            </h5>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatCurrency(withdrawalSettings.minMobileMoneyWithdrawal, currency.code)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatCurrency(withdrawalSettings.maxMobileMoneyWithdrawal, currency.code)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Fee</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {formatCurrency(withdrawalSettings.withdrawalFees.mobileMoney, currency.code)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Processing Time</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {withdrawalSettings.withdrawalProcessingTimes.mobileMoney}
              </span>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bank Transfer
            </h5>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatCurrency(withdrawalSettings.minBankWithdrawal, currency.code)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                  {formatCurrency(withdrawalSettings.maxBankWithdrawal, currency.code)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Fee</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {formatCurrency(withdrawalSettings.withdrawalFees.bankTransfer, currency.code)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Processing Time</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                {withdrawalSettings.withdrawalProcessingTimes.bankTransfer}
              </span>
            </div>
          </div>
        </div>
        
        {/* Payment Methods */}
        <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4 md:p-5">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCardIcon className="h-5 w-5 text-purple-500" />
            <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Available Payment Methods
            </h4>
          </div>
          
          <div className="space-y-3">
            {config.mobileMoneySupported && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Mobile Money</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getMobileMoneyProviders(currency.code).length} provider(s) available
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                  Available
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <BuildingLibraryIcon className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Bank Transfer</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getSupportedBanks(currency.code).length} bank(s) supported
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                Available
              </span>
            </div>
            
            {config.paymentMethods?.includes('credit_card') && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCardIcon className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white">Credit Card</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Visa, Mastercard, American Express
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                  Available
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 md:p-5">
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-500" />
            <h4 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Additional Information
            </h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Phone Number Length:</span>
              <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                {currency.phoneLength} digits
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Requires BIC/SWIFT:</span>
              <span className={`font-medium ${
                withdrawalSettings.requireBIC 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-green-600 dark:text-green-400"
              }`}>
                {withdrawalSettings.requireBIC ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Requires IBAN:</span>
              <span className={`font-medium ${
                withdrawalSettings.requireIBAN 
                  ? "text-red-600 dark:text-red-400" 
                  : "text-green-600 dark:text-green-400"
              }`}>
                {withdrawalSettings.requireIBAN ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Daily Deposit Limit:</span>
              <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                {formatCurrency(depositSettings.dailyLimit, currency.code)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Daily Withdrawal Limit:</span>
              <span className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">
                {formatCurrency(withdrawalSettings.dailyLimit, currency.code)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Settings() {
  const navigate = useNavigate();
  const [currentCurrency, setCurrentCurrency] = useState(getCurrentCurrency());
  const [selectedCurrency, setSelectedCurrency] = useState(getCurrentCurrency());
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  
  const allCurrencies = getAllCurrencies();
  
  // Load current currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      const currency = getCurrencyByCode(savedCurrency);
      if (currency) {
        setCurrentCurrency(currency);
        setSelectedCurrency(currency);
      }
    }
  }, []);
  
  const handleSelectCurrency = (currencyCode) => {
    const currency = getCurrencyByCode(currencyCode);
    if (currency) {
      setSelectedCurrency(currency);
      setShowDetails(true);
      setError("");
    }
  };
  
  const handleSwitchCurrency = async () => {
    if (selectedCurrency.code === currentCurrency.code) {
      setError("This currency is already selected");
      return;
    }
    
    setIsSwitching(true);
    setError("");
    
    try {
      const updateResult = await userService.updateWalletCurrency(selectedCurrency.code);
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update wallet currency");
      }

      const resolvedCurrency = updateResult.data?.wallet_currency || selectedCurrency.code;

      // Switch the currency in the config
      const switched = switchCurrency(resolvedCurrency);
      
      if (!switched) {
        throw new Error("Failed to switch currency");
      }
      
      // Save to localStorage
      localStorage.setItem('selectedCurrency', resolvedCurrency);
      
      // Update state
      setCurrentCurrency(getCurrencyByCode(resolvedCurrency) || selectedCurrency);
      
      // Show success message
      setSuccess(`Currency successfully switched to ${selectedCurrency.name} (${resolvedCurrency})`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess("");
      }, 5000);
      
      // Reload the page to update all components
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      setError(err.message || "Failed to switch currency");
    } finally {
      setIsSwitching(false);
    }
  };
  
  const handleBackToWallet = () => {
    navigate("/wallet/deposit");
  };
  
  const handleResetToDefault = () => {
    const defaultCurrency = getCurrencyByCode('USD');
    if (defaultCurrency) {
      setSelectedCurrency(defaultCurrency);
      setShowDetails(true);
      setError("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-gray-100 dark:from-neutral-900 dark:to-neutral-800 safe-padding">
      <main className="mx-auto max-w-6xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToWallet}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Back to Wallet</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <Cog6ToothIcon className="h-6 w-6 text-primary-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Settings</span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
              Currency Settings
            </h1>
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="px-3 py-1 bg-primary-500/20 rounded-full">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {currentCurrency.code} - {currentCurrency.name}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Current
              </span>
            </div>
            <p className="text-sm md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Select your preferred currency for deposits, withdrawals, and transactions.
              Changing currency will affect all monetary values in your wallet.
            </p>
          </div>
        </div>
        
        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Error"
            message={error}
            onClose={() => setError("")}
            className="mb-6"
          />
        )}
        
        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success"
            message={success}
            className="mb-6"
          />
        )}
        
        {/* Warning Banner */}
        {selectedCurrency.code !== currentCurrency.code && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-1">
                  Important Notice
                </h4>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Switching to {selectedCurrency.name} ({selectedCurrency.code}) will change how all monetary values are displayed and processed. 
                  Existing transactions will remain in their original currency. Please review the details before confirming.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          {/* Left Column: Currency Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                    Available Currencies
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select a currency to view details and switch
                  </p>
                </div>
                <button
                  onClick={handleResetToDefault}
                  className="text-sm text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
                >
                  Reset to Default
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {allCurrencies.map((currency) => (
                  <CurrencyCard
                    key={currency.code}
                    currency={currency}
                    isSelected={selectedCurrency.code === currency.code}
                    onSelect={handleSelectCurrency}
                    isSwitching={isSwitching}
                  />
                ))}
              </div>
              
              {/* Action Buttons */}
              {selectedCurrency.code !== currentCurrency.code && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSwitchCurrency}
                      disabled={isSwitching}
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-gray-900 dark:text-white rounded-lg text-base font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSwitching ? (
                        <>
                          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                          Switching Currency...
                        </>
                      ) : (
                        <>
                          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                          Switch to {selectedCurrency.code}
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedCurrency(currentCurrency);
                        setShowDetails(false);
                      }}
                      disabled={isSwitching}
                      className="px-6 py-3 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg text-base font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Currency Details (Mobile) */}
            {showDetails && (
              <div className="lg:hidden mt-6">
                <CurrencyDetailsPanel currency={selectedCurrency} />
              </div>
            )}
          </div>
          
          {/* Right Column: Currency Details (Desktop) */}
          <div className="hidden lg:block">
            {showDetails ? (
              <CurrencyDetailsPanel currency={selectedCurrency} />
            ) : (
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-gray-200 dark:border-neutral-700 h-full flex flex-col justify-center items-center text-center">
                <div className="p-3 bg-primary-500/20 rounded-full mb-4">
                  <InformationCircleIcon className="h-8 w-8 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                  Select a Currency
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click on any currency card to view detailed information, limits, and fees.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Current Currency Information */}
        <div className="mt-6 md:mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
                Current Currency: {currentCurrency.name} ({currentCurrency.code})
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This is your currently active currency
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Deposit Limits
              </h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-1">
                {formatCurrency(getMinDeposit(currentCurrency.code), currentCurrency.code)} - {formatCurrency(getMaxDeposit(currentCurrency.code), currentCurrency.code)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Minimum to maximum deposit range
              </p>
            </div>
            
            {isMobileMoneySupported(currentCurrency.code) && (
              <div className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                  Mobile Money Withdrawal
                </h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-1">
                  {formatCurrency(getMinMobileMoneyWithdrawal(currentCurrency.code), currentCurrency.code)} - {formatCurrency(getMaxMobileMoneyWithdrawal(currentCurrency.code), currentCurrency.code)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fee: {formatCurrency(getWithdrawalFee('mobileMoney', currentCurrency.code), currentCurrency.code)}
                </p>
              </div>
            )}
            
            <div className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Bank Transfer Withdrawal
              </h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-1">
                {formatCurrency(getMinBankWithdrawal(currentCurrency.code), currentCurrency.code)} - {formatCurrency(getMaxBankWithdrawal(currentCurrency.code), currentCurrency.code)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Processing: {getProcessingTime('bankTransfer', currentCurrency.code)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Help Information */}
        <div className="mt-6 md:mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3 mb-4">
            <InformationCircleIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
              Need Help?
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Currency Switching
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Switching currency will update all displayed amounts and transaction limits.
                Existing transactions remain in their original currency.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Payment Methods
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Some currencies support different payment methods. Review available options before switching.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
                Support
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Questions about currency settings? Contact our support team at support@example.com
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
