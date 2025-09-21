import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ManagementActions({ tournament, onAction }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (type) => {
    if (type === 'cancel') {
      setActionType('cancel');
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
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionConfig = (type) => {
    const configs = {
      cancel: {
        label: 'Cancel Tournament',
        description: 'Are you sure you want to cancel this tournament? This action cannot be undone and will refund all participants.',
        buttonText: 'Cancel Tournament',
        buttonStyle: 'bg-red-600 hover:bg-red-700',
      },
      start: {
        label: 'Start Tournament',
        description: 'Begin the tournament and generate the bracket.',
        buttonText: 'Start Tournament',
        buttonStyle: 'bg-green-600 hover:bg-green-700',
      },
      finalize: {
        label: 'Finalize Tournament',
        description: 'Mark the tournament as completed and distribute prizes.',
        buttonText: 'Finalize Tournament',
        buttonStyle: 'bg-purple-600 hover:bg-purple-700',
      },
    };
    return configs[type] || {};
  };

  const canCancel = tournament.current_slots <= 2;
  const canStart = tournament.status === 'open' && tournament.current_slots >= 2;
  const canFinalize = tournament.status === 'ongoing';

  if (!canCancel && !canStart && !canFinalize) {
    return null;
  }

  return (
    <>
      <div className="bg-neutral-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Tournament Management</h2>
        
        <div className="space-y-3">
          {canCancel && (
            <button
              onClick={() => handleAction('cancel')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Cancel Tournament
            </button>
          )}
          
          {canStart && (
            <button
              onClick={() => handleAction('start')}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Starting...' : 'Start Tournament'}
            </button>
          )}
          
          {canFinalize && (
            <button
              onClick={() => handleAction('finalize')}
              disabled={isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Finalizing...' : 'Finalize Tournament'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neutral-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-4" />
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                      Confirm Action
                    </Dialog.Title>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-400">
                      {getActionConfig(actionType).description}
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={confirmAction}
                    >
                      {isProcessing ? 'Processing...' : getActionConfig(actionType).buttonText}
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