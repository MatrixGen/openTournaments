import { useState, useCallback, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  ExclamationTriangleIcon,
  PlayIcon,
  TrophyIcon,
  XCircleIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function ManagementActions({ tournament, onAction }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Touch device detection for mobile optimizations
  const isTouchDevice = useMemo(() => 
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
    []
  );

  const handleAction = useCallback(async (type) => {
    if (type === 'cancel' || type === 'start' || type === 'finalize') {
      setActionType(type);
      setIsDialogOpen(true);
    } else {
      setIsProcessing(true);
      try {
        await onAction(type);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onAction]);

  const confirmAction = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onAction(actionType);
      setIsDialogOpen(false);
      setActionType('');
    } finally {
      setIsProcessing(false);
    }
  }, [actionType, onAction]);

  const getActionConfig = useCallback((type) => {
    const configs = {
      cancel: {
        label: 'Cancel Tournament',
        description: 'This will permanently cancel the tournament and refund all participants. This action cannot be undone.',
        buttonText: 'Confirm action',
        icon: XCircleIcon,
        iconColor: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        buttonStyle: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus-visible:ring-red-500',
        confirmStyle: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
      },
      start: {
        label: 'Start Tournament',
        description: 'Begin the tournament and generate the bracket. Participants will be notified and matches will be created.',
        buttonText: 'Start Tournament',
        icon: PlayIcon,
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        buttonStyle: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 focus-visible:ring-green-500',
        confirmStyle: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700',
      },
      finalize: {
        label: 'Finalize Tournament',
        description: 'Mark tournament as completed and distribute prizes. Ensure all matches are finished before finalizing.',
        buttonText: 'Finalize Tournament',
        icon: TrophyIcon,
        iconColor: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20',
        buttonStyle: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 focus-visible:ring-purple-500',
        confirmStyle: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700',
      },
    };
    return configs[type] || {};
  }, []);

  const getActionButtons = useMemo(() => {
    const canCancel = tournament.current_slots <= 2;
    const canStart = tournament.status === 'locked' && tournament.current_slots >= 2;
    const canFinalize = tournament.status === 'ongoing';
    const isLive = tournament.status === 'live';

    const actions = [];

    if (canCancel && !isLive) {
      actions.push({
        type: 'cancel',
        label: 'Cancel Tournament',
        description: 'Cancel and refund all participants',
        icon: XCircleIcon,
        style: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300',
        iconStyle: 'text-red-600 dark:text-red-400',
        requiresConfirmation: true,
        disabled: isLive,
      });
    }

    if (canStart) {
      actions.push({
        type: 'start',
        label: 'Start Tournament',
        description: 'Begin tournament and generate bracket',
        icon: PlayIcon,
        style: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300',
        iconStyle: 'text-green-600 dark:text-green-400',
        requiresConfirmation: true,
      });
    }

    if (canFinalize) {
      actions.push({
        type: 'finalize',
        label: 'Finalize Tournament',
        description: 'Complete tournament and distribute prizes',
        icon: TrophyIcon,
        style: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300',
        iconStyle: 'text-purple-600 dark:text-purple-400',
        requiresConfirmation: true,
      });
    }

    if (!isLive && tournament.status !== 'completed') {
      actions.push({
        type: 'edit',
        label: 'Edit Tournament',
        description: 'Modify tournament settings',
        icon: PencilSquareIcon,
        style: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300',
        iconStyle: 'text-blue-600 dark:text-blue-400',
        isLink: true,
        to: `/tournaments/${tournament.id}/edit`,
      });
    }

    return actions;
  }, [tournament]);

  const currentActionConfig = getActionConfig(actionType);
  const ActionIcon = currentActionConfig.icon;

  if (getActionButtons.length === 0) {
    return null;
  }

  return (
    <>
      {/* Main Management Panel */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
            <Cog6ToothIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Tournament Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
              Administrative actions for this tournament
            </p>
          </div>
        </div>
        
        {/* Action Grid - Responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {getActionButtons.map((action) => {
            const IconComponent = action.icon;
            
            if (action.isLink) {
              return (
                <Link
                  key={action.type}
                  to={action.to}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200 group ${action.style} ${
                    isTouchDevice ? 'active:scale-98' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg bg-white dark:bg-neutral-700 group-hover:scale-105 transition-transform duration-200 ${action.iconStyle}`}>
                    <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {action.description}
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            }

            return (
              <button
                key={action.type}
                onClick={() => action.requiresConfirmation ? handleAction(action.type) : handleAction(action.type)}
                disabled={isProcessing || action.disabled}
                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${action.style} ${
                  isTouchDevice ? 'active:scale-98' : ''
                } ${!action.disabled ? 'hover:shadow-sm' : ''}`}
              >
                <div className={`p-2 rounded-lg bg-white dark:bg-neutral-700 group-hover:scale-105 transition-transform duration-200 ${action.iconStyle}`}>
                  <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {action.description}
                  </div>
                </div>
                {isProcessing && action.type === actionType && (
                  <ClockIcon className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Enhanced Confirmation Dialog */}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isProcessing && setIsDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-800 p-4 sm:p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-neutral-700">
                  {/* Dialog Header */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className={`p-2.5 sm:p-3 rounded-lg ${currentActionConfig.bgColor} ${currentActionConfig.iconColor}`}>
                      {ActionIcon && <ActionIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Dialog.Title as="h3" className="text-base sm:text-lg font-semibold leading-6 text-gray-900 dark:text-white line-clamp-1">
                        {currentActionConfig.label}
                      </Dialog.Title>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Please confirm this action
                      </p>
                    </div>
                  </div>
                  
                  {/* Dialog Content */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {currentActionConfig.description}
                    </p>
                    
                    {/* Warning Note for Destructive Actions */}
                    {actionType === 'cancel' && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs sm:text-sm">
                          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                          <span>This action cannot be undone</span>
                        </div>
                      </div>
                    )}
                  </div>
{/* Dialog Actions */}
<div className="mt-6 flex flex-row justify-end space-x-3">
  {/* Cancel Button */}
  <button
    type="button"
    disabled={isProcessing}
    className={`
      inline-flex justify-center items-center gap-2
      rounded-lg px-4 py-2.5 text-sm font-medium
      border 
      bg-gray-100 text-gray-800
      hover:bg-gray-200
      dark:bg-neutral-700 dark:text-gray-200 dark:border-neutral-600 
      dark:hover:bg-neutral-600
      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
      transition-all duration-200
      ${isTouchDevice ? 'active:scale-98' : ''}
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
    onClick={() => setIsDialogOpen(false)}
  >
    Cancel
  </button>

  {/* Confirm Button */}
  <button
    type="button"
    disabled={isProcessing}
    className={`
      inline-flex justify-center items-center gap-2
      rounded-lg px-4 py-2.5 text-sm font-semibold
      text-grey 
      bg-primary-600 hover:bg-primary-700
      dark:bg-primary-500 dark:hover:bg-primary-600
      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
      transition-all duration-200
      ${isTouchDevice ? 'active:scale-98' : ''}
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
    onClick={confirmAction}
  >
    {isProcessing ? (
      <>
        <ClockIcon className="h-4 w-4 animate-spin" />
        Processing...
      </>
    ) : (
      <>
        <CheckCircleIcon className="h-4 w-4" />
        {currentActionConfig.buttonText}
      </>
    )}
  </button>
</div>



                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}