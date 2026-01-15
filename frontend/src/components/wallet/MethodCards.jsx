import React from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

const MethodCards = ({ methods, selectedMethod, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {methods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;
        const isDisabled = method.disabled;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => {
              if (!isDisabled) {
                onSelect(method.id);
              }
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              isDisabled
                ? "border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900/30 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : isSelected
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            }`}
            disabled={isDisabled}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {method.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {method.description}
                  </p>
                </div>
              </div>
              {isDisabled ? (
                <span className="inline-flex items-center text-xs text-gray-400 dark:text-gray-500">
                  <LockClosedIcon className="h-3 w-3 mr-1" />
                  Unavailable
                </span>
              ) : isSelected ? (
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  Selected
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MethodCards;
