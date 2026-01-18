/**
 * Status Banners (Error, Success, Email Verification)
 */
import React from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import Banner from '../common/Banner';

export default function StatusBanners({ 
  error, 
  success, 
  needsEmailVerification, 
  onClearError, 
  onResendVerification 
}) {
  return (
    <>
      {error && (
        <Banner
          type="error"
          title="Authentication Failed"
          message={error}
          onClose={onClearError}
          className="mb-6"
        />
      )}
      {success && (
        <Banner
          type="success"
          title="Success!"
          message={success}
          className="mb-6"
        />
      )}
      {needsEmailVerification && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <EnvelopeIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please verify your email address to continue.
              </p>
              <button
                type="button"
                onClick={onResendVerification}
                className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
              >
                Resend verification email
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
