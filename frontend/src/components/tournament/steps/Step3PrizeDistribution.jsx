import { useState, useEffect } from 'react';
import { formatMoney } from "../../../utils/formatters";
import {
  getCurrencyInputStep,
  isWholeNumberCurrency,
} from '../../../utils/tournamentCurrency';

export default function Step3PrizeDistribution({ 
  errors, 
  watch, 
  addPrizePosition, 
  removePrizePosition, 
  updatePrizePercentage,
  
  setValue,
  clearErrors,
  userBalance = 0,
  currencyCode,
}) {
  const formCurrency = currencyCode;
  const prizePoolStep = getCurrencyInputStep(currencyCode);
  const isWholeNumber = isWholeNumberCurrency(currencyCode);
  const allValues = watch();
  const prizeDistribution = watch('prize_distribution') || [];
  
  const entryFee = parseFloat(allValues.entry_fee || 0);
  const totalSlots = parseInt(allValues.total_slots || 0);
  const defaultPrizePool = entryFee * totalSlots;
  
  const [customPrizePool, setCustomPrizePool] = useState(defaultPrizePool);
  const [isCustomPrizePoolEnabled, setIsCustomPrizePoolEnabled] = useState(false);
  const [additionalContribution, setAdditionalContribution] = useState(0);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Calculate effective prize pool
  const effectivePrizePool = isCustomPrizePoolEnabled ? customPrizePool : defaultPrizePool;
  
  // Calculate total percentage
  const totalPercentage = prizeDistribution.reduce((sum, prize) => sum + (prize.percentage || 0), 0);
  
  // Calculate prize amounts based on effective prize pool
  const calculatePrizeAmount = (percentage) => {
    return ((percentage || 0) / 100) * effectivePrizePool;
  };

  // Handle custom prize pool changes
  const handleCustomPrizePoolChange = (value) => {
    let numericValue = parseFloat(value) || 0;
    if (isWholeNumber) {
      numericValue = Math.round(numericValue);
    }
    setCustomPrizePool(numericValue);
    setValue('prize_pool', numericValue, { shouldValidate: true });
    
    if (numericValue >= defaultPrizePool) {
      const additional = numericValue - defaultPrizePool;
      setAdditionalContribution(additional);
      
      // Check if user has enough balance (entry fee + additional contribution)
      if (userBalance && userBalance < (entryFee + additional)) {
        setInsufficientBalance(true);
      } else {
        setInsufficientBalance(false);
      }
      
      // Clear any validation errors
      clearErrors?.('prize_pool');
    }
  };

  // Handle toggle custom prize pool
  const handleToggleCustomPrizePool = (enabled) => {
    setIsCustomPrizePoolEnabled(enabled);
    
    if (!enabled) {
      // Reset to default
      setCustomPrizePool(defaultPrizePool);
      setValue('prize_pool', defaultPrizePool, { shouldValidate: true });
      setAdditionalContribution(0);
      setInsufficientBalance(false);
    } else {
      setValue('prize_pool', customPrizePool, { shouldValidate: true });
    }
  };

  // Initialize with default values
  useEffect(() => {
    if (allValues.prize_pool !== undefined && allValues.prize_pool !== null && allValues.prize_pool !== '') {
      const customValue = parseFloat(allValues.prize_pool);
      if (!isNaN(customValue) && customValue !== defaultPrizePool) {
        setCustomPrizePool(customValue);
        setIsCustomPrizePoolEnabled(true);
        handleCustomPrizePoolChange(customValue);
      }
    }
  }, [allValues.prize_pool, defaultPrizePool]);

  // Update when entry fee or total slots change
  useEffect(() => {
    if (!isCustomPrizePoolEnabled) {
      setCustomPrizePool(defaultPrizePool);
      setValue('prize_pool', defaultPrizePool, { shouldValidate: true });
    }
  }, [defaultPrizePool, isCustomPrizePoolEnabled, setValue]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Prize Distribution</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Configure how the prize pool is distributed
        </p>
      </div>

      {/* Prize Pool Configuration */}
      <div className="space-y-4">
        {/* Default Prize Pool Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Default Prize Pool</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatically calculated from entry fee and slots
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatMoney(defaultPrizePool, formCurrency)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatMoney(entryFee, formCurrency)} × {totalSlots} players
              </p>
            </div>
          </div>
        </div>

        {/* Custom Prize Pool Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Boost Prize Pool</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add extra funds to make your tournament more attractive
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleCustomPrizePool(!isCustomPrizePoolEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isCustomPrizePoolEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-600'
            }`}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full transition-transform
                bg-sky-400 
                shadow-lg shadow-black/40 
                ring-1 ring-sky-600/30
                ${isCustomPrizePoolEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Custom Prize Pool Input (Conditional) */}
        {isCustomPrizePoolEnabled && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Custom Prize Pool Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {currencyCode}
                    </span>
                    <input
                      type="number"
                      min={defaultPrizePool}
                      step={prizePoolStep}
                      value={customPrizePool}
                      onChange={(e) => handleCustomPrizePoolChange(e.target.value)}
                      className="w-full pl-16 pr-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`Minimum: ${formatMoney(defaultPrizePool, formCurrency)}`}
                    />
                  </div>
                  
                  {errors?.prize_pool && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {errors.prize_pool.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Amounts are in {currencyCode}.
                  </p>
                </div>

                {/* Contribution Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Default prize pool:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMoney(defaultPrizePool, formCurrency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Your additional contribution:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      +{formatMoney(additionalContribution, formCurrency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm font-semibold pt-3 border-t border-gray-200 dark:border-neutral-700">
                    <span className="text-gray-900 dark:text-white">Total prize pool:</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatMoney(effectivePrizePool, formCurrency)}
                    </span>
                  </div>
                </div>

                {/* Balance Warning */}
                {userBalance > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-neutral-700">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Your current balance:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatMoney(userBalance, formCurrency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total you'll pay:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatMoney(entryFee + additionalContribution, formCurrency)}
                      </span>
                    </div>
                    
                    {additionalContribution > 0 && (
                      <div className="text-sm mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-300">Additional funds required</p>
                            <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                              You'll need to pay an additional {formatMoney(
                                additionalContribution,
                                formCurrency
                              )} from your balance to boost the prize pool.
                              This will be deducted along with your entry fee.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {insufficientBalance && (
                      <div className="text-sm mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium text-red-800 dark:text-red-300">Insufficient balance</p>
                            <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                              You need {formatMoney(
                                entryFee + additionalContribution,
                                formCurrency
                              )} (entry fee + prize boost) but only have {formatMoney(
                                userBalance,
                                formCurrency
                              )}.
                              Reduce the prize pool or add funds to your wallet.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prize Distribution Items */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prize Distribution</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {prizeDistribution.map((prize, index) => {
            const prizeAmount = calculatePrizeAmount(prize.percentage);
            
            return (
              <div key={index} className="p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg border border-gray-200 dark:border-neutral-600">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                        {prize.position}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Position #{prize.position}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Percentage Slider */}
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Percentage: {prize.percentage || 0}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={prize.percentage || 0}
                          onChange={(e) => updatePrizePercentage(index, e.target.value)}
                          className="w-full h-2 bg-gray-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>

                      {/* Percentage Input */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={prize.percentage || 0}
                          onChange={(e) => updatePrizePercentage(index, e.target.value)}
                          className="w-24 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 py-2 px-3 text-gray-900 dark:text-white text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">%</span>
                        <div className="ml-auto text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatMoney(prizeAmount, formCurrency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Prize amount</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remove Button - Only show for positions beyond first */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removePrizePosition(index)}
                      className="mt-4 md:mt-0 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Error Display for prize distribution */}
          {errors.prize_distribution && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.prize_distribution.message}
              </p>
            </div>
          )}

          {/* Add Button and Total */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={addPrizePosition}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 text-sm font-medium transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Prize Position
            </button>
            
            <div className="text-center md:text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Percentage</div>
              <div className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalPercentage.toFixed(1)}%
              </div>
              {totalPercentage !== 100 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Total must equal 100%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
