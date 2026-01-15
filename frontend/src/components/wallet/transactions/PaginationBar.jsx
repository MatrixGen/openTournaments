import React from "react";

const PaginationBar = ({ pagination, loading, onPageChange }) => {
  if (!pagination) return null;

  return (
    <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-neutral-700">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="px-3 py-1.5 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
          >
            Prev
          </button>

          <div className="hidden sm:flex items-center space-x-1 mx-2">
            {Array.from({ length: Math.min(3, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 3) {
                pageNum = i + 1;
              } else if (pagination.page <= 2) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.pages - 1) {
                pageNum = pagination.pages - 2 + i;
              } else {
                pageNum = pagination.page - 1 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg ${
                    pagination.page === pageNum
                      ? "bg-primary-600 text-white"
                      : "bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
            className="px-3 py-1.5 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationBar;
