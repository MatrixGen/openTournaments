import React, {
  useState,
  Fragment,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { formatMoney } from "../../utils/formatters";

const TournamentJoinModal = ({
  isOpen,
  onClose,
  tournament,
  onJoin,
  joinError,
  joinSuccess,
  isJoining,
  setJoinError,
  setJoinSuccess,
}) => {
  const [gamerTag, setGamerTag] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const inputRef = useRef(null);
  const tournamentCurrency = tournament?.currency || "TZS";

  // Memoized validation
  const isGamerTagValid = useMemo(() => {
    const trimmed = gamerTag.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  }, [gamerTag]);

  const showGamerTagError = useMemo(
    () => hasInteracted && !isGamerTagValid && gamerTag.length > 0,
    [hasInteracted, isGamerTagValid, gamerTag]
  );

  // Auto-focus with better mobile handling
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use requestAnimationFrame for better timing
      const timer = requestAnimationFrame(() => {
        // Check if device is mobile to avoid unwanted keyboard popup
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) {
          inputRef.current?.focus({ preventScroll: true });
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isOpen]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setGamerTag("");
        setHasInteracted(false);
        setTermsAccepted(false);
        setJoinError("");
        setJoinSuccess("");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, setJoinError, setJoinSuccess]);

  // Handle gamer tag change with debouncing
  const handleGamerTagChange = useCallback(
    (value) => {
      setGamerTag(value);
      setHasInteracted(true);
      if (joinError) setJoinError("");
      if (joinSuccess) setJoinSuccess("");
    },
    [joinError, joinSuccess, setJoinError, setJoinSuccess]
  );

  // Handle form submission
  const handleJoin = useCallback(
    async (e) => {
      e?.preventDefault();

      const trimmedGamerTag = gamerTag.trim();

      if (!trimmedGamerTag) {
        setJoinError("Please enter your gamer tag");
        inputRef.current?.focus();
        return;
      }

      if (!termsAccepted) {
        setJoinError("Please accept the terms and conditions");
        return;
      }

      if (trimmedGamerTag.length < 2) {
        setJoinError("Gamer tag must be at least 2 characters long");
        inputRef.current?.focus();
        return;
      }

      if (trimmedGamerTag.length > 50) {
        setJoinError("Gamer tag must be less than 50 characters");
        inputRef.current?.focus();
        return;
      }

      setJoinError("");
      setJoinSuccess("");
      await onJoin(trimmedGamerTag);
    },
    [gamerTag, termsAccepted, onJoin, setJoinError, setJoinSuccess]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && !isJoining) {
        onClose();
      }
      if (
        (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "Enter" && e.target.type !== "textarea")
      ) {
        if (!isJoining && isGamerTagValid && termsAccepted) {
          handleJoin();
        }
      }
    },
    [isJoining, isGamerTagValid, termsAccepted, handleJoin, onClose]
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (!isJoining) onClose();
  }, [isJoining, onClose]);

  // Touch device detection
  const isTouchDevice = useMemo(
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    []
  );

  // Theme-aware styles
  const themeStyles = {
    dialog:
      "w-full max-w-md transform overflow-hidden rounded-2xl p-4 sm:p-6 text-left align-middle shadow-xl transition-all border",
    backdrop: "fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm",
    input:
      "w-full rounded-lg border py-2.5 px-3 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors",
    buttonPrimary:
      "inline-flex justify-center items-center rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-w-20",
    buttonSecondary:
      "inline-flex justify-center rounded-lg border px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
  };

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
          <div className={themeStyles.backdrop} />
        </Transition.Child>

        {/* Mobile-optimized container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center touch-manipulation">
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
                className={`${themeStyles.dialog} 
                  bg-white dark:bg-neutral-800 
                  border-gray-200 dark:border-neutral-700
                  max-h-[90vh] overflow-y-auto`}
                onKeyDown={handleKeyDown}
              >
                {/* Header - Mobile optimized */}
                <div className="flex justify-between items-start mb-4 sticky top-0 bg-white dark:bg-neutral-800 pt-1">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-900 dark:text-white"
                  >
                    Join Tournament
                  </Dialog.Title>
                  <button
                    type="button"
                    className={`rounded-lg p-1.5 text-gray-500 dark:text-gray-400 
                      hover:text-gray-700 dark:hover:text-gray-300 
                      hover:bg-gray-100 dark:hover:bg-neutral-700 
                      transition-colors focus:outline-none focus:ring-2 
                      focus:ring-primary-500 ${isTouchDevice ? "active:scale-95" : ""}`}
                    onClick={handleClose}
                    disabled={isJoining}
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Tournament Info */}
                <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-900 dark:text-white text-sm mb-2 line-clamp-1">
                    {tournament.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Entry Fee</span>
                    <span className="font-medium text-gray-900 dark:text-gray-900 dark:text-white">
                      {formatMoney(tournament.entry_fee, tournamentCurrency)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleJoin}>
                  {/* Gamer Tag Input */}
                  <div className="mb-4">
                    <label
                      htmlFor="gamerTag"
                      className="block text-sm font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2"
                    >
                      Your Gamer Tag *
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      id="gamerTag"
                      value={gamerTag}
                      onChange={(e) => handleGamerTagChange(e.target.value)}
                      disabled={isJoining}
                      className={`${themeStyles.input} 
                        bg-gray-50 dark:bg-neutral-700 
                        text-gray-900 dark:text-gray-900 dark:text-white
                        ${
                          showGamerTagError || joinError
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500"
                        } ${isJoining ? "opacity-60 cursor-not-allowed" : ""}
                        ${isTouchDevice ? "text-lg" : ""}`}
                      placeholder="Enter your in-game username"
                      aria-invalid={showGamerTagError || !!joinError}
                      aria-describedby={
                        showGamerTagError
                          ? "gamerTag-error"
                          : joinError
                            ? "join-error"
                            : undefined
                      }
                      inputMode="text"
                      autoCapitalize="none"
                      autoComplete="username"
                    />

                    {/* Character count */}
                    <div
                      className={`text-xs mt-1 ${
                        showGamerTagError
                          ? "text-red-500 dark:text-red-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {gamerTag.length}/50 characters
                    </div>

                    {/* Gamer tag validation error */}
                    {showGamerTagError && (
                      <p
                        id="gamerTag-error"
                        className="text-red-600 dark:text-red-400 text-xs mt-1.5 flex items-center"
                      >
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        Gamer tag must be 2-50 characters long
                      </p>
                    )}
                  </div>

                  {/* Terms and Conditions - Mobile friendly */}
                  <div className="mb-4">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        disabled={isJoining}
                        className="mt-0.5 rounded border-gray-300 dark:border-neutral-600 
                          bg-white dark:bg-neutral-700 
                          text-primary-500 focus:ring-primary-500 
                          focus:ring-offset-0 dark:focus:ring-offset-neutral-800
                          w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        I agree to the{" "}
                        <button
                          type="button"
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 
                            underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                          onClick={(e) => {
                            e.preventDefault();
                            // Open terms modal or navigate to terms page
                            console.log("Open terms and conditions");
                          }}
                          aria-label="View terms and conditions"
                        >
                          terms and conditions
                        </button>{" "}
                        and understand that the{" "}
                        {formatMoney(tournament.entry_fee, tournamentCurrency)} entry
                        fee is non-refundable.
                      </span>
                    </label>
                  </div>

                  {/* Error Message */}
                  {joinError && (
                    <div
                      id="join-error"
                      className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 
                        border border-red-200 dark:border-red-800 
                        py-2.5 px-3 text-sm text-red-800 dark:text-red-200 
                        flex items-start"
                      role="alert"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {/* Success Message */}
                  {joinSuccess && (
                    <div
                      className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 
                        border border-green-200 dark:border-green-800 
                        py-2.5 px-3 text-sm text-green-800 dark:text-green-200 
                        flex items-start"
                      role="status"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{joinSuccess}</span>
                    </div>
                  )}

                  {/* Action Buttons - Mobile optimized */}
                  <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0 space-y-reverse">
                    <button
                      type="button"
                      className={`${themeStyles.buttonSecondary}
                        border-gray-300 dark:border-neutral-600
                        bg-transparent
                        text-gray-700 dark:text-gray-300 
                        hover:bg-gray-50 dark:hover:bg-neutral-700
                        focus:ring-primary-500 focus:ring-offset-0 dark:focus:ring-offset-neutral-800
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isTouchDevice ? "active:scale-98 py-3" : "py-2.5"}`}
                      onClick={handleClose}
                      disabled={isJoining}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isJoining || !isGamerTagValid || !termsAccepted}
                      className={`
    ${themeStyles.buttonPrimary}
    relative overflow-hidden
    bg-primary-500 dark:bg-primary-500 
    text-grey
    shadow-md dark:shadow-primary-900/30
    hover:shadow-lg hover:bg-primary-600 
    active:scale-[0.98]

    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 
    dark:focus:ring-offset-neutral-900

    transition-all duration-200 ease-out

    rounded-xl
    font-medium tracking-wide
    ${isTouchDevice ? "py-3" : "py-2.5"}

    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
  `}
                    >
                      {isJoining ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        "Join"
                      )}
                    </button>
                  </div>
                </form>

                {/* Help Text - Hidden on mobile touch devices */}
                {!isTouchDevice && (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Press Ctrl+Enter to submit quickly
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// Performance optimization with memoization
export default React.memo(TournamentJoinModal);
