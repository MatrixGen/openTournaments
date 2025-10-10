import { useState, Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const TournamentJoinModal = ({ 
  isOpen, 
  onClose, 
  tournament, 
  onJoin, 
  joinError, 
  joinSuccess,
  isJoining,
  setJoinError,
  setJoinSuccess 
}) => {
  const [gamerTag, setGamerTag] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow animations to complete
      const timer = setTimeout(() => {
        setGamerTag('');
        setHasInteracted(false);
        setTermsAccepted(false);
        setJoinError('');
        setJoinSuccess('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setJoinError, setJoinSuccess]);

  // Clear errors when user starts typing
  const handleGamerTagChange = (value) => {
    setGamerTag(value);
    setHasInteracted(true);
    if (joinError) {
      setJoinError('');
    }
    if (joinSuccess) {
      setJoinSuccess('');
    }
  };

  // Handle form submission
  const handleJoin = async (e) => {
    e?.preventDefault();
    
    if (!gamerTag.trim()) {
      setJoinError('Please enter your gamer tag');
      inputRef.current?.focus();
      return;
    }

    if (!termsAccepted) {
      setJoinError('Please accept the terms and conditions');
      return;
    }

    if (gamerTag.length < 2) {
      setJoinError('Gamer tag must be at least 2 characters long');
      inputRef.current?.focus();
      return;
    }

    if (gamerTag.length > 50) {
      setJoinError('Gamer tag must be less than 50 characters');
      inputRef.current?.focus();
      return;
    }

    setJoinError('');
    setJoinSuccess('');
    await onJoin(gamerTag.trim());
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleJoin();
    }
  };

  const handleClose = () => {
    if (isJoining) return; // Prevent closing while joining
    onClose();
  };

  // Input validation
  const isGamerTagValid = gamerTag.trim().length >= 2 && gamerTag.trim().length <= 50;
  const showGamerTagError = hasInteracted && !isGamerTagValid && gamerTag.length > 0;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neutral-800 p-4 sm:p-6 text-left align-middle shadow-xl transition-all border border-neutral-700"
                onKeyDown={handleKeyDown}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-white"
                  >
                    Join Tournament
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-300 hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
                    onClick={handleClose}
                    disabled={isJoining}
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>

                {/* Tournament Info */}
                <div className="bg-neutral-700/50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-white text-sm mb-2">
                    {tournament.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Entry Fee</span>
                    <span className="font-medium text-white">${tournament.entry_fee}</span>
                  </div>
                </div>

                <form onSubmit={handleJoin}>
                  {/* Gamer Tag Input */}
                  <div className="mb-4">
                    <label htmlFor="gamerTag" className="block text-sm font-medium text-white mb-2">
                      Your Gamer Tag *
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      id="gamerTag"
                      value={gamerTag}
                      onChange={(e) => handleGamerTagChange(e.target.value)}
                      disabled={isJoining}
                      className={`w-full rounded-lg border bg-neutral-700 py-2.5 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                        showGamerTagError || joinError
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-neutral-600 focus:border-primary-500 focus:ring-primary-500'
                      } ${isJoining ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="Enter your in-game username"
                      aria-invalid={showGamerTagError || !!joinError}
                      aria-describedby={showGamerTagError ? "gamerTag-error" : joinError ? "join-error" : undefined}
                    />
                    
                    {/* Character count */}
                    <div className={`text-xs mt-1 ${
                      showGamerTagError ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {gamerTag.length}/50 characters
                    </div>

                    {/* Gamer tag validation error */}
                    {showGamerTagError && (
                      <p id="gamerTag-error" className="text-red-400 text-xs mt-1 flex items-center">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Gamer tag must be 2-50 characters long
                      </p>
                    )}
                  </div>

                  {/* Terms and Conditions */}
                  <div className="mb-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        disabled={isJoining}
                        className="mt-0.5 rounded border-neutral-600 bg-neutral-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-neutral-800"
                      />
                      <span className="text-sm text-gray-300">
                        I agree to the{' '}
                        <button
                          type="button"
                          className="text-primary-400 hover:text-primary-300 underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                          onClick={(e) => {
                            e.preventDefault();
                            // Open terms modal or navigate to terms page
                            console.log('Open terms and conditions');
                          }}
                        >
                          terms and conditions
                        </button>
                        {' '}and understand that the ${tournament.entry_fee} entry fee is non-refundable.
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {joinError && (
                    <div 
                      id="join-error"
                      className="mb-4 rounded-lg bg-red-900/30 border border-red-800 py-2.5 px-3 text-sm text-red-200 flex items-start"
                      role="alert"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {/* Success Message */}
                  {joinSuccess && (
                    <div 
                      className="mb-4 rounded-lg bg-green-900/30 border border-green-800 py-2.5 px-3 text-sm text-green-200 flex items-start"
                      role="status"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{joinSuccess}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-neutral-600 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleClose}
                      disabled={isJoining}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isJoining || !isGamerTagValid || !termsAccepted}
                      className="inline-flex justify-center items-center rounded-lg border border-transparent bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-20"
                    >
                      {isJoining ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Joining...
                        </>
                      ) : (
                        'Join Tournament'
                      )}
                    </button>
                  </div>
                </form>

                {/* Help Text */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                  Press Ctrl+Enter to submit quickly
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TournamentJoinModal;