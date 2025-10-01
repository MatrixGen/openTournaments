import { useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function ManagementActions({ tournament, onAction }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (type) => {
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
  };

  const confirmAction = async () => {
    setIsProcessing(true);
    try {
      await onAction(actionType);
      setIsDialogOpen(false);
      setActionType('');
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionConfig = (type) => {
    const configs = {
      cancel: {
        label: 'Cancel Tournament',
        description: 'This will permanently cancel the tournament and refund all participants. This action cannot be undone.',
        buttonText: 'Yes, Cancel Tournament',
        icon: XCircleIcon,
        iconColor: 'text-red-500',
        buttonStyle: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
        confirmStyle: 'bg-red-600 hover:bg-red-700',
      },
      start: {
        label: 'Start Tournament',
        description: 'Begin the tournament and generate the bracket. Participants will be notified and matches will be created.',
        buttonText: 'Start Tournament',
        icon: PlayIcon,
        iconColor: 'text-green-500',
        buttonStyle: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500',
        confirmStyle: 'bg-green-600 hover:bg-green-700',
      },
      finalize: {
        label: 'Finalize Tournament',
        description: 'Mark tournament as completed and distribute prizes. Ensure all matches are finished before finalizing.',
        buttonText: 'Finalize Tournament',
        icon: TrophyIcon,
        iconColor: 'text-purple-500',
        buttonStyle: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500',
        confirmStyle: 'bg-purple-600 hover:bg-purple-700',
      },
    };
    return configs[type] || {};
  };

  const getActionButtons = () => {
    const actions = [];

    if (canCancel) {
      actions.push({
        type: 'cancel',
        label: 'Cancel Tournament',
        description: 'Cancel and refund all participants',
        icon: XCircleIcon,
        style: 'bg-red-600/10 hover:bg-red-600/20 border-red-500/30 text-red-400 hover:text-red-300',
        iconStyle: 'text-red-500',
        requiresConfirmation: true,
      });
    }

    if (canStart) {
      actions.push({
        type: 'start',
        label: 'Start Tournament',
        description: 'Begin tournament and generate bracket',
        icon: PlayIcon,
        style: 'bg-green-600/10 hover:bg-green-600/20 border-green-500/30 text-green-400 hover:text-green-300',
        iconStyle: 'text-green-500',
        requiresConfirmation: true,
      });
    }

    if (canFinalize) {
      actions.push({
        type: 'finalize',
        label: 'Finalize Tournament',
        description: 'Complete tournament and distribute prizes',
        icon: TrophyIcon,
        style: 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/30 text-purple-400 hover:text-purple-300',
        iconStyle: 'text-purple-500',
        requiresConfirmation: true,
      });
    }

    if (canCancel) {
      actions.push({
        type: 'edit',
        label: 'Edit Tournament',
        description: 'Modify tournament settings',
        icon: PencilSquareIcon,
        style: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 text-blue-400 hover:text-blue-300',
        iconStyle: 'text-blue-500',
        isLink: true,
        to: `/tournaments/${tournament.id}/edit`,
      });
    }

    return actions;
  };

  const canCancel = tournament.current_slots <= 2;
  const canStart = tournament.status === 'locked' && tournament.current_slots >= 2;
  const canFinalize = tournament.status === 'ongoing';

  const actionButtons = getActionButtons();
  const currentActionConfig = getActionConfig(actionType);
  const ActionIcon = currentActionConfig.icon;

  if (actionButtons.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl shadow-lg border border-neutral-700/50 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary-500/20 p-2 rounded-lg">
            <Cog6ToothIcon className="h-6 w-6 text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Tournament Management</h2>
            <p className="text-gray-400 text-sm mt-1">Administrative actions for this tournament</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionButtons.map((action) => {
            const IconComponent = action.icon;
            
            if (action.isLink) {
              return (
                <Link
                  key={action.type}
                  to={action.to}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-lg group ${action.style}`}
                >
                  <div className={`p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform duration-200 ${action.iconStyle}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm group-hover:text-white transition-colors">
                      {action.label}
                    </div>
                    <div className="text-xs opacity-80 mt-0.5">
                      {action.description}
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <button
                key={action.type}
                onClick={() => action.requiresConfirmation ? handleAction(action.type) : handleAction(action.type)}
                disabled={isProcessing}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${action.style}`}
              >
                <div className={`p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform duration-200 ${action.iconStyle}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-sm group-hover:text-white transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {action.description}
                  </div>
                </div>
                {isProcessing && action.type === actionType && (
                  <ClockIcon className="h-4 w-4 animate-spin opacity-70" />
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
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 p-6 text-left align-middle shadow-xl transition-all border border-neutral-700/50">
                  {/* Dialog Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl bg-white/5 ${currentActionConfig.iconColor}`}>
                      {ActionIcon && <ActionIcon className="h-6 w-6" />}
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-white">
                        {currentActionConfig.label}
                      </Dialog.Title>
                      <p className="text-sm text-gray-400 mt-1">
                        Please confirm this action
                      </p>
                    </div>
                  </div>
                  
                  {/* Dialog Content */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {currentActionConfig.description}
                    </p>
                    
                    {/* Warning Note for Destructive Actions */}
                    {actionType === 'cancel' && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                          <span>This action cannot be undone</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dialog Actions */}
                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      type="button"
                      disabled={isProcessing}
                      className="inline-flex justify-center items-center gap-2 rounded-xl border border-neutral-600 bg-transparent px-4 py-3 text-sm font-medium text-gray-300 hover:bg-neutral-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      className={`inline-flex justify-center items-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${currentActionConfig.confirmStyle}`}
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