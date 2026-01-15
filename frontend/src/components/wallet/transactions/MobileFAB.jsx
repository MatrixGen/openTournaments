import React from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

const MobileFAB = ({
  showActions,
  onToggle,
  selectedCount,
  onClear,
  onBatchReconcile,
  batchReconciling,
}) => {
  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden">
      <div className="flex flex-col items-end space-y-2">
        {showActions && (
          <>
            <button
              onClick={onClear}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg shadow-lg"
            >
              Clear
            </button>
            <button
              onClick={onBatchReconcile}
              disabled={batchReconciling}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg disabled:opacity-50"
            >
              Reconcile {selectedCount}
            </button>
          </>
        )}

        <button
          onClick={onToggle}
          className="p-4 bg-primary-600 text-white rounded-full shadow-lg"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default MobileFAB;
