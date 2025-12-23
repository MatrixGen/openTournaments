// Quick Amounts Component with carousel for mobile

import { useState } from "react";

import {
  
  ChevronLeftIcon,
  ChevronRightIcon,
  
} from "@heroicons/react/24/outline";

// Import currency configuration
import { 
   
   
  formatCurrency as configFormatCurrency,
  
   
} from "../../config/currencyConfig";



const QuickAmounts = ({ amounts, selectedAmount, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, amounts.length - 3));
  };

  return (
    <div className="relative">
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onSelect(amount)}
            className={`py-2 md:py-3 px-3 md:px-4 text-sm md:text-base font-medium rounded-lg transition-all ${
              selectedAmount === amount
                ? "bg-primary-500 text-white shadow-lg"
                : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white"
            }`}
          >
            {configFormatCurrency(amount)}
          </button>
        ))}
      </div>
      
      {/* Mobile carousel */}
      <div className="md:hidden">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 text-gray-500 disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <div className="flex-1 overflow-hidden">
            <div 
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
            >
              {amounts.map((amount) => (
                <div key={amount} className="w-1/3 flex-shrink-0 px-1">
                  <button
                    type="button"
                    onClick={() => onSelect(amount)}
                    className={`w-full py-2 text-sm font-medium rounded-lg transition-all ${
                      selectedAmount === amount
                        ? "bg-primary-500 text-white shadow-lg"
                        : "bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    {configFormatCurrency(amount)}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentIndex >= amounts.length - 3}
            className="p-2 text-gray-500 disabled:opacity-30"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAmounts